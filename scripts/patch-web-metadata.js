const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const indexPath = path.join(distDir, 'index.html');

const siteUrl = 'https://maru-maru-calc.github.io/maru-maru-calc/';
const title = 'まるまる電卓 | すうじをさわる計算あそび';
const description = 'まるをさわって、動かして。足し算から割り算まで、数を見た目で感じる子ども向け計算あそび。';
const keywords = 'まるまる電卓,算数,計算,知育アプリ,子ども向け,足し算,引き算,掛け算,割り算';
const assetBaseUrl = 'https://maru-maru-calc.github.io/maru-maru-calc';
const ogpImageUrl = `${assetBaseUrl}/ogp.png`;

for (const fileName of ['favicon.png', 'apple-touch-icon.png', 'ogp.png']) {
  const source = path.join(publicDir, fileName);
  const destination = path.join(distDir, fileName);

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destination);
  }
}

let html = fs.readFileSync(indexPath, 'utf8');

const metadata = `    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <meta name="robots" content="index,follow" />
    <meta name="theme-color" content="#C6E8F4" />
    <meta name="apple-mobile-web-app-title" content="まるまる電卓" />
    <link rel="canonical" href="${siteUrl}" />
    <link rel="icon" type="image/png" href="/maru-maru-calc/favicon.png" />
    <link rel="apple-touch-icon" href="/maru-maru-calc/apple-touch-icon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ja_JP" />
    <meta property="og:site_name" content="まるまる電卓" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${siteUrl}" />
    <meta property="og:image" content="${ogpImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="まるまる電卓の水色の画面と、まるで数を感じる計算あそび" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogpImageUrl}" />`;

html = html
  .replace(/<html lang="[^"]*">/, '<html lang="ja">')
  .replace(/    <title>[\s\S]*?<\/title>/, metadata)
  .replace(/\n\s*<link rel="icon" href="\/maru-maru-calc\/favicon\.ico" \/><\/head>/, '\n  </head>');

fs.writeFileSync(indexPath, html);
