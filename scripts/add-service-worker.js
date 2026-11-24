const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Writes dist/sw.js from scripts/service-worker.js, with the list of files the app needs offline.
// Run it last: the list is read from what is in dist at that moment.
const distDir = path.join(__dirname, '..', 'dist');
const templatePath = path.join(__dirname, 'service-worker.js');

// Left out of the offline copy:
// - BGM (about 9 MB) and the landing page's videos and posters: too large, and not needed to play
// - images bundled by libraries for screens this app never shows
const EXCLUDED_ASSETS = [/\/audio\/bgm/, /\/landing\//, /\/node_modules\//];

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('add-service-worker: dist/index.html was not found. Run the web export first.');
  process.exit(1);
}

const precachePaths = [
  'index.html',
  ...listFiles('_expo'),
  ...listFiles('assets').filter((file) => !EXCLUDED_ASSETS.some((pattern) => pattern.test(file))),
  ...listFiles('icons'),
  ...['manifest.webmanifest', 'favicon.png', 'apple-touch-icon.png'].filter((file) => fs.existsSync(path.join(distDir, file))),
].sort();

// The version changes whenever a stored file changes, which is what makes browsers pick up a release.
const hash = crypto.createHash('sha256');
for (const file of precachePaths) {
  hash.update(file);
  hash.update(fs.readFileSync(path.join(distDir, file)));
}
const cacheVersion = hash.digest('hex').slice(0, 12);

const template = fs.readFileSync(templatePath, 'utf8');
for (const placeholder of ["'__CACHE_VERSION__'", '__PRECACHE_PATHS__']) {
  if (!template.includes(placeholder)) {
    console.error(`add-service-worker: placeholder ${placeholder} is missing from scripts/service-worker.js`);
    process.exit(1);
  }
}

const serviceWorker = template
  .replace("'__CACHE_VERSION__'", JSON.stringify(cacheVersion))
  .replace('__PRECACHE_PATHS__', JSON.stringify(precachePaths, null, 2));
fs.writeFileSync(path.join(distDir, 'sw.js'), serviceWorker);

const totalBytes = precachePaths.reduce((sum, file) => sum + fs.statSync(path.join(distDir, file)).size, 0);
console.log(`add-service-worker: wrote sw.js (version ${cacheVersion}, ${precachePaths.length} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB stored for offline use)`);

function listFiles(relativeDirectory) {
  const directory = path.join(distDir, relativeDirectory);
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) {
      return listFiles(relativePath);
    }
    return entry.isFile() ? [relativePath] : [];
  });
}
