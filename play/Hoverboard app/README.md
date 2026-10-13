# Calm Hoverboard

A WebGL tile board that works as an installable app on phone, tablet and laptop.

## Files

- `index.html`: the app
- `manifest.json`: app name, colours, icons
- `sw.js`: lets the app work offline
- `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`: icons

Keep all files together in one folder.

## Deploy (Netlify)

1. Go to app.netlify.com and open Add new site, then Deploy manually.
2. Drag the whole folder in.
3. Open the site link Netlify gives you. It uses HTTPS automatically, which installing requires.

## Install on your device

- **iPhone / iPad:** open the link in Safari, tap Share, then Add to Home Screen.
- **Android:** open the link in Chrome, tap the menu, then Install app.
- **Laptop (Chrome or Edge):** open the link and click the install icon in the address bar.

The app then opens in its own window and works offline after the first load.

## Update the app

1. Edit `index.html` (or any other file).
2. In `sw.js`, change the version on this line:
   `var CACHE = 'calm-hoverboard-v1';`
   to `v2`, then `v3` next time, and so on.
3. Redeploy: in Netlify, open Deploys and drag the folder in again.
4. Open the app twice. The first open loads the update in the background, the second shows it.

Skipping step 2 can leave installed copies showing the old version.

## Change the look

- **Colours:** edit the `PALETTES` list near the top of the script in `index.html`.
- **Fade speed:** change `Math.exp(-dt / 1.0)`. A bigger number fades slower.
- **Tile size:** change `pitch` and `size` in the `resize` function.
- **Sound:** each column is a note, low on the left and high on the right. There are three styles: Bollywood (fingerpicked guitar, piano, violin and soft strings in A minor), Arabian Beat (a 140 BPM phonk beat with 808 slides, darbuka and an oud lead on the Hijaz scale) and Chimes. Edit `PROG`, `BAR_SETS`, `HIJAZ` and `SCALES` in the script to change the notes, and the `140` in `startMusic` to change the beat speed. Browsers only allow sound after a click or tap, so tap once after opening. On iPhone, turn off the silent switch.
- **Icon:** replace the PNG files with your own, keeping the same names and sizes.

## Troubleshooting

- **No install option:** make sure the link starts with `https://` and all files uploaded.
- **Old version showing:** bump the version in `sw.js`, redeploy, then close and reopen the app.
- **Blank board:** your browser may not support WebGL. Try Chrome or Safari.
- **Remove the app:** press and hold the icon and delete it, like any app.
