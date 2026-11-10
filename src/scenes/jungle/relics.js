/* Carved and cast art for the temple: treasures, relief panels, banners, guardian masks, plants and
   the rolling stone wheel. Everything is painted once into cached sprites. */
import { U, TAU, hd, put, stoneTex } from './kit.js';

const leaf = (g, x, y, s, a, col) => {
  g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.9, -s * 0.75, s * 2, 0); g.quadraticCurveTo(s * 0.9, s * 0.75, 0, 0); g.fill();
  g.restore();
};

/** Emblem outline (sun, serpent or eye) in a 96-unit box centred on (48, 48). */
const motifPath = (g, kind) => {
  g.beginPath();
  if (kind === 'sun') {
    g.moveTo(61, 48); g.arc(48, 48, 13, 0, TAU);
    for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12, o = i % 2 ? 26 : 32; g.moveTo(48 + Math.cos(a) * 19, 48 + Math.sin(a) * 19); g.lineTo(48 + Math.cos(a) * o, 48 + Math.sin(a) * o); }
  } else if (kind === 'serpent') {
    g.moveTo(22, 76); g.bezierCurveTo(6, 56, 62, 66, 52, 44); g.bezierCurveTo(46, 30, 58, 22, 67, 26);
    g.moveTo(73, 27); g.lineTo(80, 24); g.moveTo(73, 27); g.lineTo(80, 31);
  } else {
    g.moveTo(20, 48); g.quadraticCurveTo(48, 20, 76, 48); g.quadraticCurveTo(48, 76, 20, 48);
    g.moveTo(58, 48); g.arc(48, 48, 10, 0, TAU); g.moveTo(46, 62); g.lineTo(42, 78); g.moveTo(32, 58); g.lineTo(25, 70);
  }
};

/** Carved relief panel with gold inlay: eye, serpent or sun. */
const glyph = (kind) => hd('je-glyph-' + kind, 96, 96, (g) => {
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(8, 8, 80, 80);
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(8, 8, 80, 4); g.fillRect(8, 8, 4, 80);
  g.fillStyle = 'rgba(255,236,190,0.13)'; g.fillRect(8, 84, 80, 4); g.fillRect(84, 8, 4, 80);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const motif = () => motifPath(g, kind);
  g.strokeStyle = 'rgba(0,0,0,0.65)'; g.lineWidth = 5; g.save(); g.translate(1.5, 1.5); motif(); g.stroke(); g.restore();
  g.strokeStyle = '#c9a24a'; g.lineWidth = 3; motif(); g.stroke();
  g.strokeStyle = 'rgba(255,240,180,0.55)'; g.lineWidth = 1; g.save(); g.translate(-0.7, -0.7); motif(); g.stroke(); g.restore();
  if (kind === 'serpent') { g.fillStyle = '#c9a24a'; g.beginPath(); g.ellipse(68, 26, 6, 4.5, -0.3, 0, TAU); g.fill(); g.fillStyle = '#c0283a'; g.beginPath(); g.arc(69.5, 24.5, 1.5, 0, TAU); g.fill(); }
  if (kind === 'eye') { g.fillStyle = '#2fbf8a'; g.beginPath(); g.arc(48, 48, 4, 0, TAU); g.fill(); }
});

/* Banner colours per emblem: [shadow, cloth, trim]. */
const BANNER = { sun: ['#5e130e', '#b3301e', '#e8b84a'], serpent: ['#0a3a28', '#1c7a52', '#e8c25a'], eye: ['#2a1244', '#5a2c8a', '#e0b44a'] };

/** Hanging temple banner: swallowtail cloth with folds, gold trim and fret band, an emblem and tassels. */
const bannerSprite = (kind) => hd('je-banner-' + kind, 76, 214, (g, W) => {
  const c = W / 2, top = 14, bw = 54, bh = 160, [dk, md, gd] = BANNER[kind];
  const cloth = () => { g.beginPath(); g.moveTo(c - bw / 2, top); g.lineTo(c + bw / 2, top); g.lineTo(c + bw / 2, top + bh); g.lineTo(c, top + bh - 20); g.lineTo(c - bw / 2, top + bh); g.closePath(); };
  cloth(); g.fillStyle = U.lin(g, c - bw / 2, 0, c + bw / 2, 0, [[0, dk], [0.38, md], [0.62, U.mixHex(md, '#ffffff', 0.08)], [1, dk]]); g.fill();
  g.save(); cloth(); g.clip();
  for (const [x, wd] of [[c - 16, 7], [c + 4, 6], [c + 18, 5]]) {
    g.fillStyle = U.lin(g, x - wd, 0, x + wd, 0, [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,0.22)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x - wd, top, wd * 2, bh);
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + wd, top, 2, bh);
  }
  g.fillStyle = U.lin(g, 0, top, 0, top + bh, [[0, 'rgba(0,0,0,0.35)'], [0.15, 'rgba(0,0,0,0)'], [0.85, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]); g.fillRect(0, top, W, bh);
  // gold fret band across the top
  g.fillStyle = gd; g.fillRect(c - bw / 2, top + 8, bw, 2); g.fillRect(c - bw / 2, top + 22, bw, 2);
  g.strokeStyle = gd; g.lineWidth = 1.4; g.beginPath();
  for (let x = c - bw / 2 + 3; x < c + bw / 2 - 6; x += 9) { g.moveTo(x, top + 19); g.lineTo(x, top + 13); g.lineTo(x + 6, top + 13); g.lineTo(x + 6, top + 17); g.lineTo(x + 3, top + 17); }
  g.stroke();
  // inset trim following the swallowtail
  g.strokeStyle = U.rgba(gd, 0.85); g.lineWidth = 1.6; g.beginPath();
  g.moveTo(c - bw / 2 + 5, top + 28); g.lineTo(c - bw / 2 + 5, top + bh - 9); g.lineTo(c, top + bh - 27); g.lineTo(c + bw / 2 - 5, top + bh - 9); g.lineTo(c + bw / 2 - 5, top + 28); g.stroke();
  // emblem in a gold roundel
  const ey = top + 74;
  g.beginPath(); g.arc(c, ey, 19, 0, TAU); g.fillStyle = U.rgba(dk, 0.75); g.fill(); g.strokeStyle = gd; g.lineWidth = 1.8; g.stroke();
  g.save(); g.translate(c - 48 * 0.4, ey - 48 * 0.4); g.scale(0.4, 0.4); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 9; motifPath(g, kind); g.stroke();
  g.strokeStyle = gd; g.lineWidth = 5.5; motifPath(g, kind); g.stroke();
  if (kind === 'serpent') { g.fillStyle = gd; g.beginPath(); g.ellipse(68, 26, 7, 5.5, -0.3, 0, TAU); g.fill(); }
  if (kind === 'eye') { g.fillStyle = '#5fe3a0'; g.beginPath(); g.arc(48, 48, 5, 0, TAU); g.fill(); }
  g.restore();
  g.restore();
  cloth(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.4; g.stroke();
  // tassels
  for (const [x, y] of [[c - bw / 2 + 1, top + bh], [c, top + bh - 20], [c + bw / 2 - 1, top + bh]]) {
    g.strokeStyle = gd; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 9); g.stroke();
    g.fillStyle = U.lin(g, x - 4, 0, x + 4, 0, [[0, '#7a5410'], [0.5, gd], [1, '#7a5410']]);
    g.beginPath(); g.moveTo(x - 1.5, y + 8); g.lineTo(x + 1.5, y + 8); g.lineTo(x + 4, y + 22); g.lineTo(x - 4, y + 22); g.closePath(); g.fill();
    g.beginPath(); g.arc(x, y + 9, 2.6, 0, TAU); g.fill();
  }
  // brass pole with finials
  g.fillStyle = U.lin(g, 0, 6, 0, 14, [[0, '#ffe08a'], [0.5, '#c9962e'], [1, '#6a4808']]); U.rr(g, 4, 8, W - 8, 6, 3); g.fill();
  for (const x of [5, W - 5]) { g.beginPath(); g.arc(x, 11, 4.2, 0, TAU); g.fill(); }
  g.strokeStyle = '#3a2a10'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(c, 0); g.lineTo(c - 14, 8); g.moveTo(c, 0); g.lineTo(c + 14, 8); g.stroke();
});

/** Guardian mask carved into the wall; its eyes are lit separately so they can change colour. */
const guardianSprite = () => hd('je-guardian', 128, 118, (g, W, H) => {
  const c = W / 2;
  // sunken stone panel
  g.fillStyle = 'rgba(0,0,0,0.42)'; U.rr(g, 6, 6, W - 12, H - 12, 10); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(12, 6, W - 24, 4);
  g.fillStyle = 'rgba(255,236,190,0.12)'; g.fillRect(12, H - 10, W - 24, 3);
  const stone = U.lin(g, 0, 10, 0, H - 10, [[0, '#8e876a'], [0.55, '#6a6550'], [1, '#3a382a']]);
  const carve = (path, fill) => {
    g.save(); g.translate(2, 2.5); path(); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill(); g.restore();
    path(); g.fillStyle = fill; g.fill();
    g.save(); g.translate(-1, -1); path(); g.strokeStyle = 'rgba(255,240,200,0.18)'; g.lineWidth = 1.2; g.stroke(); g.restore();
  };
  // headdress: stepped crown with feathers
  carve(() => { g.beginPath(); for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.3; g.moveTo(c, 46); g.lineTo(c + Math.cos(a - 0.1) * 40, 46 + Math.sin(a - 0.1) * 40); g.lineTo(c + Math.cos(a + 0.1) * 40, 46 + Math.sin(a + 0.1) * 40); g.closePath(); } }, U.lin(g, 0, 6, 0, 46, [[0, '#a29a78'], [1, '#5e5a44']]));
  carve(() => { g.beginPath(); g.moveTo(c - 36, 40); g.lineTo(c + 36, 40); g.lineTo(c + 30, 52); g.lineTo(c - 30, 52); g.closePath(); }, stone);
  // face
  carve(() => { g.beginPath(); g.moveTo(c - 30, 50); g.lineTo(c + 30, 50); g.quadraticCurveTo(c + 32, 86, c + 18, 104); g.lineTo(c - 18, 104); g.quadraticCurveTo(c - 32, 86, c - 30, 50); g.closePath(); }, stone);
  // ear spools
  for (const sx of [-1, 1]) carve(() => { g.beginPath(); g.arc(c + sx * 36, 70, 8, 0, TAU); }, stone);
  // gold inlay: headband and spool rings
  g.fillStyle = '#c9a24a'; g.fillRect(c - 34, 44, 68, 2.5);
  g.strokeStyle = '#c9a24a'; g.lineWidth = 2; for (const sx of [-1, 1]) { g.beginPath(); g.arc(c + sx * 36, 70, 4, 0, TAU); g.stroke(); }
  // eye sockets, nose, mouth
  g.fillStyle = 'rgba(10,6,2,0.85)';
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(c + sx * 22, 66); g.quadraticCurveTo(c + sx * 13, 56, c + sx * 5, 64); g.quadraticCurveTo(c + sx * 13, 72, c + sx * 22, 66); g.fill(); }
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 4; g.lineCap = 'round';
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(c + sx * 25, 57); g.lineTo(c + sx * 6, 59); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.moveTo(c - 4, 66); g.lineTo(c + 4, 66); g.lineTo(c + 7, 82); g.lineTo(c - 7, 82); g.closePath(); g.fill();
  U.rr(g, c - 16, 88, 32, 9, 3); g.fillStyle = 'rgba(10,6,2,0.85)'; g.fill();
  g.fillStyle = 'rgba(200,190,150,0.6)'; for (let i = 0; i < 5; i++) g.fillRect(c - 14 + i * 6, 88, 4, 3.5);
  // moss in the crevices
  const r = U.rng(8);
  for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(' + ((60 + r() * 40) | 0) + ',' + ((110 + r() * 50) | 0) + ',40,' + (0.35 + r() * 0.35).toFixed(2) + ')'; g.beginPath(); g.ellipse(14 + r() * (W - 28), r() < 0.5 ? 10 + r() * 6 : H - 12 - r() * 4, 2 + r() * 5, 1.5 + r() * 2, 0, 0, TAU); g.fill(); }
});

const INKB = '#2a1704';
const FLOWERS = ['#ff5d8f', '#ff9a3c', '#c77dff'];
const GOLD = (g, x0, x1) => U.lin(g, x0, 0, x1, 0, [[0, '#5a3905'], [0.28, '#ffe48f'], [0.5, '#f2b53e'], [0.78, '#a66d0e'], [1, '#4a2e04']]);

/** Five-petal jungle blossom. */
const flower = (g, x, y, r, col) => {
  g.save(); g.translate(x, y); g.fillStyle = col;
  for (let i = 0; i < 5; i++) { g.rotate(TAU / 5); g.beginPath(); g.ellipse(0, -r * 0.72, r * 0.52, r * 0.78, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(-r * 0.2, -r * 0.55, r * 0.22, r * 0.36, -0.4, 0, TAU); g.fill();
  g.fillStyle = '#ffe36a'; g.beginPath(); g.arc(0, 0, r * 0.36, 0, TAU); g.fill();
  g.restore();
};

/** Faceted gem with a highlight facet. */
const gem = (g, x, y, r, col) => {
  g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.85, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.85, y); g.closePath();
  g.fillStyle = col; g.fill(); g.strokeStyle = INKB; g.lineWidth = 1; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.42, y - r * 0.1); g.lineTo(x, y); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(x, y + r); g.lineTo(x - r * 0.85, y); g.lineTo(x, y); g.closePath(); g.fill();
};

/** Stepped stone plinth with a gold step-fret panel; returns the y of its top face. */
const plinth = (g, c, H, w, hgt, inlay) => {
  g.fillStyle = U.lin(g, 0, H - 12, 0, H, [[0, '#6e6850'], [1, '#24221a']]); g.fillRect(c - w / 2 - 6, H - 12, w + 12, 12);
  g.fillStyle = 'rgba(255,240,200,0.16)'; g.fillRect(c - w / 2 - 6, H - 12, w + 12, 2);
  const top = H - 12 - hgt;
  g.fillStyle = U.lin(g, c - w / 2, 0, c + w / 2, 0, [[0, '#3a382a'], [0.4, '#8a8466'], [1, '#2e2c20']]); g.fillRect(c - w / 2, top, w, hgt);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(c - w / 2, top + hgt - 3, w, 3);
  g.fillStyle = inlay; g.fillRect(c - w / 2, top + 3, w, 3);
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.5; g.strokeRect(c - w / 2 + 5, top + 10, w - 10, hgt - 17);
  g.strokeStyle = 'rgba(224,176,74,0.8)'; g.lineWidth = 1.4; g.beginPath();
  const fy = top + 10 + (hgt - 17) / 2 + 3;
  for (let x = c - w / 2 + 9; x < c + w / 2 - 13; x += 10) { g.moveTo(x, fy); g.lineTo(x, fy - 6); g.lineTo(x + 6, fy - 6); g.lineTo(x + 6, fy - 2); g.lineTo(x + 3, fy - 2); }
  g.stroke();
  g.fillStyle = U.lin(g, 0, top - 8, 0, top, [[0, '#b0a882'], [1, '#5e5a44']]); g.fillRect(c - w / 2 - 5, top - 8, w + 10, 8);
  g.fillStyle = 'rgba(255,245,215,0.3)'; g.fillRect(c - w / 2 - 5, top - 8, w + 10, 1.5);
  return top - 8;
};

/** Golden seated idol with a feathered headdress and emerald eyes. */
const idolSprite = () => hd('je-idol2', 110, 160, (g, W, H) => {
  const c = W / 2, y0 = plinth(g, c, H, 50, 40, '#2fbf8a');
  g.lineJoin = 'round'; g.lineCap = 'round';
  const gold = GOLD(g, c - 22, c + 22);
  const shape = (fn) => { g.beginPath(); fn(); g.fillStyle = gold; g.fill(); g.strokeStyle = INKB; g.lineWidth = 1.4; g.stroke(); };
  for (let k = -3; k <= 3; k++) {
    const a = -Math.PI / 2 + k * 0.32, L = 25 - Math.abs(k) * 1.6;
    g.save(); g.translate(c, y0 - 44); g.rotate(a + Math.PI / 2);
    g.beginPath(); g.ellipse(0, -L * 0.62, 4.4, L * 0.62, 0, 0, TAU); g.fillStyle = gold; g.fill(); g.strokeStyle = INKB; g.lineWidth = 1.3; g.stroke();
    g.beginPath(); g.ellipse(0, -L * 1.02, 3, L * 0.24, 0, 0, TAU); g.fillStyle = k % 2 ? '#2fbf8a' : '#d4283c'; g.fill(); g.stroke();
    g.strokeStyle = 'rgba(90,50,0,0.55)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, -L * 1.1); g.stroke();
    g.restore();
  }
  shape(() => g.ellipse(c, y0 - 6, 19, 7, 0, 0, TAU));
  shape(() => { g.moveTo(c - 12, y0 - 9); g.lineTo(c + 12, y0 - 9); g.lineTo(c + 9, y0 - 31); g.lineTo(c - 9, y0 - 31); g.closePath(); });
  for (const sx of [-1, 1]) shape(() => { g.moveTo(c + sx * 9, y0 - 30); g.quadraticCurveTo(c + sx * 18, y0 - 22, c + sx * 14, y0 - 8); g.lineTo(c + sx * 9, y0 - 9); g.quadraticCurveTo(c + sx * 12, y0 - 20, c + sx * 6, y0 - 26); g.closePath(); });
  shape(() => g.ellipse(c, y0 - 30, 11, 4, 0, 0, TAU));
  g.beginPath(); g.arc(c, y0 - 21, 3.6, 0, TAU); g.fillStyle = '#2fbf8a'; g.fill(); g.strokeStyle = INKB; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = 'rgba(220,255,235,0.8)'; g.beginPath(); g.arc(c - 1.2, y0 - 22.2, 1.1, 0, TAU); g.fill();
  shape(() => U.rr(g, c - 9.5, y0 - 50, 19, 19, 5));
  g.fillStyle = '#7a4a08'; g.fillRect(c - 10, y0 - 48, 20, 3);
  for (const sx of [-1, 1]) { shape(() => g.arc(c + sx * 11, y0 - 39, 3.3, 0, TAU)); g.fillStyle = '#2fbf8a'; g.beginPath(); g.arc(c + sx * 11, y0 - 39, 1.4, 0, TAU); g.fill(); }
  g.save(); g.shadowColor = '#3cf0a0'; g.shadowBlur = 12; g.fillStyle = '#5cffb4';
  g.beginPath(); g.ellipse(c - 4, y0 - 41, 2.6, 1.5, 0, 0, TAU); g.ellipse(c + 4, y0 - 41, 2.6, 1.5, 0, 0, TAU); g.fill(); g.restore();
  g.strokeStyle = 'rgba(90,50,0,0.75)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(c, y0 - 40); g.lineTo(c, y0 - 36); g.moveTo(c - 4, y0 - 34); g.lineTo(c + 4, y0 - 34); g.stroke();
  g.fillStyle = 'rgba(255,255,230,0.55)'; g.fillRect(c - 6, y0 - 29, 2, 17); g.fillRect(c - 6, y0 - 48, 2, 10);
});

/** Jade mosaic mask with shell eyes, gold diadem and ear spools, on a stand. */
const maskSprite = () => hd('je-mask', 110, 160, (g, W, H) => {
  const c = W / 2, top = plinth(g, c, H, 42, 32, '#c9a24a'), my = top - 46;
  g.lineJoin = 'round';
  g.fillStyle = U.lin(g, c - 4, 0, c + 4, 0, [[0, '#3a2a14'], [0.5, '#8a6a3a'], [1, '#2a1c0c']]); g.fillRect(c - 3, my + 20, 6, top - my - 20);
  for (const sx of [-1, 1]) {
    const ex = c + sx * 25;
    g.beginPath(); g.arc(ex, my - 2, 7, 0, TAU); g.fillStyle = GOLD(g, ex - 7, ex + 7); g.fill(); g.strokeStyle = INKB; g.lineWidth = 1.3; g.stroke();
    g.beginPath(); g.arc(ex, my - 2, 3, 0, TAU); g.fillStyle = '#d4283c'; g.fill(); g.stroke();
  }
  const face = () => { g.beginPath(); g.moveTo(c - 22, my - 18); g.quadraticCurveTo(c, my - 34, c + 22, my - 18); g.quadraticCurveTo(c + 24, my + 6, c + 14, my + 22); g.quadraticCurveTo(c, my + 32, c - 14, my + 22); g.quadraticCurveTo(c - 24, my + 6, c - 22, my - 18); g.closePath(); };
  face(); g.fillStyle = U.lin(g, c - 24, my - 30, c + 24, my + 30, [[0, '#8ff0c0'], [0.35, '#2fae6e'], [0.7, '#14603c'], [1, '#0a2e1c']]); g.fill();
  g.save(); face(); g.clip();
  const r = U.rng(31);
  for (let y = my - 34, row = 0; y < my + 34; y += 7, row++) for (let x = c - 28 + (row % 2) * 4; x < c + 28; x += 8) {
    const v = r();
    if (v < 0.3) { g.fillStyle = v < 0.12 ? 'rgba(200,255,225,0.18)' : 'rgba(0,30,15,0.22)'; g.fillRect(x, y, 7, 6); }
    g.strokeStyle = 'rgba(5,30,18,0.5)'; g.lineWidth = 0.9; g.strokeRect(x, y, 7, 6);
  }
  g.restore();
  face(); g.strokeStyle = INKB; g.lineWidth = 1.6; g.stroke();
  g.beginPath(); g.moveTo(c - 21, my - 16); g.quadraticCurveTo(c, my - 31, c + 21, my - 16); g.lineTo(c + 19, my - 11); g.quadraticCurveTo(c, my - 25, c - 19, my - 11); g.closePath();
  g.fillStyle = GOLD(g, c - 21, c + 21); g.fill(); g.stroke();
  gem(g, c, my - 22, 3.6, '#e0283c');
  for (const sx of [-1, 1]) {
    g.beginPath(); g.ellipse(c + sx * 9, my - 3, 6, 3.4, sx * -0.15, 0, TAU); g.fillStyle = '#f4ecd8'; g.fill(); g.strokeStyle = INKB; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#120c08'; g.beginPath(); g.arc(c + sx * 9, my - 3, 2.3, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(c + sx * 9 - 0.8, my - 4, 0.7, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(0,30,15,0.35)'; g.beginPath(); g.moveTo(c - 1.5, my - 3); g.lineTo(c - 5, my + 9); g.lineTo(c + 5, my + 9); g.lineTo(c + 1.5, my - 3); g.closePath(); g.fill();
  U.rr(g, c - 9, my + 13, 18, 6, 3); g.fillStyle = '#2a0d08'; g.fill(); g.strokeStyle = INKB; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#f4ecd8'; for (let i = 0; i < 4; i++) g.fillRect(c - 7 + i * 3.8, my + 13.5, 2.6, 2.4);
});

/** Open treasure chest overflowing with gold, gems and pearls. */
const chestSprite = () => hd('je-chest', 130, 112, (g, W, H) => {
  const c = W / 2, bw = 74, bh = 34, by = H - 4 - bh;
  g.lineJoin = 'round';
  g.beginPath(); g.moveTo(c - bw / 2 + 2, by); g.lineTo(c - bw / 2 + 8, by - 34); g.quadraticCurveTo(c, by - 47, c + bw / 2 - 8, by - 34); g.lineTo(c + bw / 2 - 2, by); g.closePath();
  g.fillStyle = U.lin(g, 0, by - 46, 0, by, [[0, '#5a3418'], [1, '#2a160a']]); g.fill(); g.strokeStyle = INKB; g.lineWidth = 1.6; g.stroke();
  g.beginPath(); g.moveTo(c - bw / 2 + 9, by); g.lineTo(c - bw / 2 + 13, by - 29); g.quadraticCurveTo(c, by - 40, c + bw / 2 - 13, by - 29); g.lineTo(c + bw / 2 - 9, by); g.closePath();
  g.fillStyle = U.lin(g, 0, by - 40, 0, by, [[0, '#8a1c2a'], [1, '#3a0810']]); g.fill();
  for (const x of [c - 26, c + 22]) { g.fillStyle = GOLD(g, x - 2, x + 6); g.beginPath(); g.moveTo(x - 1, by); g.lineTo(x + 1, by - 38); g.lineTo(x + 6, by - 39); g.lineTo(x + 5, by); g.fill(); }
  g.drawImage(U.goldPile('je-gold', 86, 42, 9), c - 43, by - 31);
  gem(g, c - 18, by - 12, 6, '#e0283c'); gem(g, c + 12, by - 19, 7, '#2fbf8a'); gem(g, c + 27, by - 8, 5, '#4aa8ff'); gem(g, c - 3, by - 24, 5, '#c77dff'); gem(g, c - 30, by - 6, 4.5, '#4aa8ff');
  g.fillStyle = U.lin(g, 0, by, 0, by + bh, [[0, '#7a4a22'], [1, '#3a200c']]); g.fillRect(c - bw / 2, by, bw, bh);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(c - bw / 2, by + 11, bw, 1.5); g.fillRect(c - bw / 2, by + 22, bw, 1.5);
  g.strokeStyle = INKB; g.lineWidth = 1.6; g.strokeRect(c - bw / 2, by, bw, bh);
  for (const x of [c - bw / 2, c + bw / 2 - 8, c - 22, c + 14]) { g.fillStyle = GOLD(g, x, x + 8); g.fillRect(x, by, 8, bh); g.strokeStyle = INKB; g.lineWidth = 1; g.strokeRect(x, by, 8, bh); g.fillStyle = '#5a3905'; g.beginPath(); g.arc(x + 4, by + 6, 1.2, 0, TAU); g.arc(x + 4, by + bh - 6, 1.2, 0, TAU); g.fill(); }
  g.fillStyle = GOLD(g, c - bw / 2, c + bw / 2); g.fillRect(c - bw / 2 - 2, by - 3, bw + 4, 6); g.strokeStyle = INKB; g.lineWidth = 1.2; g.strokeRect(c - bw / 2 - 2, by - 3, bw + 4, 6);
  U.rr(g, c - 7, by + 7, 14, 15, 3); g.fillStyle = GOLD(g, c - 7, c + 7); g.fill(); g.stroke();
  g.fillStyle = '#1a0e04'; g.beginPath(); g.arc(c, by + 13, 2, 0, TAU); g.fill(); g.fillRect(c - 1, by + 13, 2, 5);
  for (let t = 0; t <= 12; t++) { const x = c - 32 + t * 5.4, y = by + 2 + Math.sin((t / 12) * Math.PI) * 10; g.fillStyle = '#f4efe4'; g.beginPath(); g.arc(x, y, 2.1, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,100,80,0.45)'; g.beginPath(); g.arc(x + 0.6, y + 0.7, 1.2, 0, TAU); g.fill(); }
  const r = U.rng(4);
  for (let k = 0; k < 7; k++) { const x = c - 50 + r() * 100, y = H - 3 - r() * 3; if (Math.abs(x - c) < bw / 2) continue; g.fillStyle = '#8a5a12'; g.beginPath(); g.ellipse(x, y, 4.5, 1.8, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd24d'; g.beginPath(); g.ellipse(x, y - 0.6, 3.6, 1.3, 0, 0, TAU); g.fill(); }
});

/** Black-and-gold ceremonial urn with a fret frieze and sun disc. */
const urnSprite = () => hd('je-urn', 110, 160, (g, W, H) => {
  const c = W / 2, base = plinth(g, c, H, 46, 26, '#d4283c');
  g.lineJoin = 'round'; g.lineCap = 'round';
  const body = () => {
    g.beginPath(); g.moveTo(c - 9, base); g.lineTo(c - 12, base - 6); g.bezierCurveTo(c - 33, base - 22, c - 31, base - 52, c - 14, base - 62);
    g.lineTo(c - 9, base - 72); g.lineTo(c - 13, base - 77); g.lineTo(c + 13, base - 77); g.lineTo(c + 9, base - 72); g.lineTo(c + 14, base - 62);
    g.bezierCurveTo(c + 31, base - 52, c + 33, base - 22, c + 12, base - 6); g.lineTo(c + 9, base); g.closePath();
  };
  for (const sx of [-1, 1]) { g.strokeStyle = INKB; g.lineWidth = 5.5; g.beginPath(); g.moveTo(c + sx * 10, base - 70); g.quadraticCurveTo(c + sx * 26, base - 74, c + sx * 21, base - 54); g.stroke(); g.strokeStyle = GOLD(g, c - 26, c + 26); g.lineWidth = 3; g.stroke(); }
  body(); g.fillStyle = U.lin(g, c - 31, 0, c + 31, 0, [[0, '#120a06'], [0.32, '#4a261a'], [0.5, '#6e3a24'], [1, '#100806']]); g.fill();
  g.save(); body(); g.clip();
  const band = (y, h) => { g.fillStyle = GOLD(g, c - 30, c + 30); g.fillRect(c - 34, y, 68, h); };
  band(base - 61, 3); band(base - 46, 2); band(base - 26, 2); band(base - 12, 3);
  g.strokeStyle = 'rgba(232,184,80,0.85)'; g.lineWidth = 1.4; g.beginPath();
  for (let x = c - 32; x < c + 32; x += 9) { const y = base - 29; g.moveTo(x, y); g.lineTo(x, y - 13); g.lineTo(x + 6, y - 13); g.lineTo(x + 6, y - 5); g.lineTo(x + 3, y - 5); g.lineTo(x + 3, y - 9); }
  g.stroke();
  g.fillStyle = 'rgba(255,240,200,0.18)'; g.beginPath(); g.ellipse(c - 13, base - 40, 4, 16, 0.15, 0, TAU); g.fill();
  g.restore();
  body(); g.strokeStyle = INKB; g.lineWidth = 1.6; g.stroke();
  g.beginPath(); g.arc(c, base - 54, 5, 0, TAU); g.fillStyle = GOLD(g, c - 5, c + 5); g.fill(); g.strokeStyle = INKB; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#1a0a04'; g.beginPath(); g.ellipse(c, base - 77, 12, 2.6, 0, 0, TAU); g.fill();
  for (const [x, y] of [[c - 26, base - 1.5], [c - 20, base - 1], [c + 22, base - 1.5]]) { g.fillStyle = '#8a5a12'; g.beginPath(); g.ellipse(x, y, 4.5, 1.8, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd24d'; g.beginPath(); g.ellipse(x, y - 0.6, 3.6, 1.3, 0, 0, TAU); g.fill(); }
});

/* Each treasure: sprite, size, glow colour and where its glint sparkles (relative to its floor point). */
const TREASURES = [
  { art: idolSprite, w: 110, h: 160, glow: '#ffcc4d', spark: [6, -108] },
  { art: maskSprite, w: 110, h: 160, glow: '#5fe3a0', spark: [-10, -100] },
  { art: chestSprite, w: 130, h: 112, glow: '#ffcc4d', spark: [12, -58] },
  { art: urnSprite, w: 110, h: 160, glow: '#ff9a4d', spark: [-14, -100] },
];

/* ---------- the boulder: a carved stone wheel with a guardian face ---------- */
const crackCache = {};
const boulderCracks = (R) => crackCache[R] || (crackCache[R] = (() => {
  const r = U.rng(R + 11), out = [];
  for (let k = 0; k < 9; k++) {
    let a = r() * TAU, d = R * (0.5 + r() * 0.25); const pts = [[Math.cos(a) * d, Math.sin(a) * d]];
    while (d < R) { a += (r() - 0.5) * 0.45; d += R * (0.07 + r() * 0.07); pts.push([Math.cos(a) * Math.min(d, R), Math.sin(a) * Math.min(d, R)]); }
    out.push(pts);
  }
  return out;
})());
const faceEyes = (g, k) => {
  g.beginPath();
  for (const sx of [-1, 1]) { g.moveTo(sx * 34 * k, -10 * k); g.quadraticCurveTo(sx * 20 * k, -25 * k, sx * 8 * k, -12 * k); g.quadraticCurveTo(sx * 20 * k, -3 * k, sx * 34 * k, -10 * k); }
};

const boulderSprite = (R) => hd('je-boulder2-' + R, R * 2 + 4, R * 2 + 4, (g, W) => {
  const c = W / 2, k = R / 124;
  g.save(); g.translate(c, c); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  g.fillStyle = g.createPattern(stoneTex(), 'repeat'); g.fillRect(-c, -c, W, W);
  g.fillStyle = 'rgba(52,40,22,0.35)'; g.fillRect(-c, -c, W, W);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const groove = (rad, lw) => {
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = lw; g.beginPath(); g.arc(1.5, 1.5, rad, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,236,190,0.16)'; g.lineWidth = 1.5; g.beginPath(); g.arc(-1, -1, rad, 0, TAU); g.stroke();
  };
  const glyphMark = (n) => {
    g.beginPath();
    if (n === 0) { g.moveTo(-1.6, 0); g.arc(-4, 0, 2.4, 0, TAU); g.moveTo(6.4, 0); g.arc(4, 0, 2.4, 0, TAU); }
    else if (n === 1) { g.moveTo(-6, -3); g.lineTo(6, -3); g.moveTo(-6, 3); g.lineTo(6, 3); }
    else { g.moveTo(-6, 4); g.lineTo(0, -4); g.lineTo(6, 4); }
  };
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * TAU, am = a0 + TAU / 32;
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(Math.cos(a0) * R * 0.8, Math.sin(a0) * R * 0.8); g.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); g.stroke();
    g.save(); g.rotate(am); g.translate(R * 0.9, 0); g.rotate(Math.PI / 2); g.scale(k * 1.2, k * 1.2);
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3.4; glyphMark(i % 3); g.stroke();
    g.strokeStyle = 'rgba(214,170,80,0.8)'; g.lineWidth = 1.8; glyphMark(i % 3); g.stroke();
    g.restore();
  }
  groove(R * 0.8, 6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU, sp = 0.2;
    g.beginPath(); g.moveTo(Math.cos(a - sp) * R * 0.57, Math.sin(a - sp) * R * 0.57); g.lineTo(Math.cos(a) * R * 0.77, Math.sin(a) * R * 0.77); g.lineTo(Math.cos(a + sp) * R * 0.57, Math.sin(a + sp) * R * 0.57); g.closePath();
    g.fillStyle = 'rgba(0,0,0,0.42)'; g.fill(); g.strokeStyle = 'rgba(255,236,190,0.14)'; g.lineWidth = 1.2; g.stroke();
  }
  groove(R * 0.55, 5);
  g.fillStyle = 'rgba(255,236,190,0.07)'; g.beginPath(); g.arc(0, 0, R * 0.52, 0, TAU); g.fill();
  const carve = (path) => { g.save(); g.translate(1.6, 1.6); path(); g.fillStyle = 'rgba(255,236,190,0.14)'; g.fill(); g.restore(); path(); g.fillStyle = 'rgba(8,5,2,0.78)'; g.fill(); };
  carve(() => faceEyes(g, k));
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 7 * k;
  g.beginPath(); g.moveTo(-40 * k, -30 * k); g.lineTo(-8 * k, -20 * k); g.moveTo(40 * k, -30 * k); g.lineTo(8 * k, -20 * k); g.stroke();
  carve(() => { g.beginPath(); g.moveTo(-6 * k, -8 * k); g.lineTo(6 * k, -8 * k); g.lineTo(11 * k, 10 * k); g.lineTo(-11 * k, 10 * k); g.closePath(); });
  carve(() => U.rr(g, -29 * k, 17 * k, 58 * k, 19 * k, 5 * k));
  g.fillStyle = 'rgba(196,184,146,0.55)';
  for (let i = 0; i < 6; i++) g.fillRect((-25 + i * 8.6) * k, 17 * k, 6 * k, 6 * k);
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 27 * k, 17 * k); g.lineTo(sx * 21 * k, 17 * k); g.lineTo(sx * 24 * k, 31 * k); g.closePath(); g.fill(); }
  for (const sx of [-1, 1]) carve(() => { g.beginPath(); g.arc(sx * 44 * k, 2 * k, 7 * k, 0, TAU); });
  g.strokeStyle = 'rgba(214,170,80,0.7)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R * 0.45, -2.55, -0.59); g.stroke();
  for (const pts of boulderCracks(R)) { g.beginPath(); pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 3.5; g.stroke(); }
  const r = U.rng(5);
  for (let i = 0; i < 30; i++) { const a = r() * TAU, d = R * (0.56 + r() * 0.42), s = 2 + r() * 5; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, TAU); g.fill(); }
  g.restore();
});

/** Ember light inside the cracks, eyes and mouth; drawn additively over the shaded stone. */
const boulderGlow = (R) => hd('je-boulder-glow-' + R, R * 2 + 4, R * 2 + 4, (g, W) => {
  const c = W / 2, k = R / 124;
  g.translate(c, c); g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = '#ff5a10'; g.shadowBlur = 24;
  for (const [col, lw] of [['#ff7a1a', 2.2], ['#ffd27a', 0.9]]) {
    g.strokeStyle = col; g.lineWidth = lw;
    for (const pts of boulderCracks(R)) { g.beginPath(); pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
  }
  g.shadowBlur = 32; faceEyes(g, k); g.fillStyle = '#ff6a14'; g.fill();
  g.shadowBlur = 0; g.fillStyle = '#fff1b8';
  g.beginPath(); for (const sx of [-1, 1]) { g.moveTo(sx * 21 * k + 4 * k, -12.5 * k); g.ellipse(sx * 21 * k, -12.5 * k, 4 * k, 2.6 * k, 0, 0, TAU); } g.fill();
  g.shadowBlur = 20; g.fillStyle = 'rgba(255,90,20,0.85)'; U.rr(g, -26 * k, 24 * k, 52 * k, 10 * k, 4 * k); g.fill();
});

/** Fern cluster for the foreground, lit along the top. */
const frondSprite = (v) => hd('je-frond2-' + v, 320, 200, (g, W, H) => {
  const r = U.rng(40 + v * 13);
  const n = 5 + v;
  for (let f = 0; f < n; f++) {
    const a = -Math.PI / 2 + (f - (n - 1) / 2) * 0.36 + (r() - 0.5) * 0.2, L = 120 + r() * 70;
    const bx = W / 2 + (r() - 0.5) * 30, by = H;
    const tx = bx + Math.cos(a) * L * 1.1, ty = by + Math.sin(a) * L * 0.8 + 30;
    const qx = bx + Math.cos(a) * L * 0.55, qy = by + Math.sin(a) * L * 0.95;
    g.strokeStyle = '#0b200d'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(qx, qy, tx, ty); g.stroke();
    const steps = 14;
    for (let k = 1; k < steps; k++) {
      const t = k / steps, it = 1 - t;
      const x = it * it * bx + 2 * it * t * qx + t * t * tx, y = it * it * by + 2 * it * t * qy + t * t * ty;
      const dx = 2 * it * (qx - bx) + 2 * t * (tx - qx), dy = 2 * it * (qy - by) + 2 * t * (ty - qy), ang = Math.atan2(dy, dx);
      const s = (1 - t * 0.75) * 15;
      const col = k % 2 ? '#1a4a1e' : '#123a17';
      leaf(g, x, y, s, ang - 1.05, col); leaf(g, x, y, s, ang + 1.05, col);
    }
  }
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = U.lin(g, 0, 0, 0, H, [[0, 'rgba(170,230,120,0.3)'], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
  g.fillRect(0, 0, W, H);
});

/** Split-leaf monstera clump for the foreground. */
const monsteraSprite = (v) => hd('je-monstera-' + v, 320, 250, (g, W, H) => {
  const r = U.rng(140 + v * 11);
  for (let n = 0; n < 3; n++) {
    const bx = W / 2 + (n - 1) * 46 + (r() - 0.5) * 20, a = -Math.PI / 2 + (n - 1) * 0.6 + (r() - 0.5) * 0.2, L = 110 + r() * 50;
    const tx = bx + Math.cos(a) * L, ty = H + Math.sin(a) * L, S = 46 + r() * 16;
    g.strokeStyle = '#0c2410'; g.lineWidth = 4.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, H); g.quadraticCurveTo(bx + Math.cos(a) * L * 0.3, H + Math.sin(a) * L * 0.7, tx, ty); g.stroke();
    const leafC = document.createElement('canvas'); leafC.width = leafC.height = Math.ceil(S * 3.6);
    const l = leafC.getContext('2d'), o = leafC.width / 2;
    l.translate(o, o + S * 0.8);
    const shape = () => { l.beginPath(); l.moveTo(0, 0); l.bezierCurveTo(-S * 1.0, -S * 0.05, -S * 0.95, -S * 1.35, 0, -S * 1.62); l.bezierCurveTo(S * 0.95, -S * 1.35, S * 1.0, -S * 0.05, 0, 0); };
    shape(); l.fillStyle = U.lin(l, -S, 0, S, 0, [[0, '#0f3014'], [0.48, '#245e2a'], [0.52, '#1a4a20'], [1, '#0d2a12']]); l.fill();
    l.fillStyle = U.lin(l, 0, -S * 1.6, 0, 0, [[0, 'rgba(180,240,140,0.28)'], [1, 'rgba(0,0,0,0)']]); l.fill();
    l.globalCompositeOperation = 'destination-out'; l.lineCap = 'round';
    for (const sd of [-1, 1]) for (let j = 0; j < 4; j++) {
      const yy = -S * (0.28 + j * 0.3);
      l.lineWidth = 3.4; l.beginPath(); l.moveTo(sd * S * 1.05, yy - S * 0.12); l.lineTo(sd * S * 0.32, yy); l.stroke();
      if (j < 3) { l.beginPath(); l.ellipse(sd * S * 0.18, yy - S * 0.16, S * 0.05, S * 0.09, 0, 0, TAU); l.fill(); }
    }
    l.globalCompositeOperation = 'source-over';
    l.strokeStyle = 'rgba(150,210,110,0.4)'; l.lineWidth = 1.6; l.beginPath(); l.moveTo(0, 0); l.lineTo(0, -S * 1.5); l.stroke();
    g.save(); g.translate(tx, ty); g.rotate(a + Math.PI / 2 + (r() - 0.5) * 0.4); g.drawImage(leafC, -o, -o - S * 0.8); g.restore();
  }
});

/** Leafy bush with blossoms, for the foot of the pillars. */
const bushSprite = (v) => hd('je-bush-' + v, 170, 96, (g, W, H) => {
  const r = U.rng(90 + v * 7);
  for (let k = 0; k < 24; k++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.7, len = 26 + r() * 42, bx = W / 2 + (r() - 0.5) * 44;
    const col = ['#1f4a22', '#2d6a2c', '#3f8a36', '#24572a'][k % 4];
    g.save(); g.translate(bx, H); g.rotate(a);
    g.fillStyle = U.lin(g, 0, -6, 0, 6, [[0, U.mixHex(col, '#c8f09a', 0.28)], [1, U.mixHex(col, '#000000', 0.4)]]);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -len * 0.24, len, 0); g.quadraticCurveTo(len * 0.5, len * 0.24, 0, 0); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 0); g.lineTo(len * 0.92, 0); g.stroke();
    g.restore();
  }
  for (let k = 0; k < 3 + v; k++) flower(g, W / 2 + (r() - 0.5) * 80, H - 22 - r() * 34, 4 + r() * 2, FLOWERS[(v + k) % 3]);
});

const drawBoulder = (ctx, x, y, R, ang, floorY, heat) => {
  const lift = U.clamp((floorY - R - y) / 300, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,' + (0.55 * (1 - lift)).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x, floorY + 4, R * (1 - lift * 0.5), 11, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); put(ctx, boulderSprite(R), -R - 2, -R - 2); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.clip();
  ctx.fillStyle = U.rad(ctx, x + R * 0.35, y - R * 0.45, R * 0.05, R * 1.3, [[0, 'rgba(255,226,170,0.26)'], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.8)']]);
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
  // ember light in the cracks, eyes and mouth turns with the stone and brightens with danger
  const h = U.clamp(heat, 0, 1);
  if (h > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = h;
    ctx.translate(x, y); ctx.rotate(ang); put(ctx, boulderGlow(R), -R - 2, -R - 2);
    ctx.restore();
    U.light(ctx, x, y, R * 1.6, '#ff6a1a', 0.14 * h);
  }
  ctx.strokeStyle = 'rgba(255,170,80,0.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R - 1.5, -0.95, 0.75); ctx.stroke();
};

export { leaf, motifPath, glyph, bannerSprite, guardianSprite, INKB, FLOWERS, GOLD, flower, gem, plinth, TREASURES, boulderSprite, boulderGlow, frondSprite, monsteraSprite, bushSprite, drawBoulder };
