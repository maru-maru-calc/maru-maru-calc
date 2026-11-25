// Turns `expo export` of the YouTube entry (dist-youtube-raw) into the folder that is uploaded to
// YouTube's game platform (dist-youtube), and checks it against the platform's rules for a bundle:
//
//   - YouTube's SDK is loaded before any of the game's code;
//   - every path in the page and the code is relative (the game is served from an address the
//     game does not know);
//   - file names use only letters, digits, "_", "-" and ".";
//   - the bundle is under 30 MiB and no file is over 30 MiB (15 MiB and 512 KiB are recommended);
//   - the page's visibility is not watched (pausing is YouTube's to announce, through its SDK).
//
// It stops with an error when a rule is broken. Things a person should look at (a browser feature
// the platform forbids appearing in the code, say) are listed without stopping.
//
// Run by `npm run export:youtube`.
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const rawDir = path.join(projectRoot, 'dist-youtube-raw');
const outDir = path.join(projectRoot, 'dist-youtube');
const basePath = require(path.join(projectRoot, 'app.json')).expo.experiments.baseUrl;

const SDK_URL = 'https://www.youtube.com/game_api/v1';
const MIB = 1024 * 1024;
const MAX_BUNDLE_BYTES = 30 * MIB;
const MAX_FILE_BYTES = 30 * MIB;
const RECOMMENDED_BUNDLE_BYTES = 15 * MIB;
const RECOMMENDED_FILE_BYTES = 512 * 1024;
const PAGE_TITLE = 'Maru Maru Puzzle';
// Stops taps and CSS animations while YouTube has the game on hold (src/youtube/entry.tsx sets the class).
const PAUSE_STYLE = 'html.is-paused,html.is-paused *{pointer-events:none!important;animation-play-state:paused!important}';
// Web features the platform forbids or that would save outside its SDK. Their names turning up in
// the code is not proof of use (a library can carry code that never runs), so they are only listed.
// react-native-web watches the page's visibility to restore keyboard-focus rings when a tab comes
// back. YouTube forbids watching it at all, so that listener is given an event name nothing ever
// sends. Each occurrence is counted, to notice if a library update adds another use.
const VISIBILITY_EVENT = /(["'])visibilitychange\1/g;
const UNUSED_EVENT = 'marumaru-unused-event';
const FEATURES_TO_REVIEW = ['visibilitychange', 'visibilityState', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'serviceWorker', 'navigator.share', 'window.open'];

function listFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(path.join(dir, entry.name), relative) : [relative];
  });
}

function fail(message) {
  console.error(`build-youtube: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(rawDir, 'index.html'))) {
  fail(`${path.relative(projectRoot, rawDir)}/index.html is missing. Run "npm run export:youtube".`);
}
if (typeof basePath !== 'string' || !basePath.startsWith('/')) {
  fail('app.json has no experiments.baseUrl to take out of the bundle.');
}

// The exported page and code address everything from the web app's base path. Here the same
// files sit next to the page, so that path becomes "here".
const escapedBase = basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const makeRelative = (text) => text.replace(new RegExp(`(["'\`(=])${escapedBase}(?=[/"'\`])`, 'g'), '$1.');

fs.rmSync(outDir, { recursive: true, force: true });
const copied = [];
let visibilityListenersTakenOut = 0;
for (const file of listFiles(rawDir)) {
  const isCode = file.startsWith('_expo/') && file.endsWith('.js');
  const isAsset = file.startsWith('assets/');
  if (!isCode && !isAsset) {
    // The web app's icons, manifest and the like have no place inside YouTube.
    continue;
  }
  const target = path.join(outDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (isCode) {
    const code = makeRelative(fs.readFileSync(path.join(rawDir, file), 'utf8'));
    visibilityListenersTakenOut += (code.match(VISIBILITY_EVENT) ?? []).length;
    fs.writeFileSync(target, code.replace(VISIBILITY_EVENT, `$1${UNUSED_EVENT}$1`));
  } else {
    fs.copyFileSync(path.join(rawDir, file), target);
  }
  copied.push(file);
}

// The page: the exported one, with YouTube's SDK put before everything else and the web app's
// own links (icon, manifest) taken out.
let page = makeRelative(fs.readFileSync(path.join(rawDir, 'index.html'), 'utf8'));
page = page
  // The game shows no words, not even to a browser without JavaScript (which could not run it anyway).
  .replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<link\b[^>]*\brel="(?:icon|shortcut icon|apple-touch-icon|manifest)"[^>]*>/g, '')
  .replace(/<title>[^<]*<\/title>/, `<title>${PAGE_TITLE}</title>`);
if (!/<head[^>]*>/.test(page)) {
  fail('the exported page has no <head>.');
}
page = page.replace(/<head([^>]*)>/, `<head$1><script src="${SDK_URL}"></script><style>${PAUSE_STYLE}</style>`);
fs.writeFileSync(path.join(outDir, 'index.html'), page);

// ---- the checks
const problems = [];
const toReview = [];
const files = listFiles(outDir);
const sizes = new Map(files.map((file) => [file, fs.statSync(path.join(outDir, file)).size]));
const totalBytes = [...sizes.values()].reduce((sum, size) => sum + size, 0);

for (const file of files) {
  if (!/^[A-Za-z0-9_.\-/]+$/.test(file)) {
    problems.push(`file name with a character YouTube does not allow: ${file}`);
  }
  if (sizes.get(file) > MAX_FILE_BYTES) {
    problems.push(`file over 30 MiB: ${file}`);
  } else if (sizes.get(file) > RECOMMENDED_FILE_BYTES) {
    toReview.push(`over the recommended 512 KiB: ${file} (${(sizes.get(file) / 1024).toFixed(0)} KiB)`);
  }
}
if (totalBytes > MAX_BUNDLE_BYTES) {
  problems.push(`bundle over 30 MiB: ${(totalBytes / MIB).toFixed(1)} MiB`);
} else if (totalBytes > RECOMMENDED_BUNDLE_BYTES) {
  toReview.push(`bundle over the recommended 15 MiB: ${(totalBytes / MIB).toFixed(1)} MiB`);
}

const scripts = [...page.matchAll(/<script\b[^>]*>/g)].map((match) => match[0]);
if (scripts.length < 2 || !scripts[0].includes(`src="${SDK_URL}"`)) {
  problems.push('the first script of the page is not YouTube\'s SDK.');
}
for (const reference of page.matchAll(/\b(?:src|href)="([^"]*)"/g)) {
  const address = reference[1];
  if (address === SDK_URL) {
    continue;
  }
  if (/^(?:[a-z]+:)?\/\//i.test(address) || address.startsWith('/')) {
    problems.push(`the page points outside the bundle or at an absolute path: ${address}`);
  } else if (!fs.existsSync(path.join(outDir, address))) {
    problems.push(`the page points at a file that is not in the bundle: ${address}`);
  }
}

for (const file of files.filter((name) => name.endsWith('.js'))) {
  const code = fs.readFileSync(path.join(outDir, file), 'utf8');
  if (code.includes(basePath)) {
    problems.push(`${file} still mentions the web app's path ${basePath}.`);
  }
  // Every asset the code names must be in the bundle under that very name.
  for (const location of new Set([...code.matchAll(/httpServerLocation:"([^"]+)"/g)].map((match) => match[1]))) {
    if (!files.some((name) => `/${name}`.startsWith(`${location}/`))) {
      problems.push(`${file} names assets in ${location}, which is not in the bundle.`);
    }
  }
  for (const feature of FEATURES_TO_REVIEW) {
    const count = code.split(feature).length - 1;
    if (count > 0) {
      toReview.push(`"${feature}" appears ${count} time(s) in ${file}`);
    }
  }
  const hosts = new Set([...code.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)].map((match) => match[1].toLowerCase()));
  if (hosts.size > 0) {
    toReview.push(`web addresses in ${file} (the game must not call any of them): ${[...hosts].sort().join(', ')}`);
  }
}

console.log(`build-youtube: wrote ${path.relative(projectRoot, outDir)} (${files.length} files, ${(totalBytes / MIB).toFixed(2)} MiB)`);
console.log(`build-youtube: took out ${visibilityListenersTakenOut} listener(s) for the page's visibility`);
for (const [file, size] of [...sizes.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5)) {
  console.log(`  ${(size / 1024).toFixed(0).padStart(6)} KiB  ${file}`);
}
if (toReview.length > 0) {
  console.log('To look at (not errors):');
  toReview.forEach((line) => console.log(`  - ${line}`));
}
if (problems.length > 0) {
  console.error('Against YouTube\'s rules:');
  problems.forEach((line) => console.error(`  - ${line}`));
  process.exit(1);
}
console.log('build-youtube: the bundle passes the checks.');
