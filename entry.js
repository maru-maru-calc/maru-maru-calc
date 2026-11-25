// Two apps are built from this project: the web app with its pages, and the puzzle game alone for
// YouTube (`npm run export:youtube`). metro.config.js points the name below at the one a build is
// for, so each bundle holds only its own app.
require('marumaru-app-entry');
