const fs = require('fs');
const path = require('path');

// The web app is exported as a single page, so only index.html exists. GitHub Pages answers any
// other path with 404.html, and the app still loads, but the response itself says "404 Not Found".
// Search engines and link previews treat that as a missing page. Giving each route its own copy of
// the page makes GitHub Pages answer /game and /play with a normal 200.
const distDir = path.join(__dirname, '..', 'dist');
const routePages = ['game', 'play'];

const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error(`add-route-pages: ${indexPath} was not found. Run the web export first.`);
  process.exit(1);
}

for (const route of routePages) {
  fs.copyFileSync(indexPath, path.join(distDir, `${route}.html`));
}
// Unknown paths still fall back to the app, which shows its own "not found" screen.
fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

console.log(`add-route-pages: wrote ${[...routePages.map((route) => `${route}.html`), '404.html'].join(', ')}`);
