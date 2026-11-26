const fs = require('fs');
const path = require('path');

// The web app is exported as a single page, so only index.html exists. GitHub Pages answers any
// other path with 404.html, and the app still loads, but the response itself says "404 Not Found".
// Search engines and link previews treat that as a missing page. Giving each route its own copy of
// the page makes GitHub Pages answer /game and /play with a normal 200.
const distDir = path.join(__dirname, '..', 'dist');
const routePages = ['game', 'play', 'puzzle'];

const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error(`add-route-pages: ${indexPath} was not found. Run the web export first.`);
  process.exit(1);
}

for (const route of routePages) {
  fs.copyFileSync(indexPath, path.join(distDir, `${route}.html`));
}

// The puzzle page is what the addresses of shared puzzles lead to ("/puzzle?p=46", "/puzzle?m=..."),
// so it is the page that gets posted on other sites. Those sites read the tags of the page as it is
// served, without running it, and show a card made from them. The copy would show the learning
// app's card; the puzzle page gets its own: one fixed picture and line for every puzzle, saying
// that somebody made a puzzle to be solved. (A picture of the puzzle itself is not possible here:
// that would take a server that answers each address differently.)
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const siteUrl = /<meta property="og:url" content="([^"]+)"/.exec(indexHtml)?.[1];
if (!siteUrl) {
  console.error('add-route-pages: the page has no og:url to build the puzzle page\'s address from.');
  process.exit(1);
}
const puzzleTitle = 'パズルができたよ。とける？ | Can you solve this puzzle?';
const puzzleDescription = '泡をぜんぶ使って、ゴールの数を作ろう。 Use every bubble to reach the goal.';
const puzzlePreview = {
  'property="og:title"': puzzleTitle,
  'property="og:description"': puzzleDescription,
  'property="og:url"': `${siteUrl}puzzle`,
  'property="og:image"': `${siteUrl}ogp-puzzle.png`,
  'property="og:image:alt"': 'えんぴつのしるしと「= ?」、4 つの演算、3 つの泡。だれかが作ったパズル',
  'name="twitter:title"': puzzleTitle,
  'name="twitter:description"': puzzleDescription,
  'name="twitter:image"': `${siteUrl}ogp-puzzle.png`,
  'name="description"': puzzleDescription,
};
let puzzleHtml = indexHtml;
for (const [tag, content] of Object.entries(puzzlePreview)) {
  const pattern = new RegExp(`(<meta ${tag.replace(/[:"=]/g, (c) => `\\${c}`)} content=")[^"]*(")`);
  if (!pattern.test(puzzleHtml)) {
    // Twitter's own tags are optional (it falls back to the og: ones); the rest must be there.
    if (tag.includes('twitter:')) {
      continue;
    }
    console.error(`add-route-pages: the page has no <meta ${tag}> to rewrite for the puzzle page.`);
    process.exit(1);
  }
  puzzleHtml = puzzleHtml.replace(pattern, (_all, before, after) => `${before}${content}${after}`);
}
puzzleHtml = puzzleHtml.replace(/<title>[^<]*<\/title>/, `<title>${puzzleTitle}</title>`);
puzzleHtml = puzzleHtml.replace(/(<link rel="canonical" href=")[^"]*(")/, (_all, before, after) => `${before}${siteUrl}puzzle${after}`);
if (!fs.existsSync(path.join(distDir, 'ogp-puzzle.png'))) {
  console.error('add-route-pages: ogp-puzzle.png is not in the export; the puzzle page\'s card would have no picture.');
  process.exit(1);
}
fs.writeFileSync(path.join(distDir, 'puzzle.html'), puzzleHtml);
// Unknown paths still fall back to the app, which shows its own "not found" screen.
fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

console.log(`add-route-pages: wrote ${[...routePages.map((route) => `${route}.html`), '404.html'].join(', ')}`);
