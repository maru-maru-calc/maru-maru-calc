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

// The pages that get posted on other sites. Those sites read the tags of the page as it is
// served, without running it, and show a card made from them. A plain copy would show the
// learning app's card, so these pages get tags of their own.
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const siteUrl = /<meta property="og:url" content="([^"]+)"/.exec(indexHtml)?.[1];
if (!siteUrl) {
  console.error('add-route-pages: the page has no og:url to build the pages\' addresses from.');
  process.exit(1);
}

/** Writes dist/<file>: the app's page with the card of `page` (the page's place on the site, its picture and its lines). */
function writePageWithCard(file, { page, title, description, image, imageAlt }) {
  const tags = {
    'property="og:title"': title,
    'property="og:description"': description,
    'property="og:url"': `${siteUrl}${page}`,
    'property="og:image"': `${siteUrl}${image}`,
    'property="og:image:alt"': imageAlt,
    'name="twitter:title"': title,
    'name="twitter:description"': description,
    'name="twitter:image"': `${siteUrl}${image}`,
    'name="description"': description,
  };
  let html = indexHtml;
  for (const [tag, content] of Object.entries(tags)) {
    const pattern = new RegExp(`(<meta ${tag.replace(/[:"=]/g, (c) => `\\${c}`)} content=")[^"]*(")`);
    if (!pattern.test(html)) {
      // Twitter's own tags are optional (it falls back to the og: ones); the rest must be there.
      if (tag.includes('twitter:')) {
        continue;
      }
      console.error(`add-route-pages: the page has no <meta ${tag}> to rewrite for ${file}.`);
      process.exit(1);
    }
    html = html.replace(pattern, (_all, before, after) => `${before}${content}${after}`);
  }
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (_all, before, after) => `${before}${siteUrl}${page}${after}`);
  if (!fs.existsSync(path.join(distDir, image))) {
    console.error(`add-route-pages: ${image} is not in the export; the card of ${file} would have no picture.`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(path.join(distDir, file)), { recursive: true });
  fs.writeFileSync(path.join(distDir, file), html);
}

const puzzleDescription = '泡をぜんぶ使って、ゴールの数を作ろう。 Use every bubble to reach the goal.';

// The puzzle game's own page, which is also where the address of a puzzle a player made leads
// ("/puzzle?m=..."): one fixed picture and line, saying that somebody made a puzzle to be solved.
// (A picture of the made puzzle itself is not possible: that would take a server that answers
// each address differently, and this site is served as files.)
writePageWithCard('puzzle.html', {
  page: 'puzzle',
  title: 'パズルができたよ。とける？ | Can you solve this puzzle?',
  description: puzzleDescription,
  image: 'ogp-puzzle.png',
  imageAlt: 'えんぴつのしるしと「= ?」、4 つの演算、3 つの泡。だれかが作ったパズル',
});

// Every numbered puzzle has a page of its own ("/p/46"), so that a link to it shows that puzzle.
// The pictures are made beforehand and kept with the project (`npm run make:puzzle-cards`);
// cards.json lists the puzzles they were made for.
const { puzzles } = JSON.parse(fs.readFileSync(path.join(__dirname, 'puzzle-link-cards', 'cards.json'), 'utf8'));
for (const puzzle of puzzles) {
  writePageWithCard(`p/${puzzle.number}.html`, {
    page: `p/${puzzle.number}`,
    title: `パズル #${puzzle.number}、とける？ | Can you solve puzzle #${puzzle.number}?`,
    description: puzzleDescription,
    image: `ogp/puzzle-${puzzle.number}.jpg`,
    imageAlt: `パズル #${puzzle.number}：${puzzle.bubbles.join('・')} の泡で ${puzzle.goal} を作る`,
  });
}

// Unknown paths still fall back to the app, which shows its own "not found" screen.
fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

console.log(`add-route-pages: wrote ${[...routePages.map((route) => `${route}.html`), '404.html'].join(', ')}, and p/1.html to p/${puzzles.length}.html`);
