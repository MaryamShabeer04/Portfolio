const COUNT = 5;
const paletteEl = document.getElementById('palette');
const toastEl = document.getElementById('toast');
let colors = [];

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)]
    .map(x => Math.round(x * 255).toString(16).padStart(2, '0'))
    .join('').toUpperCase();
}

function textColor(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111' : '#fff';
}

// Harmonious palettes: a base hue plus offsets, with varied lightness
function generate() {
  const base = Math.random() * 360;
  const schemes = [
    [0, 30, 60, 180, 210],      // analogous + accent
    [0, 120, 240, 20, 200],     // triadic
    [0, 180, 15, 195, 90],      // complementary
    [0, 25, 50, 75, 100],       // analogous
  ];
  const offsets = schemes[Math.floor(Math.random() * schemes.length)];
  return offsets.slice(0, COUNT).map(o =>
    hslToHex((base + o) % 360, 45 + Math.random() * 40, 35 + Math.random() * 40)
  );
}

function render() {
  paletteEl.innerHTML = '';
  colors.forEach((c, i) => {
    const fg = textColor(c.hex);
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.backgroundColor = c.hex;
    sw.style.color = fg;
    sw.style.setProperty('--bg', c.hex);

    const hex = document.createElement('button');
    hex.className = 'hex';
    hex.textContent = c.hex;
    hex.title = 'Copy';
    hex.addEventListener('click', () => copy(c.hex));

    const lock = document.createElement('button');
    lock.className = 'lock' + (c.locked ? ' on' : '');
    lock.setAttribute('aria-label', (c.locked ? 'Unlock ' : 'Lock ') + c.hex);
    lock.innerHTML = '<span>' + (c.locked ? '🔒' : '🔓') + '</span>';
    lock.addEventListener('click', () => { c.locked = !c.locked; render(); });

    sw.append(hex, lock);
    paletteEl.append(sw);
  });
}

function shuffle() {
  const fresh = generate();
  colors = fresh.map((hex, i) =>
    colors[i] && colors[i].locked ? colors[i] : { hex, locked: false }
  );
  render();
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('show'), 1400);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied ' + text);
  } catch {
    toast('Copy failed');
  }
}

document.getElementById('generate').addEventListener('click', shuffle);
document.getElementById('export').addEventListener('click', () =>
  copy(':root {\n' + colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n') + '\n}')
);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    shuffle();
  }
});

shuffle();
