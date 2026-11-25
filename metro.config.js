// Metro's settings are Expo's own, plus one thing: which app `entry.js` starts.
//
// The choice is made here, where modules are looked up, and not by an environment variable inside
// the code. Metro keeps transformed files between builds, and a value built into a file would
// stay there: after one build for YouTube, the next build of the web app (and `expo start`) would
// silently get the YouTube app.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const APP_ENTRY = 'marumaru-app-entry';
const appEntry = process.env.MARUMARU_TARGET === 'youtube' ? './src/youtube/entry' : 'expo-router/entry';
const resolveAsBefore = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const name = moduleName === APP_ENTRY ? appEntry : moduleName;
  return resolveAsBefore ? resolveAsBefore(context, name, platform) : context.resolveRequest(context, name, platform);
};

module.exports = config;
