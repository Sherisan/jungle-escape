/* Traps and obstacles. Purely visual: the crash point comes only from the provably fair result.
   Each trap is timed against the moment the runner reaches it (tau, seconds; negative once he has passed),
   so a blade is always vertical as he slides beneath it, at any speed. */
import { CG } from '../../engine/core.js';
import { U, TAU, clamp, lerp, smooth, hd, put, lin, rad, glow, fire, addPuff, tuft, fern, dab, bigLeaf, texFill, stoneTex, slateTex, sandTex, capsule, INK } from './kit.js';
import { flower, GOLD, gem, motifPath } from './relics.js';

export const TRAPS = {
  punji:      { act: 'jump',  h: 104, zone: 'ground' },
  log:        { act: 'slide' },
  fallen:     { act: 'vault', h: 124 },
  python:     { act: 'jump',  h: 138 },
  flytrap:    { act: 'slide' },
  blade:      { act: 'slide' },
  spikes:     { act: 'jump',  h: 108, zone: 'ground' },
  darts:      { act: 'slide', win: [0.8, -0.2] },
  crusher:    { act: 'dash' },
  stalactite: { act: 'dash' },
  flames:     { act: 'jump',  h: 122 },
  geyser:     { act: 'jump',  h: 116, zone: 'ground' },
};
export const TRAP_SETS = {
  jungle: ['punji', 'log', 'fallen', 'python', 'flytrap'],
  serpent: ['blade', 'spikes', 'darts', 'crusher', 'stalactite', 'python'],
  sun: ['blade', 'spikes', 'flames', 'crusher', 'geyser', 'darts'],
};
export const WINDOW = { jump: [0.36, 0.32], vault: [0.34, 0.3], slide: [0.5, 0.22], dash: [0.4, 0.3] };

/* ---------- pits ---------- */
const jagged = (seed, n) => { const r = U.rng(seed), a = []; for (let i = 0; i <= n; i++) a.push(r()); return a; };
const pitBody = (g, c, hw, d, seed, top, bottom) => {
  const j = jagged(seed, 22);
  g.beginPath(); g.moveTo(c - hw, 0);
  for (let i = 0; i <= 11; i++) { const t = i / 11; g.lineTo(c - hw + 9 * t + j[i] * 7, t * d); }
  for (let i = 0; i <= 11; i++) { const t = 1 - i / 11; g.lineTo(c + hw - 9 * t - j[i + 11] * 7 + 0, t * d); }
  g.closePath(); g.fillStyle = lin(g, 0, 0, 0, d, [[0, top], [1, bottom]]); g.fill();
};
/** Sharpened bamboo in a pit whose leaf cover has just caved in. */
const punjiSprite = () => hd('t-punji', 240, 124, (g, W) => {
  const c = W / 2, hw = 100, d = 112, r = U.rng(4);
  pitBody(g, c, hw, d, 77, '#0b0705', '#2a1a0e');
  g.strokeStyle = 'rgba(120,90,50,0.3)'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(c - hw + 12, 12 + i * 16); g.bezierCurveTo(c - 40, 6 + i * 16, c + 30, 22 + i * 16, c + hw - 12, 12 + i * 16); g.stroke(); }
  for (let i = 0; i < 10; i++) { // stakes, tips catching the light
    const x = c - 86 + i * 19 + (r() - 0.5) * 6, tipY = 18 + r() * 24, tilt = (r() - 0.5) * 0.2, wd = 6.5;
    g.save(); g.translate(x, d + 2); g.rotate(tilt);
    g.beginPath(); g.moveTo(-wd, 0); g.lineTo(-wd, tipY - d + 14); g.lineTo(wd, tipY - d - 8); g.lineTo(wd, 0); g.closePath();
    g.fillStyle = lin(g, -wd, 0, wd, 0, [[0, '#5e5220'], [0.4, '#e6d486'], [0.7, '#b39c44'], [1, '#524818']]); g.fill(); g.strokeStyle = '#120e04'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = 'rgba(40,30,8,0.75)'; g.lineWidth = 1.6; for (let y = -20; y > tipY - d + 22; y -= 24) { g.beginPath(); g.moveTo(-wd, y); g.lineTo(wd, y - 1); g.stroke(); }
    g.fillStyle = 'rgba(120,28,18,0.6)'; g.beginPath(); g.moveTo(-1, tipY - d + 8); g.lineTo(wd, tipY - d - 8); g.lineTo(wd - 1, tipY - d + 10); g.closePath(); g.fill();
    g.restore();
  }
  g.fillStyle = lin(g, 0, d - 30, 0, d, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]); g.fillRect(c - hw, d - 30, hw * 2, 30);
  for (const sd of [-1, 1]) { // lip of the pit with torn cover hanging in
    for (let i = 0; i < 16; i++) dab(g, c + sd * (hw - 2 - r() * 22), 1 + r() * 3, 10 + r() * 16, 3 + r() * 4, Math.PI / 2 + (r() - 0.5) * 1.4, ['#4f9a38', '#7a5a2a', '#3a7f2e'][i % 3]);
    g.strokeStyle = '#6a4a26'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(c + sd * hw, 1); g.lineTo(c + sd * (hw - 40 - r() * 20), 16 + r() * 16); g.stroke();
  }
});
/** Stone-lined pit with iron spikes and a glow from below, tinted per hall. */
const spikePitSprite = (tint, wall) => hd('t-spikepit' + tint, 240, 124, (g, W) => {
  const c = W / 2, hw = 100, d = 112, r = U.rng(21);
  pitBody(g, c, hw, d, 12, '#050403', wall);
  g.fillStyle = rad(g, c, d, 0, 150, [[0, U.rgba(tint, 0.8)], [1, U.rgba(tint, 0)]]); g.fillRect(c - hw, 0, hw * 2, d);
  for (let i = 0; i < 12; i++) {
    const x = c - 88 + i * 16, tip = 20 + (i % 2) * 18 + r() * 8, wd = 7.5;
    g.fillStyle = lin(g, x - wd, 0, x + wd, 0, [[0, '#26262c'], [0.45, '#d6dde5'], [0.58, '#80878f'], [1, '#17171c']]);
    g.beginPath(); g.moveTo(x - wd, d + 2); g.lineTo(x, tip); g.lineTo(x + wd, d + 2); g.closePath(); g.fill(); g.strokeStyle = '#08070a'; g.lineWidth = 1.1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.moveTo(x - 1, tip + 7); g.lineTo(x, tip); g.lineTo(x + 0.4, tip + 7); g.closePath(); g.fill();
  }
  // a warning skull among the spikes
  g.fillStyle = '#d8d0b4'; g.beginPath(); g.arc(c + 12, d - 14, 11, Math.PI * 0.95, Math.PI * 0.05); g.lineTo(c + 19, d - 2); g.lineTo(c + 5, d - 2); g.closePath(); g.fill();
  g.fillStyle = '#17120a'; g.beginPath(); g.arc(c + 8, d - 13, 3, 0, TAU); g.arc(c + 16, d - 13, 3, 0, TAU); g.fill();
  for (const sd of [-1, 1]) { g.fillStyle = lin(g, 0, -2, 0, 16, [[0, '#b0a882'], [1, '#3a382a']]); g.beginPath(); g.moveTo(c + sd * hw, -2); g.lineTo(c + sd * (hw + 12), -2); g.lineTo(c + sd * (hw + 6), 10); g.lineTo(c + sd * (hw - 10), d); g.closePath(); g.fill(); }
});

/* ---------- things that swing ---------- */
/** Spiked log on ropes, seen end on: bark, growth rings and iron nails. */
const logSprite = () => hd('t-log', 220, 220, (g, W) => {
  const c = W / 2, R = 56, r = U.rng(9);
  for (let i = 0; i < 12; i++) {
    g.save(); g.translate(c, c); g.rotate((i / 12) * TAU);
    g.beginPath(); g.moveTo(-9, -R + 6); g.lineTo(0, -R - 38); g.lineTo(9, -R + 6); g.closePath();
    g.fillStyle = lin(g, -9, 0, 9, 0, [[0, '#26262c'], [0.45, '#d0d7df'], [1, '#1b1b20']]); g.fill(); g.strokeStyle = '#08070a'; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = 'rgba(120,30,20,0.55)'; g.beginPath(); g.moveTo(-2, -R - 18); g.lineTo(0, -R - 38); g.lineTo(5, -R - 14); g.closePath(); g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = rad(g, c - 18, c - 22, 6, R * 1.25, [[0, '#a07a4e'], [0.55, '#5a3d22'], [1, '#22140a']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
  g.beginPath(); g.arc(c, c, R - 11, 0, TAU); g.fillStyle = rad(g, c - 8, c - 10, 2, R, [[0, '#e0bc84'], [0.7, '#b48a56'], [1, '#7a5a34']]); g.fill();
  g.strokeStyle = 'rgba(80,50,22,0.65)'; g.lineWidth = 1.5; for (let k = 1; k <= 5; k++) { g.beginPath(); for (let a = 0; a <= TAU + 0.1; a += 0.3) { const R2 = (R - 11) * (k / 6) * (1 + Math.sin(a * 3 + k) * 0.04); (a ? g.lineTo(c + Math.cos(a) * R2, c + Math.sin(a) * R2) : g.moveTo(c + Math.cos(a) * R2, c + Math.sin(a) * R2)); } g.stroke(); }
  g.strokeStyle = 'rgba(30,18,8,0.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + 22, c - 30); g.moveTo(c, c); g.lineTo(c - 26, c + 16); g.stroke();
  for (let i = 0; i < 26; i++) { const a = r() * TAU; dab(g, c + Math.cos(a) * (R - 4), c + Math.sin(a) * (R - 4), 6 + r() * 7, 2.6 + r() * 2.6, a + Math.PI / 2, ['#4d8f34', '#6fae3f'][i % 2]); }
});
const rope = (ctx, x0, y0, x1, y1) => {
  ctx.lineCap = 'round'; ctx.strokeStyle = '#2a1c0c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = '#b89a62'; ctx.lineWidth = 3.4; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
};
const SWING = 3.3; // radians per second of pendulum phase
const drawLog = (ctx, x, floorY, tau, ext) => {
  const py = -ext - 40, cy = floorY - 186, len = cy - py, a = 0.62 * Math.sin(tau * SWING), lx = x + Math.sin(a) * len, ly = py + Math.cos(a) * len;
  rope(ctx, x - 26, py, lx - 12, ly - 44); rope(ctx, x + 26, py, lx + 12, ly - 44);
  // a smear of the swing behind it
  ctx.save(); ctx.globalAlpha = 0.14; for (let i = 1; i <= 2; i++) { const b = 0.62 * Math.sin((tau + i * 0.03) * SWING); ctx.save(); ctx.translate(x + Math.sin(b) * len, py + Math.cos(b) * len); ctx.rotate(-b * 1.6); put(ctx, logSprite(), -110, -110); ctx.restore(); } ctx.restore();
  ctx.save(); ctx.translate(lx, ly); ctx.rotate(-a * 1.6); put(ctx, logSprite(), -110, -110); ctx.restore();
};

/* Crescent axe on an iron rod; drawn pointing straight down from its pivot. */
const bladeSprite = () => hd('t-blade', 170, 92, (g, W) => {
  const c = W / 2, shape = () => { g.beginPath(); g.moveTo(5, 8); g.quadraticCurveTo(c, 148, W - 5, 8); g.quadraticCurveTo(c, 52, 5, 8); g.closePath(); };
  shape(); g.fillStyle = lin(g, 0, 8, W, 84, [[0, '#6a5a3a'], [0.4, '#f3e9c8'], [0.6, '#a68c54'], [1, '#3a2c14']]); g.fill(); g.strokeStyle = '#08080c'; g.lineWidth = 2; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2; g.beginPath(); g.moveTo(11, 14); g.quadraticCurveTo(c, 140, W - 11, 14); g.stroke();
  g.strokeStyle = 'rgba(120,30,20,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(c - 42, 49); g.quadraticCurveTo(c, 86, c + 26, 56); g.stroke();
  g.strokeStyle = '#e8b850'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(30, 28); g.quadraticCurveTo(c, 92, W - 30, 28); g.stroke();
  g.beginPath(); g.arc(c, 36, 14, 0, TAU); g.fillStyle = GOLD(g, c - 14, c + 14); g.fill(); g.strokeStyle = '#08080c'; g.lineWidth = 1.8; g.stroke();
  gem(g, c, 36, 7, '#e0283c');
});
const drawBlade = (ctx, x, pivotY, floorY, tau, T) => {
  const len = floorY - 118 - 57 - pivotY, sw = (t) => 0.8 * Math.sin(t * SWING), a = sw(tau);
  ctx.fillStyle = lin(ctx, x - 22, 0, x + 22, 0, [[0, '#17171b'], [0.5, '#6a6a72'], [1, '#101014']]); U.rr(ctx, x - 22, pivotY - 10, 44, 18, 3); ctx.fill();
  // additive trail hugging the arc of the swing
  ctx.save(); ctx.translate(x, pivotY); ctx.globalCompositeOperation = 'lighter';
  const a1 = sw(tau + 0.1), R0 = len + 40;
  ctx.strokeStyle = 'rgba(255,240,205,0.2)'; ctx.lineWidth = 30; ctx.beginPath(); ctx.arc(0, 0, R0, Math.PI / 2 - Math.max(a, a1), Math.PI / 2 - Math.min(a, a1)); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.translate(x, pivotY); ctx.rotate(-a);
  ctx.fillStyle = lin(ctx, -3.5, 0, 3.5, 0, [[0, '#23232a'], [0.5, '#9a9aa4'], [1, '#17171c']]); ctx.fillRect(-3.2, 0, 6.4, len);
  ctx.fillStyle = '#c9a24a'; ctx.fillRect(-5, len * 0.55, 10, 3.5); ctx.fillRect(-5, len * 0.25, 10, 3.5);
  put(ctx, bladeSprite(), -85, len - 12);
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, pivotY, 8, 0, TAU); ctx.fillStyle = '#c9a24a'; ctx.fill(); ctx.strokeStyle = '#100a04'; ctx.lineWidth = 1.8; ctx.stroke();
};

/* ---------- the great fallen tree ---------- */
const fallenSprite = () => hd('t-fallen', 250, 140, (g, W, H) => {
  const c = W / 2, R = 60, cy = H - R + 8, r = U.rng(33);
  // the rest of the trunk running back into the jungle
  g.fillStyle = lin(g, 0, cy - R, 0, cy + R, [[0, '#6a4e32'], [1, '#1c120a']]); g.beginPath(); g.ellipse(c + 36, cy - 4, R + 40, R - 2, -0.06, 0, TAU); g.fill();
  for (let i = 0; i < 70; i++) dab(g, c - 40 + r() * 170, cy - R + r() * 26, 9 + r() * 12, 3 + r() * 4, r() * TAU, ['#4d8f34', '#6fae3f', '#37702a', '#8ac34a'][i % 4]);
  g.beginPath(); g.arc(c, cy, R, 0, TAU); g.fillStyle = rad(g, c - 20, cy - 24, 6, R * 1.25, [[0, '#6a4e32'], [1, '#22140a']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
  g.beginPath(); g.arc(c, cy, R - 10, 0, TAU); g.fillStyle = rad(g, c - 10, cy - 12, 2, R, [[0, '#ecca92'], [0.7, '#c09660'], [1, '#86603a']]); g.fill();
  g.strokeStyle = 'rgba(90,58,26,0.6)'; g.lineWidth = 1.5; for (let k = 1; k <= 6; k++) { g.beginPath(); g.arc(c + (k % 2) * 1.5, cy, (R - 10) * (k / 7), 0, TAU); g.stroke(); }
  g.strokeStyle = 'rgba(30,18,8,0.8)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(c, cy); g.lineTo(c - 30, cy - 34); g.moveTo(c + 6, cy + 4); g.lineTo(c + 40, cy + 22); g.stroke();
  for (let i = 0; i < 40; i++) { const a = -Math.PI * r(); dab(g, c + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), 9 + r() * 11, 3 + r() * 4, a + Math.PI / 2 + (r() - 0.5), ['#4d8f34', '#6fae3f', '#8ac34a'][i % 3]); }
  fern(g, c - R + 2, H - 4, 62, -2.5, '#2a8040', '#6abf52', r, 0.4, 1); fern(g, c + R - 6, H - 2, 60, -0.7, '#2a8040', '#6abf52', r, 0.4, 1);
  for (let i = 0; i < 6; i++) { const x = c - 56 + r() * 112, y = H - 4; g.fillStyle = '#efe3c2'; g.fillRect(x - 1.2, y - 8, 2.4, 9); g.fillStyle = '#d8452c'; g.beginPath(); g.ellipse(x, y - 9, 6, 4, 0, Math.PI, TAU); g.fill(); }
});

/* ---------- snakes ---------- */
const coilSprite = () => hd('t-coil', 150, 72, (g, W, H) => {
  g.lineJoin = 'round';
  for (let i = 2; i >= 0; i--) {
    const rx = 62 - i * 11, y = H - 13 - i * 15, ry = 12;
    g.beginPath(); g.ellipse(W / 2, y, rx, ry, 0, 0, TAU); g.fillStyle = lin(g, 0, y - ry, 0, y + ry, [[0, '#6fce70'], [0.5, '#2c7a38'], [1, '#0f3418']]); g.fill(); g.strokeStyle = '#08140a'; g.lineWidth = 2.2; g.stroke();
    for (let k = -3; k <= 3; k++) { const px = W / 2 + k * rx * 0.28; g.fillStyle = '#e8c25a'; g.beginPath(); g.moveTo(px - 7, y - 3); g.lineTo(px, y - 8); g.lineTo(px + 7, y - 3); g.lineTo(px, y + 2); g.closePath(); g.fill(); g.strokeStyle = '#3a2a08'; g.lineWidth = 0.8; g.stroke(); }
  }
});
const snakeHead = (open) => hd('t-snakehead' + open, 110, 88, (g, W, H) => {
  const cx = 62, cy = 40; g.lineJoin = 'round';
  // hood flaring behind the head, spectacle mark on it
  g.beginPath(); g.moveTo(cx + 6, cy + 42); g.bezierCurveTo(cx - 32, cy + 30, cx - 26, cy - 22, cx + 8, cy - 12); g.bezierCurveTo(cx + 44, cy - 24, cx + 50, cy + 28, cx + 6, cy + 42); g.closePath();
  g.fillStyle = lin(g, cx - 26, 0, cx + 46, 0, [[0, '#1c5a2c'], [0.5, '#4aa856'], [1, '#17492a']]); g.fill(); g.strokeStyle = '#08140a'; g.lineWidth = 2.4; g.stroke();
  g.strokeStyle = '#f0ca62'; g.lineWidth = 3; g.beginPath(); g.arc(cx - 2, cy + 12, 6.5, 0, TAU); g.moveTo(cx + 26, cy + 12); g.arc(cx + 19, cy + 12, 6.5, 0, TAU); g.stroke();
  g.strokeStyle = '#f0ca62'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(cx + 4, cy + 12); g.quadraticCurveTo(cx + 9, cy + 7, cx + 13, cy + 12); g.stroke();
  // head and jaw, facing the oncoming runner
  if (open) { g.beginPath(); g.moveTo(cx + 2, cy + 2); g.lineTo(cx - 46, cy + 18); g.quadraticCurveTo(cx - 30, cy + 26, cx - 2, cy + 14); g.closePath(); g.fillStyle = '#2f7a3a'; g.fill(); g.strokeStyle = '#08140a'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(cx - 2, cy + 1); g.lineTo(cx - 40, cy + 15); g.lineTo(cx - 40, cy + 2); g.closePath(); g.fillStyle = '#b02a3a'; g.fill(); }
  g.beginPath(); g.moveTo(cx + 12, cy - 16); g.bezierCurveTo(cx - 12, cy - 22, cx - 42, cy - 16, cx - 52, cy - 3); g.quadraticCurveTo(cx - 40, cy + 4, cx - 10, cy + 3); g.quadraticCurveTo(cx + 8, cy + 2, cx + 12, cy - 16); g.closePath();
  g.fillStyle = lin(g, 0, cy - 22, 0, cy + 4, [[0, '#7ad87c'], [1, '#2a7236']]); g.fill(); g.strokeStyle = '#08140a'; g.lineWidth = 2.2; g.stroke();
  g.fillStyle = '#ff3a2a'; g.beginPath(); g.ellipse(cx - 18, cy - 11, 4.6, 3.2, -0.2, 0, TAU); g.fill(); g.fillStyle = '#120404'; g.beginPath(); g.ellipse(cx - 18, cy - 11, 1.2, 3, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - 19.6, cy - 12.4, 1, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(8,20,10,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx - 44, cy - 7, 1, 0, TAU); g.stroke();
  if (open) { g.fillStyle = '#fff6e0'; g.beginPath(); g.moveTo(cx - 44, cy - 3); g.lineTo(cx - 40, cy + 12); g.lineTo(cx - 36, cy - 2); g.moveTo(cx - 28, cy + 1); g.lineTo(cx - 25, cy + 12); g.lineTo(cx - 22, cy + 2); g.fill(); }
});
const drawPython = (ctx, x, floorY, T, strike) => {
  put(ctx, coilSprite(), x - 67, floorY - 70);
  const sw = Math.sin(T * 3.4) * 5 * (1 - strike), hx = x - 22 - strike * 72 + sw, hy = floorY - 124 + strike * 16 + Math.cos(T * 3.4) * 2;
  const body = () => { ctx.beginPath(); ctx.moveTo(x + 12, floorY - 40); ctx.bezierCurveTo(x + 44, floorY - 92, x + 2 - strike * 18, floorY - 96, hx + 16, hy + 24); };
  ctx.lineCap = 'round';
  body(); ctx.strokeStyle = '#08140a'; ctx.lineWidth = 25; ctx.stroke();
  body(); ctx.strokeStyle = '#37883f'; ctx.lineWidth = 20; ctx.stroke();
  ctx.setLineDash([4, 12]); body(); ctx.strokeStyle = '#e8c25a'; ctx.lineWidth = 11; ctx.stroke(); ctx.setLineDash([]);
  put(ctx, snakeHead(strike > 0.3 ? 1 : 0), hx - 62, hy - 40);
  if (Math.sin(T * 7) > 0.2 || strike > 0.1) { ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(hx - 52, hy - 4); ctx.lineTo(hx - 64, hy - 4); ctx.lineTo(hx - 70, hy - 9); ctx.moveTo(hx - 64, hy - 4); ctx.lineTo(hx - 70, hy + 1); ctx.stroke(); }
  glow(ctx, hx - 18, hy - 11, 18, '#ff3a2a', 0.45);
};

/* ---------- carnivorous plant ---------- */
const jawSprite = () => hd('t-jaw', 124, 74, (g, W, H) => {
  // one half of the trap, hinge at the right, teeth along the lip
  const path = () => { g.beginPath(); g.moveTo(W - 6, H - 6); g.bezierCurveTo(W - 44, 2, 40, 0, 10, H - 18); g.lineTo(W - 6, H - 6); g.closePath(); };
  for (let i = 0; i < 9; i++) { const x = 18 + i * 10.5, y = H - 18 + i * 1.2; g.beginPath(); g.moveTo(x - 3, y - 2); g.lineTo(x, y + 13); g.lineTo(x + 3, y - 2); g.closePath(); g.fillStyle = '#f6efdc'; g.fill(); g.strokeStyle = '#3a2a18'; g.lineWidth = 0.9; g.stroke(); }
  path(); g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#8ad25a'], [0.6, '#3f9a44'], [1, '#b02a4a']]); g.fill(); g.strokeStyle = '#0a2010'; g.lineWidth = 2.2; g.stroke();
  g.strokeStyle = 'rgba(10,40,20,0.5)'; g.lineWidth = 1.3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(W - 8, H - 8); g.quadraticCurveTo(W - 40 - i * 8, 18 - i, 24 + i * 12, H - 22 + i * 2); g.stroke(); }
  g.fillStyle = 'rgba(255,255,220,0.5)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(30 + i * 12, 20 - Math.sin(i) * 4, 2, 0, TAU); g.fill(); }
});
const flytrapBase = () => hd('t-flybase', 180, 90, (g, W, H) => {
  const r = U.rng(61);
  for (let i = 0; i < 8; i++) bigLeaf(g, W / 2 + (r() - 0.5) * 30, H, 60 + r() * 34, 14 + r() * 8, -Math.PI / 2 + (r() - 0.5) * 2.6, '#9ad858', '#3c9a44', '#14562e', 0);
});
const drawFlytrap = (ctx, x, floorY, T, snap) => {
  const sway = Math.sin(T * 2.2) * 5 * (1 - snap), hx = x + sway - snap * 22, hy = floorY - 176 + snap * 12;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0a2010'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(x, floorY); ctx.quadraticCurveTo(x + 20, floorY - 70, hx + 34, hy + 18); ctx.stroke();
  ctx.strokeStyle = '#4f9a38'; ctx.lineWidth = 10.5; ctx.stroke();
  const open = lerp(0.72, 0.03, snap);
  const jaw = (sgn) => { ctx.save(); ctx.translate(hx + 48, hy + 20); ctx.scale(1, sgn); ctx.rotate(open); ctx.drawImage(jawSprite(), -118, -68, 124, 74); ctx.restore(); };
  // the mouth glows faintly inside
  if (open > 0.1) glow(ctx, hx - 16, hy + 20, 46, '#ff4a7a', 0.3 * open);
  jaw(1); jaw(-1);
  put(ctx, flytrapBase(), x - 90, floorY - 88);
};

/* ---------- crushing weight ---------- */
const crusherSprite = () => hd('t-crusher', 190, 172, (g, W, H) => {
  g.save(); U.rr(g, 8, 0, W - 16, H - 28, 6); g.clip(); texFill(g, stoneTex(), 0, 0, W, H); g.fillStyle = lin(g, 8, 0, W - 8, 0, [[0, 'rgba(255,236,190,0.12)'], [0.5, 'rgba(0,0,0,0.02)'], [1, 'rgba(0,0,0,0.66)']]); g.fillRect(0, 0, W, H); g.restore();
  U.rr(g, 8, 0, W - 16, H - 28, 6); g.strokeStyle = '#100c06'; g.lineWidth = 2.6; g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2.5; g.strokeRect(22, 12, W - 44, H - 54);
  const c = W / 2; g.lineCap = 'round'; g.lineJoin = 'round';
  // a scowling face cut into the block
  g.fillStyle = 'rgba(6,4,2,0.88)';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(c + s * 52, 56); g.quadraticCurveTo(c + s * 30, 38, c + s * 12, 58); g.quadraticCurveTo(c + s * 32, 72, c + s * 52, 56); g.fill(); }
  g.strokeStyle = '#c9a24a'; g.lineWidth = 5; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(c + s * 60, 40); g.lineTo(c + s * 10, 54); g.stroke(); }
  g.fillStyle = 'rgba(6,4,2,0.7)'; g.beginPath(); g.moveTo(c - 7, 62); g.lineTo(c + 7, 62); g.lineTo(c + 12, 86); g.lineTo(c - 12, 86); g.closePath(); g.fill();
  U.rr(g, c - 46, 98, 92, 30, 6); g.fillStyle = 'rgba(6,4,2,0.85)'; g.fill();
  g.fillStyle = '#c9c0a0'; for (let i = 0; i < 8; i++) g.fillRect(c - 42 + i * 11, 98, 9, 10);
  for (let i = 0; i < 8; i++) { const x = 18 + i * 22; g.fillStyle = lin(g, x - 10, 0, x + 10, 0, [[0, '#26262c'], [0.45, '#c6cdd5'], [1, '#17171c']]); g.beginPath(); g.moveTo(x - 10, H - 30); g.lineTo(x, H - 1); g.lineTo(x + 10, H - 30); g.closePath(); g.fill(); g.strokeStyle = '#08070a'; g.lineWidth = 1.1; g.stroke(); }
});
const drawCrusher = (ctx, x, y, topY, eyeA) => {
  for (const sx of [-58, 58]) {
    ctx.strokeStyle = '#17171b'; ctx.lineWidth = 8; ctx.setLineDash([10, 5]); ctx.beginPath(); ctx.moveTo(x + sx, topY); ctx.lineTo(x + sx, y + 4); ctx.stroke();
    ctx.strokeStyle = '#7a7a84'; ctx.lineWidth = 3.4; ctx.stroke(); ctx.setLineDash([]);
  }
  put(ctx, crusherSprite(), x - 95, y);
  for (const s of [-1, 1]) { ctx.fillStyle = U.rgba('#ffb08a', eyeA); ctx.beginPath(); ctx.ellipse(x + s * 31, y + 56, 8, 3.6, 0, 0, TAU); ctx.fill(); glow(ctx, x + s * 31, y + 56, 28, '#ff3a1a', eyeA * 0.7); }
};

/* ---------- falling rock ---------- */
const stalactiteSprite = () => hd('t-stal', 120, 260, (g, W, H) => {
  const c = W / 2, pal = ['#0a1c20', '#1f4a4c', '#4a8a80'];
  const body = () => { g.beginPath(); g.moveTo(c - 46, 0); g.bezierCurveTo(c - 40, 90, c - 14, 180, c + 2, H - 4); g.bezierCurveTo(c + 16, 180, c + 42, 90, c + 46, 0); g.closePath(); };
  body(); g.fillStyle = lin(g, c - 46, 0, c + 46, 0, [[0, pal[2]], [0.45, pal[1]], [1, pal[0]]]); g.fill(); g.strokeStyle = '#020608'; g.lineWidth = 2.2; g.stroke();
  g.save(); body(); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; for (let y = 14; y < H; y += 26) { g.beginPath(); g.moveTo(c - 46, y); g.quadraticCurveTo(c, y + 10, c + 46, y - 2); g.stroke(); } g.fillStyle = 'rgba(200,255,235,0.3)'; g.fillRect(c - 22, 0, 6, H); g.restore();
});

/* ---------- darts ---------- */
const launcherSprite = () => hd('t-launcher', 100, 86, (g) => {
  g.fillStyle = 'rgba(0,0,0,0.42)'; U.rr(g, 2, 2, 96, 82, 8); g.fill();
  const body = lin(g, 0, 8, 0, 80, [[0, '#a29a78'], [0.6, '#6e6850'], [1, '#34322a']]);
  g.beginPath(); g.moveTo(90, 18); g.quadraticCurveTo(52, 4, 32, 18); g.lineTo(9, 32); g.lineTo(36, 41); g.lineTo(12, 50); g.lineTo(34, 64); g.quadraticCurveTo(58, 80, 92, 68); g.closePath(); g.fillStyle = body; g.fill(); g.strokeStyle = '#120f08'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#080604'; g.beginPath(); g.moveTo(12, 33); g.lineTo(40, 41); g.lineTo(14, 49); g.closePath(); g.fill();
  g.fillStyle = '#ff4a1a'; g.beginPath(); g.arc(56, 27, 4.2, 0, TAU); g.fill();
  g.strokeStyle = '#c9a24a'; g.lineWidth = 1.7; for (const x of [66, 75, 84]) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 66); g.stroke(); }
});
export const drawDart = (ctx, d) => {
  ctx.save(); ctx.translate(d.x, d.y);
  ctx.strokeStyle = 'rgba(255,240,205,0.4)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(110, 0); ctx.stroke();
  ctx.fillStyle = '#3a2412'; ctx.fillRect(-2, -1.6, 34, 3.2);
  ctx.fillStyle = '#e4e9ef'; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d8452c'; ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(39, -8); ctx.lineTo(35, 0); ctx.lineTo(39, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
};

/* ---------- fire ---------- */
const grateSprite = () => hd('t-grate', 150, 26, (g, W) => {
  g.fillStyle = lin(g, 0, 0, 0, 26, [[0, '#6a6a72'], [1, '#121216']]); U.rr(g, 2, 3, W - 4, 20, 3); g.fill(); g.strokeStyle = '#08080a'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#050505'; for (let k = 0; k < 8; k++) g.fillRect(12 + k * 17, 7, 9, 13);
  g.fillStyle = 'rgba(255,120,40,0.75)'; for (let k = 0; k < 8; k++) g.fillRect(14 + k * 17, 8, 5, 4);
});
const crackSprite = () => hd('t-crack', 240, 40, (g, W) => {
  g.fillStyle = '#0a0300'; g.beginPath(); g.moveTo(10, 8); g.lineTo(60, 2); g.lineTo(100, 12); g.lineTo(150, 0); g.lineTo(200, 10); g.lineTo(232, 6); g.lineTo(190, 30); g.lineTo(140, 24); g.lineTo(90, 36); g.lineTo(40, 24); g.closePath(); g.fill();
  g.strokeStyle = '#ff7a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 16); g.lineTo(90, 22); g.lineTo(140, 14); g.lineTo(190, 18); g.stroke();
  g.strokeStyle = '#ffe9a8'; g.lineWidth = 1.2; g.stroke();
});
const drawVents = (ctx, x, floorY, T, burst, seed) => {
  for (const sx of [-44, 44]) {
    const px = x + sx, ht = 26 + Math.sin(T * 9 + sx) * 6 + burst * 300, wd = 16 + burst * 20;
    glow(ctx, px, floorY - ht * 0.5, 60 + ht * 0.8, '#ff7a1a', 0.18 + burst * 0.42);
    fire(ctx, px, floorY - 2, wd, ht, T, seed + sx, '#ffb43a', '#ff4a12');
    put(ctx, grateSprite(), px - 75 * 0.56, floorY - 8, 0.56);
  }
};
const drawGeyser = (ctx, x, floorY, T, burst, seed) => {
  put(ctx, crackSprite(), x - 120, floorY - 6);
  const ht = 14 + Math.sin(T * 7) * 4 + burst * 330, wd = 26 + burst * 36;
  glow(ctx, x, floorY - ht * 0.5, 80 + ht * 0.9, '#ff6a14', 0.26 + burst * 0.5);
  fire(ctx, x, floorY, wd, ht, T, seed, '#ffcf5a', '#ff3a0a');
  if (burst > 0.2) for (let i = 0; i < 9; i++) { const a = T * 3 + i * 0.7, r = burst * (40 + i * 10), px = x + Math.sin(a * 2 + i) * r * 0.6, py = floorY - U.wrap(T * 480 + i * 40, ht * 1.05); ctx.fillStyle = i % 2 ? '#ffd27a' : '#ff6a14'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); ctx.fill(); }
};

/* ---------- per-frame behaviour ---------- */
const clampStrike = (tau, near, far) => clamp((near - tau) / (near - far), 0, 1);

/** Everything a trap does at its moment: sounds, dust, shakes. `api` gives once / sfx / puff / shake. */
export const trapEvents = (t, tau, api, sp) => {
  const k = t.kind, id = t.j;
  if (k === 'punji' && tau < 0.14 && api.once(id, 'x')) { api.sfx('spikes'); api.leaves(t.x, 12); }
  if (k === 'spikes' && tau < 0.14 && api.once(id, 'x')) api.sfx('spikes');
  if (k === 'python' && tau < 0.55 && api.once(id, 'x')) api.sfx('hiss');
  if (k === 'flytrap' && tau < 0.26 && api.once(id, 'x')) api.sfx('snap');
  if ((k === 'blade' || k === 'log') && Math.abs(tau) < 0.15 && api.once(id, 'x')) api.sfx('blade');
  if ((k === 'flames') && tau < -0.03 && api.once(id, 'burst')) { api.sfx('fire'); api.mark(id, 'burst'); }
  if (k === 'geyser' && tau < 0.02 && api.once(id, 'burst')) { api.sfx('fire'); api.puff(t.x, 14, 34); api.mark(id, 'burst'); api.shake(6); }
  if (k === 'darts' && tau < 0.72 && api.once(id, 'x')) {
    api.sfx('dart');
    for (let n = 0; n < 3; n++) api.dart(t.x - 34 + n * 74, -152 + [-8, 18, -24][n], sp);
  }
  if (k === 'crusher' && tau < -0.2 && api.once(id, 'slam')) api.mark(id, 'slam');
  if (k === 'crusher' && api.since(id, 'slam') >= 0.11 && api.once(id, 'hit')) { api.shake(14); api.sfx('crusher'); api.puff(t.x, 26, 42); }
  if (k === 'stalactite' && tau < 0.24 && api.once(id, 'drop')) { api.mark(id, 'drop'); api.sfx('crack'); }
  if (k === 'stalactite' && api.since(id, 'drop') >= 0.32 && api.once(id, 'hit')) { api.shake(9); api.sfx('crusher'); api.puff(t.x, 22, 34); api.shards(t.x); }
  if (k === 'fallen' && tau < 0.05 && api.once(id, 'x')) api.sfx('vault');
};

/** Drawn behind the runner. */
export const drawTrapBack = (ctx, t, E) => {
  const { x, tau } = t, { floorY, T, betting, tint } = E;
  if (t.kind === 'punji') put(ctx, punjiSprite(), x - 120, floorY - 1);
  else if (t.kind === 'spikes') {
    put(ctx, spikePitSprite(tint, E.pitWall), x - 120, floorY - 1);
    glow(ctx, x, floorY + 70, 110, tint, 0.26 + 0.08 * Math.sin(T * 5));
  }
  else if (t.kind === 'fallen') put(ctx, fallenSprite(), x - 125, floorY - 132);
  else if (t.kind === 'python') drawPython(ctx, x, floorY, T, !betting && tau > -0.34 ? clampStrike(tau, 0.46, 0.2) : 0);
  else if (t.kind === 'flytrap') drawFlytrap(ctx, x, floorY, T, !betting && tau > -0.5 ? clampStrike(tau, 0.28, 0.1) : 0);
  else if (t.kind === 'darts') put(ctx, launcherSprite(), x - 50, floorY - 190);
  else if (t.kind === 'flames') { const t0 = E.firedAt(t.j, 'burst'), a = t0 == null ? 99 : T - t0; drawVents(ctx, x, floorY, T, a < 0.1 ? a / 0.1 : Math.max(0, 1 - (a - 0.1) / 0.7), t.j); }
  else if (t.kind === 'geyser') { const t0 = E.firedAt(t.j, 'burst'), a = t0 == null ? 99 : T - t0; drawGeyser(ctx, x, floorY, T, a < 0.1 ? a / 0.1 : Math.max(0, 1 - (a - 0.1) / 0.85), t.j); }
};

/** Drawn in front of the runner. */
export const drawTrapFront = (ctx, t, E) => {
  const { x, tau } = t, { floorY, T, ext } = E;
  if (t.kind === 'log') drawLog(ctx, x, floorY, tau, ext);
  else if (t.kind === 'blade') drawBlade(ctx, x, 40, floorY, tau, T);
  else if (t.kind === 'crusher') {
    const rest = floorY - 168, up = rest - 250, t0 = E.firedAt(t.j, 'slam');
    let y = up + (t0 == null && tau < 1 ? Math.sin(T * 34) * 1.6 : 0);
    if (t0 != null) { const a = T - t0; y = a < 0.11 ? lerp(up, rest, (a / 0.11) * (a / 0.11)) : a < 0.6 ? rest : lerp(rest, up, smooth((a - 0.6) / 1.4)); }
    drawCrusher(ctx, x, y, -ext, 0.5 + 0.3 * Math.sin(T * 5));
  }
  else if (t.kind === 'stalactite') {
    const t0 = E.firedAt(t.j, 'drop');
    if (t0 != null && T - t0 >= 0.32) return; // shattered
    const a = t0 == null ? 0 : T - t0, y = 34 + (t0 == null ? 0 : 0.5 * 2800 * a * a), sh = t0 == null && tau < 0.75 ? Math.sin(T * 60) * 2.2 : 0;
    put(ctx, stalactiteSprite(), x - 60 + sh, y - ext * 0);
  }
};
