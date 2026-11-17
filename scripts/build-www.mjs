/* Copies the web app (public/) into www/, the folder Capacitor packs into the Android app.
   Left out: files that only the website needs or that may not ship in a store app. */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const src = join(root, 'public');
const out = join(root, 'www');

const EXCLUDE = new Set([
  'sw.js',                 // the app has its files on the phone, no service worker needed
  'audio/sfx/clutch.mp3'   // VALORANT sound (Riot Games): fine for the free website, not for a store app
]);

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
cpSync(src, out, {
  recursive: true,
  filter: (p) => !EXCLUDE.has(relative(src, p).split(sep).join('/'))
});
console.log('www/ ready (' + EXCLUDE.size + ' web-only files left out)');
