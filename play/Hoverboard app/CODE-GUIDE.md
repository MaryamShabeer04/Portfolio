# Calm Hoverboard: code guide

How to use this guide: open `index.html` from the app folder next to this file. Line numbers refer to that file as of version v6. If you edit the file, numbers will shift, so also use the section names.

Repeated patterns (like the many instruments) are explained once in detail, then only the differences are listed.

---

## 0. The big picture

The app does four jobs, over and over, about 60 times a second:

1. **Listen** for your finger or mouse.
2. **Remember** which tiles are lit, in a list of numbers called `energy` (1 = just lit, 0 = off). Every frame the numbers shrink a little, which makes the slow fade.
3. **Draw** the board. The list is sent to the graphics card (GPU), and a small program called a **shader** paints every pixel.
4. **Play sound.** A music loop plays in the background, and notes play when you touch tiles.

```
finger/mouse -> energy list -> GPU texture -> shader draws squares + glow
      |
      +-> note picked by column -> Web Audio makes the sound
```

---

## 1. The extra app files

### manifest.json (the app's ID card)

| Line | Meaning |
|---|---|
| `name`, `short_name` | Full name, and the short name shown under the icon. |
| `description` | One-line summary. |
| `start_url` | The page that opens when you launch the installed app. |
| `scope` | Which pages belong to the app. `./` means the whole folder. |
| `display: standalone` | Opens like a real app, with no browser address bar. |
| `orientation: any` | Works in portrait and landscape. |
| `background_color` | Colour of the splash screen while the app loads. |
| `theme_color` | Colour of the phone's status bar. |
| `icons` | Pictures for the home screen. `purpose: any` is the normal icon. `maskable` is a version with extra padding so Android can crop it into a circle or rounded shape without cutting the squares. |

### sw.js (the service worker: makes the app work offline)

A service worker is a small script the browser runs in the background, separate from the page. It sits between the app and the internet.

- `var CACHE = 'calm-hoverboard-v6'`: the name of the saved copy. **Changing this name is how you tell phones that files changed.**
- `var FILES = [...]`: the list of files to save for offline use.
- `install` event: runs once when the worker is new. It opens the cache and saves every file in `FILES` (`addAll`). `skipWaiting()` makes the new worker take over straight away instead of waiting.
- `activate` event: runs after install. It deletes any old caches whose name is not the current one, so old versions don't pile up. `clients.claim()` lets the worker control already-open pages.
- `fetch` event: runs every time the page asks for a file. It only handles `GET` requests. The plan is **network first**: try the internet, and if that works, save a copy (`res.clone()`; a response can only be read once, so you copy it) and return it. If the internet fails (`catch`), return the saved copy, or `index.html` as a last resort.

---

## 2. index.html: the head (lines 1-14)

| Line | Meaning |
|---|---|
| 1 | `<!DOCTYPE html>` tells the browser this is modern HTML. Without it, browsers use old "quirks mode". |
| 2 | `lang="en"` sets the page language for screen readers and translation. |
| 4 | `charset="utf-8"` allows all characters. |
| 5 | The `viewport` tag makes the page fit phone screens. `viewport-fit=cover` lets the page extend under notches and rounded corners (the CSS keeps content out of the way later). |
| 6 | Links the manifest file. |
| 7-8 | Icons for the browser tab and for iPhone/iPad home screens. |
| 9-10 | Tell iOS and Android the page can run as a full-screen app. |
| 11 | The name shown under the icon on iPhone. |
| 12 | Makes the iPhone status bar transparent. |
| 13 | The page title. |
| 14 | `theme-color` colours the browser's top bar. |

---

## 3. The CSS (lines 15-83)

**Variables (17-26).** `:root { --bg: ... }` creates custom properties you reuse with `var(--bg)`. Change a colour once, and it changes everywhere. `color-scheme: dark` makes browser-drawn parts (like scrollbars) dark. `font-family` lists fonts in order; the first one the device has is used (`Nunito` isn't loaded, so it falls back to the system font).

**Page layout (27-36).**
- `html, body { height: 100% }` makes the page as tall as the screen.
- `body` is a `flex` container with `flex-direction: column`, so the header sits on top and the board fills the rest.
- `margin: 0` removes the default gap, and `overflow: hidden` stops the page scrolling.

**Header (37-48).**
- `flex-wrap: wrap` lets controls drop onto a second row on small screens.
- `justify-content: space-between` pushes the title left and the controls right.
- `gap: 12px 20px` is row gap and column gap.
- `.controls` repeats the same flex idea for the buttons.

**Pill buttons (49-59).**
- `border-radius: 999px` makes a pill shape. `font: inherit` stops buttons using their own tiny default font.
- `transition` animates colour changes over 0.3s.
- `button[aria-pressed="true"]` styles the selected button. It styles from an HTML attribute that the JavaScript changes, which also tells screen readers which button is on.
- `:focus-visible` draws an outline only when someone navigates with a keyboard.

**Colour dots (60-62).** Small circles overlapped with `margin-left: -3px`. The border is the bar colour, so each dot looks cut out of the next.

**Switch (63-71).** The sliding toggle is built from a `.track` (the pill) and a `::after` pseudo-element (the round thumb). When `aria-checked="true"`, the track takes the accent colour and the thumb moves right with `translateX(14px)`.

**Board area (72-73).**
- `main` is `position: relative; flex: 1; min-height: 0`. It takes all the remaining height. `min-height: 0` is needed so a flex child can shrink properly.
- `#gl` (the canvas) is `position: absolute; inset: 0`, which stretches it over all of `main`.
- `touch-action: none` stops the browser from scrolling or zooming when you drag on the canvas. Without it, touch dragging would not give a steady stream of pointer events.

**Hint text (74-79).** Sits at the bottom. `pointer-events: none` lets your clicks pass through it. Adding the class `gone` fades it out over 1.5s.

**Fallback message (80).** Used only if WebGL is missing.

**Phone safe areas (81).** `env(safe-area-inset-*)` are values supplied by the phone for notches and the home bar. Padding by them keeps content clear. `overscroll-behavior: none` stops the bounce effect.

**No text selection (82).** Stops long-presses from selecting text and removes the grey tap flash.

---

## 4. The HTML body (lines 86-103)

- `<header>` with an `<h1>` title and a `controls` area.
- `<div class="palettes" id="palettes" role="group" aria-label="Palette">` is empty on purpose. JavaScript fills it with the palette buttons.
- The **Drift** and **Sound** buttons use `role="switch"` and `aria-checked`, which tells assistive tech they are on/off switches.
- The three sound style buttons carry `data-style="..."`. JavaScript reads that with `button.dataset.style`.
- `<canvas id="gl">` is the drawing surface for WebGL. Its `aria-label` describes it for screen readers.
- The hint `<div>` is the instruction text.

---

## 5. The JavaScript (lines 105-804)

### 5.1 Setup (lines 106-134)

- Line 106 `(function () { ... })();` wraps everything in a function that runs immediately. Its variables stay private and don't clash with anything else.
- 107-111: `PALETTES` is an object: for each key, a display name and a list of colours.
- 113-119: grab the HTML elements by `id` so the code can use them. `root` is the `<html>` element (used to change a CSS variable).
- 120: checks if the user's device asks for less motion. If so, Drift starts off.
- 122-123: `store` and `load` save and read small values in `localStorage` (this is how the app remembers your palette and sound style). They are wrapped in `try/catch` because some browsers block storage.
- 125: asks the canvas for a WebGL drawing context. `antialias: false` (the shader smooths its own edges) and `alpha: false` (the canvas is fully opaque, which is faster).
- 126-134: if WebGL isn't available, show a message and stop (`return`).

### 5.2 What is WebGL? (read this before the shader)

Normally the page is drawn by the browser from HTML and CSS. WebGL lets you talk straight to the graphics card. The GPU is very good at doing the same small calculation for millions of pixels at once. You supply two programs, written in a language called **GLSL**:

- **Vertex shader**: decides where shapes go on screen. Here it just places one big triangle that covers the screen.
- **Fragment shader**: runs once for **every pixel** and decides its colour. This is where the board is drawn.

Data goes to the shader as:
- **Uniforms**: values that are the same for every pixel in a frame (time, colours, sizes).
- **Texture**: a grid of numbers or pixels the shader can look up. We use it to hand over the `energy` list.

### 5.3 The shader code (lines 136-206)

**Vertex shader (136).** `attribute vec2 a` is an input (a 2D point). `gl_Position = vec4(a, 0.0, 1.0)` places it. We draw one oversized triangle with corners (-1,-1), (3,-1), (-1,3), which covers the whole screen. That is simpler than two triangles.

**Fragment shader header (138-149).**
- 138-142: sets how precise decimals are (`highp` where the device supports it).
- 143-149: declares the uniforms. `uRes` = canvas size in pixels. `uGrid` = columns and rows. `uOrigin` = where the grid starts. `uPitch` = spacing between tile centres. `uHalf` = half a tile's width. `uRadius` = corner rounding. `uTime` = seconds. `uState` = the texture with tile data. `uPal[5]` = up to five colours. `uTile` and `uBg` = idle tile and background colours. `uRip[4]` = four ripples (x, y, age, active). `uMouse` = pointer position and strength.

**Helper functions (150-156).**
- `hash` (150): turns a position into a pseudo-random number. It gives each tile its own shimmer timing.
- `box` (151): the distance from a point to the edge of a rounded square. Negative = inside, positive = outside. Shape drawing with distance is smooth at any size.
- `palColor` (152): returns palette colour number `i`. GLSL here can't pick an array item with a changing index, so it loops and keeps the latest colour whose number is not above `i`.
- `cellData` (153-156): reads one tile's data from the texture. Outside the grid it returns zeros. The `(c + 0.5) / uGrid` converts a tile number into the 0-1 texture coordinate for the centre of that tile.

**main (157-205): runs for each pixel.**
- 158: `p` = this pixel's position. `uRes.y - gl_FragCoord.y` flips the Y axis, because WebGL counts from the bottom and we count from the top.
- 159: `g` = the position in **tile units** (pixels divided by the spacing).
- 160: `c = floor(g)` = which tile this pixel is inside.
- 161-174 (**glow**): looks at the 5x5 tiles around this pixel. For each lit tile (`e > 0.004`), it works out the distance to that tile's centre and adds its colour, weighted by `e * e * exp(-dist * dist * 1.5)`. That formula makes light fall off smoothly with distance, and brighter tiles glow more. This light spills into the gaps and over neighbours.
  - `d.r` is the energy. `d.g` holds the colour number multiplied by 40 (so it fits in a byte); `floor(d.g * 255.0 / 40.0 + 0.5)` undoes that.
- 175-182 (**ripples**): for each active ripple, the ring radius grows with its age (`age * pitch * 11` = about 11 tiles per second). `abs(length(p - centre) - r)` is the distance from the ring line; `exp(-dd*dd*0.9)` makes it a soft band; `max(0, 1 - age/2.4)` fades it over 2.4 seconds.
- 183: the ripple colour slowly shifts between two palette colours as time passes.
- 184: starting colour = background + glow + a hint of ripple.
- 185-201 (**the square itself**), only if this pixel is inside the grid:
  - 187-188: read this tile's data and colour number.
  - 189-191: `local` = pixel position relative to the tile centre; `sd` = distance to the square's edge; `mask` = 1 inside the square and 0 outside, with a soft 1-pixel edge (`smoothstep`), which anti-aliases the edge.
  - 192: `shimmer` = a gentle 10% brightness pulse, offset per tile by `hash`.
  - 193-194: `ml` = a soft spotlight around the pointer, which slightly brightens idle tiles.
  - 195-197: `e` = this tile's energy plus ripple; `lit` = its palette colour scaled by energy; `sq` blends from the idle colour to the lit colour as energy rises.
  - 198-199: add ripple tint and some glow onto the square.
  - 200: `mix(col, sq, mask)` puts the square over the background.
- 202-203: **vignette**: darkens the corners a little.
- 204: output the final colour. The last `1.0` is full opacity.

### 5.4 Compiling and connecting the shader (lines 208-241)

- 208-214 `compile`: creates a shader, gives it the source text, compiles it, and logs any error to the console if it fails.
- 215-221: creates a **program** (a vertex + fragment pair), attaches both, links them, and activates the program. `bindAttribLocation` is done before linking so input `a` is slot 0.
- 223-227: creates a **buffer** holding the three triangle corners and tells WebGL how to read it (2 numbers per point).
- 229-231: looks up the address of every uniform by name so JavaScript can set them later.
- 233-239: creates the **texture** for tile data. `NEAREST` means "don't blur between tiles". `CLAMP_TO_EDGE` stops edge wrapping. `uniform1i(U.uState, 0)` says the sampler reads texture slot 0.
- 240-241: sets the idle tile and background colours (red, green, blue between 0 and 1).

### 5.5 Board state and resizing (lines 243-275)

- 244: `dpr` = device pixel ratio (a phone screen may pack 2-3 real pixels into one CSS pixel). `W`/`H` = board size. `cols`/`rows` = tile counts. `pitch` = spacing; `size` = tile width.
- 246: three arrays: `energy` (one decimal per tile), `cidx` (colour number per tile), `data` (the bytes sent to the texture, 4 per tile).
- `resize()` (248-275):
  - 249-250: measure the board area.
  - 251: use at most 2x pixels, to save battery and keep speed.
  - 252-254: make the canvas the right number of real pixels, and tell WebGL to draw to all of it.
  - 255-258: smaller tiles on narrow screens (`<= 480px`). `gap` is the space between tiles.
  - 259-260: how many tiles fit, leaving a 16px margin on each side.
  - 261-263: total grid size and the offset that centres it.
  - 264-268: if the tile count changed, create fresh arrays.
  - 269-274: send the new sizes to the shader, converted to real pixels by multiplying by `dpr`.

### 5.6 Palettes (lines 277-310)

- 278: `current` = chosen palette, `palCount` = how many colours it has.
- 279-282 `hexToRgb`: turns `#e74c3c` into three numbers 0-1. `parseInt(..., 16)` reads hex; `>> 16 & 255` is bit-shifting to pick out the red, green and blue bytes.
- 283-296 `setPalette(key)`: remembers the choice, picks the chime scale (`SCALES[key]`), sends five colours to the shader (repeating the last colour if a palette has fewer than five), sets `--c1` (the UI accent colour) in CSS, marks the right button as pressed, and saves the choice.
- 297-310: builds one button per palette from the `PALETTES` object using `createElement`. Each shows three colour dots and the name, and calls `setPalette` on click.

### 5.7 Sound: how the engine works (lines 312-392)

**Web Audio** is the browser's built-in sound synthesiser. You build a chain of **nodes**:

`oscillator (a pitch)` -> `gain (volume envelope)` -> `filter (tone)` -> `panner (left/right)` -> `master volume` -> `compressor` -> `speakers`

An **envelope** is how loudness changes over time: fast attack, then fade. A **filter** removes high frequencies to make a sound warmer. A **detuned pair** of oscillators sounds richer than one.

Browsers only allow sound after a click or tap, which is why the first tap starts it.

**Music data (318-326).** Notes are stored as **semitones above the root note** (0 = root, 12 = one octave up).
- `SCALES`: a five-note scale for each palette (used by the Chimes style).
- `BAR_SETS`: four five-note sets for the Slow Dusk style, one per chord. This keeps what you play in tune with the backing.
- `HIJAZ`: a seven-note Arabic scale for Midnight Run.
- `PROG`: the four chords, as semitone offsets (A minor, G, F, E).
- `KICKS`, `COW`, `BASSOFF`: which steps of the 16-step bar the kick and cowbell hit, and the bass note per bar.
- 323-326: `mode` (which style), `scale` (current notes), `ac` (the audio engine), `master` (main volume), `soundOn`, `lastNote` (time of last note, used for throttling), `voices` (count of sounding notes), `noiseBuf` and `satCurve` (drum helpers), `beat` (the music loop).
- 327-331: `ballBar()` works out which of the four chords is playing now, and `scaleForMode()` returns the right note set.
- 333-338: the Sound switch flips `soundOn`. Turning it off stops the music.

**`ensureAudio` (340-374).** Creates the audio engine once:
- `AudioContext` (with a `webkit` fallback for older Safari).
- A **compressor** to stop loud moments distorting.
- `master` gain 0.6.
- **Reverb** (350-364): a `ConvolverNode` needs a short recording of a room. We make one from random noise that fades out over 2.4 seconds (`Math.pow(1 - i / len, 3)`). `wet` controls how much reverb is mixed in. Both the dry and reverb signals go to the compressor, then the speakers.
- `noiseBuf` (365-367): half a second of random noise, used for drums and breath-like sounds.
- `satCurve` (368-369): a curve using `Math.tanh` that squashes loud peaks. It gives the 808 bass its gritty harmonics so it's audible on small speakers.
- 371: if the browser has paused audio, `resume()` it. 372: start the music loop.

**Helpers (376-392).**
- `route` sends a node to the speakers through a stereo panner (left/right), if the browser supports it.
- `addVoice` counts a note as playing for a number of milliseconds, so the app can skip new notes when too many overlap.
- `rootFreq`: 220 Hz (the note A3), or 174.61 Hz (F3) for Chimes.
- `freqFor(n)`: converts a note number to a frequency. Notes repeat each octave. The formula is `root * 2^(semitones / 12)`, which is how equal-tempered tuning works.
- `noteFor(ci)`: turns a column into a note number 0-14, so the left edge is low and the right edge is high.
- `panFor(ci)`: turns a column into a left/right position (-0.8 to +0.8).

### 5.8 The instruments (lines 394-577)

Every instrument follows the same recipe: **make oscillators -> shape their volume with a gain envelope -> filter -> send to speakers -> start and stop at exact times.**

**`tone` (395-410), explained fully (the chimes bell).**
- 396: `t` = the start time. Audio has its own precise clock, `ac.currentTime`.
- 397-400: a gain node whose volume starts nearly silent (0.0001; exponential ramps can't start at 0), rises to the peak in 10ms, then fades out over `dur`.
- 401-404: two oscillators. One is a pure sine at the note; the other is a softer triangle wave just above double the pitch (2.005) for a bell-like shimmer.
- 405-406: connect them to the gain, then to the speakers.
- 407-408: start and stop (`stop` is slightly after the fade so there are no clicks).
- 409: count the voice.

**Other instruments: what differs.**
- **`piano`**: four sine/triangle oscillators at 1x, 2x, 3x and about 4x the pitch (the **harmonics**). Higher harmonics fade faster, as in a real piano. A filter slowly closes to soften the tail.
- **`guitar`**: three oscillators (sawtooth, triangle, an octave-up sine) through a low-pass filter that closes quickly (a plucked-string "pluck"), plus a tiny noise click for the pick.
- **`violin`**: two sawtooth waves detuned by +/-5 cents (a cent is 1/100 of a semitone), a slow attack, and **vibrato**: an LFO (low-frequency oscillator, 5.5 Hz) wobbling the pitch, fading in over 0.7s.
- **`padChord`**: for each chord note, two detuned sawtooth waves through a filter that slowly opens. The slow attack gives the "strings" swell.
- **`oud`**: two detuned sawtooth waves that start 3% sharp and fall into tune in 25ms (the pluck attack), plus an octave-up triangle. The fast filter sweep gives a nasal pluck.
- **`noiseHit` (507-515)**: plays the noise buffer through a filter with a fast fade. All the drums are built from it.
- **`doum`**: a sine falling from 150 to 90 Hz (a low drum hit). **`tek`**: a filtered noise burst plus a short high sine (a rim hit).
- **`kick`**: a sine that falls quickly from 160 to 48 Hz.
- **`bass808`**: a sine that starts high and drops, then optionally **slides** to another note (`to`). It goes through the saturation curve so it has extra harmonics.
- **`clap`**: three very short noise bursts 12ms apart, then a longer tail. That is how a clap's "multiple hands" sound is imitated.
- **`hat`**: very high-pass filtered noise, short (closed) or longer (open).
- **`cowbell`**: two square waves (587 Hz and 845 Hz) through a band-pass filter.

### 5.9 The music loop (lines 579-634)

Timing in JavaScript (`setInterval`) isn't accurate enough for music. The standard fix is a **lookahead scheduler**: a timer wakes up every 25ms and schedules any notes due in the next 0.12 seconds on the precise audio clock.

- `startMusic` (580-585): creates `beat` with a start time, the length of one step (`dur`), and a step counter. For Midnight Run `dur = 60 / 140 / 4` seconds, which is a 16th note at 140 BPM. Slow Dusk uses 0.4s per step (an eighth note). Chimes has no loop.
- `stopMusic`: stops the timer.
- `tick` (591-598): while the next step is due soon, play it and move on. If a step is already in the past (for example, the tab was in the background), skip it so sounds don't pile up.
- `balladStep` (599-615): steps 0-7 make a bar and four bars loop. On step 0: a string pad, three piano notes and a violin note. On step 4: a softer piano chord and another violin note. Every step: one fingerpicked guitar note from a pattern. Drum hits on steps 0, 4, 2, 3 and 6.
- `streetStep` (616-629): 16 steps per bar. It places the kick, 808 bass, clap, hi-hats, cowbell and darbuka on chosen steps. `step % 16` gives the position in the bar; `Math.floor(step / 16) % 4` gives which of four bars.
- `quantTime` (630-634): rounds the time to the next beat step. Notes you play in Midnight Run are delayed up to one 16th note so they land in rhythm.

### 5.10 Notes from the board (lines 636-670)

- `play(ci, vel)`: plays one note for column `ci` at volume `vel`. It refuses to play if sound is off, the engine isn't running, too many notes are active, or the last note was too recent (70ms, or 105ms for Midnight Run). Then it picks the instrument by `mode`. In Midnight Run it also plays a quiet grace note just before the main note for the oud ornament.
- `chord(ci)`: what a click or tap plays. Slow Dusk: a rolling four-note piano chord. Midnight Run: a bass hit plus a four-note oud riff. Chimes: a three-note bell chord.

### 5.11 Style buttons (lines 672-688)

- `applyStyle(m)`: stops the old music, switches `mode`, updates which button is pressed, saves the choice, and starts the new loop (if the audio engine already exists).
- 684-686: each style button calls `ensureAudio()` and then `applyStyle`.
- 687-688: on startup, restores the saved style (or defaults to Slow Dusk).

### 5.12 Lighting tiles (lines 690-707)

- `hit(ci, cj, e, idx)`: ignores tiles outside the grid. Finds the tile's list position `k = row * cols + col`. If the tile is nearly dark it takes the new colour. It sets energy to the larger of the old and new value.
- `light(...)`: picks a random palette colour, lights the tile at full energy, plays a note if `vel` is given, and optionally lights the four neighbours at 0.3-0.6 strength (a soft halo).

### 5.13 Pointer input (lines 709-743)

- 710-712: `mouse` holds the smoothed spotlight, and `ripples` is a list of four ripple slots reused in turn (`ripIdx` is the next slot).
- `local(e)`: converts a pointer event to coordinates inside the canvas.
- `pointermove` (718-730): the **Pointer Events** API handles mouse, touch and pen with one handler. If you move fast, the pointer jumps several tiles between events, which would leave gaps. So the code walks a straight line between the last and new position in half-tile steps and lights every tile on the path.
- `pointerleave` (731): fades out the spotlight.
- `pointerdown` (732-743): first calls `ensureAudio()` (a tap counts as the permission gesture). Then it starts a ripple in the next slot, lights a 3x3 block of tiles, and plays the chord.

### 5.14 Drift and the frame loop (lines 745-796)

- 746-751: `drifting` is on unless the user asked for less motion. The Drift switch toggles it.
- `frame(now)` (755-796) runs every screen refresh via `requestAnimationFrame`:
  - 756: `dt` = seconds since the last frame, capped at 0.05 so a lag spike can't make things jump.
  - 760-767 (**drift**): moves an invisible point on a smooth looping path (sine and cosine curves at different speeds, a Lissajous curve). Whenever it enters a new tile, that tile is lit.
  - 769: `decay = Math.exp(-dt / 1.0)`. Multiplying by this every frame makes energy fall by the same proportion per second whatever the frame rate. The `1.0` is the fade speed.
  - 770-779: for every tile: shrink the energy, snap tiny values to 0, and pack it into `data` (energy in the red byte, colour number x 40 in green).
  - 780-781: upload `data` into the texture (`texImage2D`).
  - 783-789: age each ripple and pack its position, age and on/off flag for the shader.
  - 790: smooth the spotlight toward its target.
  - 791-793: send the ripples, pointer and time to the shader.
  - 794: `drawArrays` runs the shader over the screen.
  - 795: ask the browser to call `frame` again next refresh.

### 5.15 Startup (lines 798-804)

- 798-799: restore the saved palette (default Classic).
- 800: measure and set up the board.
- 801: re-run `resize` whenever the board area changes size (`ResizeObserver`), or on window resize in old browsers.
- 802: start the loop.
- 804: registers the service worker after the page loads. `.catch(function(){})` ignores errors.

---

## 6. Glossary

- **PWA**: a website with a manifest and service worker, so it can be installed and works offline.
- **Service worker**: a background script that can answer file requests from a saved copy.
- **WebGL**: the browser's way to draw using the graphics card.
- **Shader**: a small program that runs on the GPU. A fragment shader runs once per pixel.
- **Uniform / texture**: data given to a shader. Uniforms are single values; a texture is a grid.
- **Web Audio**: the browser's sound engine, built from connected nodes.
- **Envelope**: how a sound's volume changes from start to end.
- **LFO**: a slow oscillator used to wobble something (vibrato).
- **Semitone**: one piano key step. 12 semitones = one octave (double the frequency).
- **Lookahead scheduler**: a timer that queues sounds slightly early on the precise audio clock.

---

## 7. Putting it on the Google Play Store

### The idea

Play doesn't accept a website directly. You wrap your hosted PWA in a thin Android app. The standard way is a **Trusted Web Activity (TWA)**: a full-screen Chrome window showing your site with no address bar. Because it uses Chrome, WebGL and Web Audio work exactly as in the browser. And because it loads your live site, **updating the website updates the app**, with no new Play release needed for most changes.

### Choose a tool

| Option | Good for | Notes |
|---|---|---|
| **PWABuilder** (pwabuilder.com) | Easiest. No command line. | You enter your site's address and it produces the Android package. |
| **Bubblewrap** (Google's command line tool) | More control. | The official codelab uses it. Needs Node.js. It downloads Java and Android tools itself. |
| **Capacitor** | If you later want native features or to bundle files inside the app. | More work. Also the route to the iPhone App Store. |

Recommendation: start with PWABuilder, or Bubblewrap if you like the command line.

### Step by step

1. **Host the app over HTTPS** (Netlify is fine). A custom domain is nicer and the address stays stable, but a `netlify.app` address also works because you control the files on it.
2. **Check the PWA works**: install it on your phone, and run Chrome's Lighthouse "PWA" check. Make sure the manifest has the 192 and 512 icons (it does).
3. **Create a Google Play developer account** (play.google.com/console). There is a one-time registration fee (about US$25 when I last knew; confirm the amount in the console) and an identity verification step with your ID. Allow a few days.
4. **Build the Android package** (an `.aab` file):
   - PWABuilder: enter your site address, choose Android, fill in the app name and package id (like `com.yourname.calmhoverboard`), and download.
   - Bubblewrap: `bubblewrap init --manifest=https://your-site/manifest.json`, then `bubblewrap build`. This makes `app-release-bundle.aab` (to upload) and an `.apk` (to test on your phone).
5. **Create the app in Play Console** and fill in the required forms:
   - Store listing: name, short description (80 characters), full description, a 512x512 icon, a 1024x500 feature graphic, and at least two phone screenshots.
   - Privacy policy link. This app stores only your palette and style choice on your own device and collects nothing, which keeps it simple, but you still need a short policy page. I can draft one.
   - Data safety form: "no data collected".
   - Content rating questionnaire and target audience.
   - Ads: none.
6. **Link the app to your website (Digital Asset Links).** In Play Console go to **Test and release > App integrity** and copy the **SHA-256 fingerprint** (Google re-signs your app, so you need theirs). Add it to a file called `assetlinks.json` and host it at `https://your-site/.well-known/assetlinks.json` (Bubblewrap: `bubblewrap fingerprint add <fingerprint>` makes the file). **If this is wrong, the app shows a browser address bar instead of full screen.**
7. **Test it.** Upload the `.aab` to an **internal testing** track and install it on your phone from the test link.
8. **Closed test, then production.** For a **new personal developer account**, Google requires a closed test with **at least 12 testers who stay opted in for 14 continuous days** before you can apply for production access. Testers should actually open the app. Organisation accounts are reported to be exempt from this. Then click **Apply for production** in the Dashboard and wait for review.

### How long and what it costs

- About 3-4 weeks in total, mostly the 14-day test.
- Costs: the Play registration fee, plus an optional domain.

### Things to know

- **iPhone/iPad**: use "Add to Home Screen" from Safari. The Apple App Store needs a native wrapper (like Capacitor), a paid Apple developer account, and Apple can reject apps that are just a website in a frame.
- **Sound**: still needs a first tap inside the app (an Android and browser rule).
- **Music**: every sound is generated by the code, so there are no song copyright problems.
- **Updating**: change the site and redeploy (and bump the version in `sw.js`). Only repackage if you change the app name, icons or package settings.

---

## 8. Practice: small changes that teach you the code

1. **Fade speed**: in `frame`, change `dt / 1.0` to `dt / 2.0`. Tiles stay lit twice as long.
2. **Idle tile colour**: change the numbers in `gl.uniform3f(U.uTile, ...)`. Try `0.2, 0.1, 0.1` for a warm tint.
3. **New palette**: add a line to `PALETTES` with your own hex colours. A button appears automatically.
4. **Tile size and gap**: change `pitch` and `size` in `resize`.
5. **Tempo**: change the `140` in `startMusic`.
6. **New chords**: edit `PROG` (try `[0, 3, 7]` for A minor, `[5, 9, 12]` for D major) and the matching note sets in `BAR_SETS`.
7. **Different bell**: in `tone`, change `'sine'` to `'triangle'`.

Sources for the Play Store section:
- [Google Play Console Help: testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
- [Google Codelab: Adding your PWA to Google Play](https://developers.google.com/codelabs/pwa-in-play)
- [Testers Community: closed testing requirements 2026](https://www.testerscommunity.com/blog/google-play-closed-testing-requirements-2026)
