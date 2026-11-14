/* Traps and obstacles. Purely visual: the crash point comes only from the provably fair result.
   Each trap is timed against the moment the runner reaches it (tau, seconds; negative once he has passed),
   so a blade is always vertical as he slides beneath it, at any speed. */
import { U, TAU, clamp, lerp, smooth, hd, put, lin, rad, glow, fire, dab, fern, bigLeaf, tuft, rock, texFill, stoneTex, slateTex, sandTex, INK } from './kit.js';
import { flower, GOLD, gem } from './relics.js';

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

/* ---------- shared painters ---------- */
const poly = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
const jagged = (seed, n) => { const r = U.rng(seed), a = []; for (let i = 0; i <= n; i++) a.push(r()); return a; };
const bez = (p0, p1, p2, p3, t) => { const it = 1 - t; return [it * it * it * p0[0] + 3 * it * it * t * p1[0] + 3 * it * t * t * p2[0] + t * t * t * p3[0], it * it * it * p0[1] + 3 * it * it * t * p1[1] + 3 * it * t * t * p2[1] + t * t * t * p3[1]]; };
/** A round body along a path: outline, base colour, a highlight to the upper left and a pale belly. */
const tube = (g, path, w, c) => {
  g.lineCap = 'round'; g.lineJoin = 'round';
  path(); g.strokeStyle = c.ink; g.lineWidth = w + 4.5; g.stroke();
  path(); g.strokeStyle = c.base; g.lineWidth = w; g.stroke();
  g.save(); g.translate(w * 0.1, w * 0.2); path(); g.strokeStyle = c.belly; g.lineWidth = w * 0.34; g.stroke(); g.restore();
  g.save(); g.translate(-w * 0.12, -w * 0.18); path(); g.strokeStyle = c.light; g.lineWidth = w * 0.4; g.globalAlpha = 0.85; g.stroke(); g.restore();
};
/** An iron chain between two points, alternate links face-on and edge-on. */
const chain = (ctx, x0, y0, x1, y1, link = 10) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), n = Math.max(1, Math.round(L / link)), step = L / n;
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(Math.atan2(dy, dx));
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * step, edge = i % 2;
    ctx.beginPath(); ctx.ellipse(x, 0, step * 0.66, edge ? 1.5 : 3.8, 0, 0, TAU);
    ctx.strokeStyle = '#0e0e12'; ctx.lineWidth = edge ? 3.6 : 3; ctx.stroke();
    ctx.strokeStyle = edge ? '#9a9aa6' : '#6a6a76'; ctx.lineWidth = edge ? 1.8 : 1.5; ctx.stroke();
  }
  ctx.restore();
};
const bone = (g, x, y, a, L) => {
  g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#ddd3b2'; g.fillRect(-L / 2, -1.6, L, 3.2);
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * L / 2, -1.6, 2.3, 0, TAU); g.arc(s * L / 2, 1.6, 2.3, 0, TAU); g.fill(); }
  g.restore();
};
const skull = (g, x, y, s = 1) => {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#e4dabb'; g.beginPath(); g.ellipse(0, -6, 10, 9, 0, 0, TAU); g.fill(); U.rr(g, -6.5, -1, 13, 8, 2); g.fill();
  g.strokeStyle = 'rgba(60,44,20,0.6)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, -6, 10, 9, 0, 0, TAU); g.stroke();
  g.fillStyle = '#1a120a'; g.beginPath(); g.ellipse(-4, -6, 3, 3.4, 0, 0, TAU); g.ellipse(4, -6, 3, 3.4, 0, 0, TAU); g.fill();
  poly(g, [[0, -2], [-1.4, 1], [1.4, 1]]); g.fill();
  for (let i = -2; i <= 2; i++) g.fillRect(i * 2.3 - 0.6, 3, 1.2, 3.6);
  g.restore();
};
const hangGrass = (g, x, y, n, h, r) => { g.save(); g.translate(x, y); g.scale(1, -1); tuft(g, 0, 0, n, h, ['#3f9a44', '#67ba4a', '#2a7a3c', '#9ad25a'], r, 1.4); g.restore(); };

/* ---------- pits ---------- */
const PIT = { W: 268, TOP: 54, D: 134, HW: 108 };
/** A pit cut into the trail: lit earth strata (or stone courses), roots, bones, two rows of stakes or spikes. */
const pitSprite = (kind, tint = '#ff5a1a', wall = '#2a1a0e') => hd('t-pit2-' + kind + tint, PIT.W, PIT.TOP + PIT.D + 6, (g, W) => {
  const c = W / 2, hw = PIT.HW, d = PIT.D, stone = kind !== 'punji', r = U.rng(stone ? 21 : 4), j = jagged(stone ? 12 : 77, 26);
  g.translate(0, PIT.TOP);
  const hole = () => {
    g.beginPath(); g.moveTo(c - hw, 0);
    for (let i = 0; i <= 13; i++) { const t = i / 13; g.lineTo(c - hw + 14 * t + (stone ? 0 : j[i] * 7), t * d); }
    for (let i = 0; i <= 13; i++) { const t = 1 - i / 13; g.lineTo(c + hw - 14 * t - (stone ? 0 : j[i + 13] * 7), t * d); }
    g.closePath();
  };
  g.save(); hole(); g.clip();
  if (stone) {
    texFill(g, stoneTex(), c - hw, 0, hw * 2, d);
    g.fillStyle = lin(g, 0, 0, 0, d, [[0, U.rgba(wall, 0.55)], [1, 'rgba(0,0,0,0.92)']]); g.fillRect(c - hw, 0, hw * 2, d);
    for (let y = 16, row = 0; y < d; y += 19, row++) {
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(c - hw, y, hw * 2, 2.4);
      for (let x = c - hw + (row % 2 ? 15 : 0); x < c + hw; x += 30) g.fillRect(x, y - 17, 2.2, 17);
      g.fillStyle = 'rgba(255,230,180,0.07)'; g.fillRect(c - hw, y + 2.4, hw * 2, 1.2);
    }
    for (let k = 0; k < 12; k++) dab(g, c - hw + r() * hw * 2, r() * d * 0.4, 6 + r() * 7, 2 + r() * 2, Math.PI / 2 + (r() - 0.5), ['#1f5a3a', '#2f7a4c', '#173f2a'][k % 3]);
  } else {
    g.fillStyle = lin(g, 0, 0, 0, d, [[0, '#5a3c22'], [0.22, '#33200f'], [1, '#060302']]); g.fillRect(c - hw, 0, hw * 2, d);
    for (let k = 0; k < 6; k++) {
      const y0 = 6 + k * 20; g.fillStyle = k % 2 ? 'rgba(110,74,36,0.3)' : 'rgba(0,0,0,0.3)'; g.beginPath(); g.moveTo(c - hw, y0);
      for (let x = c - hw; x <= c + hw; x += 12) g.lineTo(x, y0 + Math.sin(x * 0.07 + k) * 3 + r() * 3);
      g.lineTo(c + hw, y0 + 11); for (let x = c + hw; x >= c - hw; x -= 12) g.lineTo(x, y0 + 11 + Math.sin(x * 0.05 + k * 2) * 3); g.closePath(); g.fill();
    }
    for (let k = 0; k < 34; k++) { const x = c - hw + r() * hw * 2, y = r() * d * 0.75; g.fillStyle = 'rgba(160,138,104,' + (0.2 + r() * 0.3).toFixed(2) + ')'; g.beginPath(); g.ellipse(x, y, 1.5 + r() * 3, 1 + r() * 2, r() * 3, 0, TAU); g.fill(); }
  }
  // the side walls catch less light than the far one
  g.fillStyle = 'rgba(0,0,0,0.5)'; poly(g, [[c - hw, 0], [c - hw + 28, 0], [c - hw + 38, d], [c - hw + 13, d]]); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.28)'; poly(g, [[c + hw, 0], [c + hw - 22, 0], [c + hw - 30, d], [c + hw - 13, d]]); g.fill();
  if (stone) { g.fillStyle = rad(g, c, d, 0, 170, [[0, U.rgba(tint, 0.8)], [0.45, U.rgba(tint, 0.22)], [1, U.rgba(tint, 0)]]); g.fillRect(c - hw, 0, hw * 2, d); }
  // roots reaching in from the top
  g.lineCap = 'round';
  for (let k = 0; k < (stone ? 4 : 10); k++) {
    const x = c - hw + 12 + r() * (hw * 2 - 24), L = 14 + r() * 40;
    g.strokeStyle = stone ? '#1f3a1c' : '#3a2614'; g.lineWidth = 1.6 + r() * 2; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + (r() - 0.5) * 18, L * 0.6, x + (r() - 0.5) * 12, L); g.stroke();
  }
  // what is left of those who fell in
  bone(g, c - 46, d - 7, 0.25, 24); bone(g, c + 38, d - 5, -0.5, 20); bone(g, c + 4, d - 4, 1.2, 16);
  skull(g, c - 14, d - 8, 0.95);
  // stakes: a dim back row, then the front row catching the light
  const stake = (x, base, h, s, dark) => {
    g.save(); g.translate(x, base); g.rotate((r() - 0.5) * 0.2); g.scale(s, s);
    if (stone) {
      g.fillStyle = lin(g, -7, 0, 7, 0, [[0, '#1c1c22'], [0.42, dark ? '#7a8088' : '#e4eaf0'], [0.6, dark ? '#4a4e56' : '#8a9098'], [1, '#121216']]);
      g.beginPath(); g.moveTo(-7.5, 0); g.lineTo(-1.2, -h + 7); g.lineTo(0, -h); g.lineTo(1.2, -h + 7); g.lineTo(7.5, 0); g.closePath(); g.fill(); g.strokeStyle = '#060608'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(150,70,24,0.55)'; g.beginPath(); g.ellipse(0, -7, 6.5, 5, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(150,20,14,0.6)'; poly(g, [[-2.2, -h + 18], [0, -h + 2], [2.6, -h + 15]]); g.fill();
      if (!dark) { g.fillStyle = 'rgba(255,255,255,0.92)'; poly(g, [[-0.9, -h + 11], [0, -h], [0.3, -h + 11]]); g.fill(); }
    } else {
      const wd = 6.6;
      g.fillStyle = lin(g, -wd, 0, wd, 0, [[0, dark ? '#3a3412' : '#5e5420'], [0.36, dark ? '#968a48' : '#ecdc8e'], [0.7, dark ? '#766a2e' : '#bca64c'], [1, '#342e0e']]);
      poly(g, [[-wd, 0], [-wd, -h + 17], [wd, -h], [wd, 0]]); g.fill(); g.strokeStyle = '#120e04'; g.lineWidth = 1.1; g.stroke();
      for (let y = -14; y > -h + 24; y -= 22) {
        g.strokeStyle = 'rgba(40,30,8,0.85)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-wd, y); g.lineTo(wd, y - 1); g.stroke();
        g.strokeStyle = 'rgba(255,244,190,0.32)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-wd, y + 2.2); g.lineTo(wd, y + 1.2); g.stroke();
      }
      g.fillStyle = dark ? '#8a7a40' : '#f6e8aa'; poly(g, [[-wd, -h + 17], [wd, -h], [wd - 2, -h + 3.4], [-wd + 1, -h + 18]]); g.fill();
      g.fillStyle = 'rgba(150,24,16,0.7)'; poly(g, [[-1.2, -h + 10], [wd, -h], [wd - 1, -h + 13]]); g.fill();
    }
    g.restore();
  };
  for (let i = 0; i < 9; i++) stake(c - 82 + i * 20.5 + (r() - 0.5) * 6, d - 13, 72 + r() * 26, 0.7, true);
  for (let i = 0; i < 8; i++) stake(c - 76 + i * 21.5 + (r() - 0.5) * 6, d + 3, 86 + r() * 22, 1, false);
  g.fillStyle = lin(g, 0, d - 30, 0, d, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]); g.fillRect(c - hw, d - 30, hw * 2, 30);
  g.restore();
  // the lip of the pit
  if (stone) {
    for (const sd of [-1, 1]) {
      const x0 = c + sd * hw;
      g.fillStyle = lin(g, 0, -3, 0, 18, [[0, '#c0b690'], [0.3, '#7a7258'], [1, '#2a281e']]); poly(g, [[x0 - sd * 2, -3], [x0 + sd * 16, -3], [x0 + sd * 9, 11], [x0 - sd * 10, d]]); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = 'rgba(255,245,215,0.35)'; g.fillRect(Math.min(x0 - sd * 2, x0 + sd * 16), -3, 18, 1.6);
    }
  } else {
    for (const sd of [-1, 1]) {
      const x0 = c + sd * hw;
      g.fillStyle = '#4a3220'; poly(g, [[x0 - sd * 4, -1], [x0 + sd * 10, -1], [x0 + sd * 4, 8], [x0 - sd * 8, 14]]); g.fill();
      hangGrass(g, x0 - sd * 6, 1, 10, 16, r);
      // the broken leaf cover that hid the pit
      g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const ex = x0 - sd * (26 + k * 13 + r() * 6), ey = 18 + k * 9 + r() * 6; g.strokeStyle = '#5a3e1e'; g.lineWidth = 3.4 - k * 0.6; g.beginPath(); g.moveTo(x0 + sd * 2, 1 + k); g.quadraticCurveTo(x0 - sd * 12, 4 + k * 3, ex, ey); g.stroke(); g.strokeStyle = 'rgba(220,180,120,0.3)'; g.lineWidth = 1; g.stroke(); dab(g, ex, ey, 10 + r() * 8, 3.6, Math.PI / 2 + (r() - 0.5), ['#4f9a38', '#7a5a2a', '#3a7f2e'][k]); }
      for (let i = 0; i < 12; i++) dab(g, x0 - sd * (2 + r() * 20), 1 + r() * 4, 10 + r() * 14, 3 + r() * 4, Math.PI / 2 + (r() - 0.5) * 1.4, ['#4f9a38', '#7a5a2a', '#3a7f2e', '#9a7a3a'][i % 4]);
    }
    // a warning post: a bamboo pole with a skull lashed to it and a red rag
    const px = c - hw - 22;
    g.fillStyle = lin(g, px - 3, 0, px + 3, 0, [[0, '#5e5420'], [0.5, '#d8c878'], [1, '#4a4216']]); g.fillRect(px - 2.6, -52, 5.2, 58); g.strokeStyle = '#120e04'; g.lineWidth = 1; g.strokeRect(px - 2.6, -52, 5.2, 58);
    g.fillStyle = 'rgba(40,30,8,0.8)'; g.fillRect(px - 2.6, -30, 5.2, 1.6); g.fillRect(px - 2.6, -12, 5.2, 1.6);
    g.strokeStyle = '#b8342a'; g.lineWidth = 3; g.beginPath(); g.moveTo(px + 2, -46); g.quadraticCurveTo(px + 10, -42, px + 7, -32); g.stroke();
    skull(g, px, -48, 0.72);
    g.strokeStyle = '#c8a870'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(px - 4, -44); g.lineTo(px + 4, -40); g.moveTo(px - 4, -40); g.lineTo(px + 4, -44); g.stroke();
  }
});

/* ---------- things that swing ---------- */
/** Spiked log on ropes, seen end on: bark, an iron band, growth rings and iron spikes. */
const logSprite = () => hd('t-log2', 224, 224, (g, W) => {
  const c = W / 2, R = 56, r = U.rng(9);
  for (let i = 0; i < 12; i++) {
    g.save(); g.translate(c, c); g.rotate((i / 12) * TAU);
    g.beginPath(); g.moveTo(-9.5, -R + 6); g.lineTo(-1, -R - 38); g.lineTo(1, -R - 40); g.lineTo(9.5, -R + 6); g.closePath();
    g.fillStyle = lin(g, -10, 0, 10, 0, [[0, '#24242a'], [0.42, '#d8dee6'], [0.62, '#7a8088'], [1, '#18181d']]); g.fill(); g.strokeStyle = '#08070a'; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = 'rgba(140,60,20,0.45)'; g.beginPath(); g.ellipse(0, -R - 4, 8, 4, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(130,24,16,0.6)'; poly(g, [[-2, -R - 20], [0, -R - 39], [4.6, -R - 15]]); g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = rad(g, c - 18, c - 22, 6, R * 1.25, [[0, '#a07a4e'], [0.55, '#5a3d22'], [1, '#22140a']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
  // iron band with rivets
  g.beginPath(); g.arc(c, c, R - 4, 0, TAU); g.strokeStyle = '#1c1c22'; g.lineWidth = 7; g.stroke(); g.strokeStyle = '#5a5a64'; g.lineWidth = 4; g.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.26; g.fillStyle = '#c8ccd2'; g.beginPath(); g.arc(c + Math.cos(a) * (R - 4), c + Math.sin(a) * (R - 4), 1.6, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(c, c, R - 11, 0, TAU); g.fillStyle = rad(g, c - 8, c - 10, 2, R, [[0, '#e8c48c'], [0.7, '#b48a56'], [1, '#7a5a34']]); g.fill();
  g.strokeStyle = 'rgba(80,50,22,0.65)'; g.lineWidth = 1.5;
  for (let k = 1; k <= 5; k++) { g.beginPath(); for (let a = 0; a <= TAU + 0.1; a += 0.3) { const R2 = (R - 11) * (k / 6) * (1 + Math.sin(a * 3 + k) * 0.04); (a ? g.lineTo(c + Math.cos(a) * R2, c + Math.sin(a) * R2) : g.moveTo(c + Math.cos(a) * R2, c + Math.sin(a) * R2)); } g.stroke(); }
  g.fillStyle = '#5a3818'; g.beginPath(); g.arc(c + 2, c + 1, 5, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(30,18,8,0.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + 22, c - 30); g.moveTo(c, c); g.lineTo(c - 26, c + 16); g.stroke();
});
const rope = (ctx, x0, y0, x1, y1) => {
  ctx.lineCap = 'round'; ctx.strokeStyle = '#2a1c0c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = '#b89a62'; ctx.lineWidth = 4.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(70,46,18,0.8)'; ctx.lineWidth = 4.4; ctx.setLineDash([2.4, 4]); ctx.stroke(); ctx.setLineDash([]);
};
const SWING = 3.3; // radians per second of pendulum phase
const drawLog = (ctx, x, floorY, tau, ext) => {
  const py = -ext - 40, cy = floorY - 186, len = cy - py, a = 0.62 * Math.sin(tau * SWING), lx = x + Math.sin(a) * len, ly = py + Math.cos(a) * len;
  rope(ctx, x - 26, py, lx - 12, ly - 44); rope(ctx, x + 26, py, lx + 12, ly - 44);
  for (const s of [-1, 1]) { ctx.fillStyle = '#7a6034'; U.rr(ctx, lx + s * 12 - 5, ly - 50, 10, 9, 3); ctx.fill(); ctx.strokeStyle = '#2a1c0c'; ctx.lineWidth = 1.4; ctx.stroke(); }
  ctx.save(); ctx.globalAlpha = 0.14; for (let i = 1; i <= 2; i++) { const b = 0.62 * Math.sin((tau + i * 0.03) * SWING); ctx.save(); ctx.translate(x + Math.sin(b) * len, py + Math.cos(b) * len); ctx.rotate(-b * 1.6); put(ctx, logSprite(), -112, -112); ctx.restore(); } ctx.restore();
  ctx.save(); ctx.translate(lx, ly); ctx.rotate(-a * 1.6); put(ctx, logSprite(), -112, -112); ctx.restore();
};

/* Crescent axe: etched blade, a skull boss and a ruby. Drawn pointing straight down from its pivot. */
const bladeSprite = () => hd('t-blade2', 176, 100, (g, W) => {
  const c = W / 2, shape = () => { g.beginPath(); g.moveTo(5, 8); g.quadraticCurveTo(c, 156, W - 5, 8); g.quadraticCurveTo(c, 56, 5, 8); g.closePath(); };
  shape(); g.fillStyle = lin(g, 0, 8, W, 90, [[0, '#6a5a3a'], [0.36, '#f6eed4'], [0.55, '#b49a62'], [1, '#3a2c14']]); g.fill(); g.strokeStyle = '#08080c'; g.lineWidth = 2.2; g.stroke();
  g.save(); shape(); g.clip();
  g.fillStyle = 'rgba(40,30,12,0.3)'; g.beginPath(); g.moveTo(5, 8); g.quadraticCurveTo(c, 70, W - 5, 8); g.quadraticCurveTo(c, 56, 5, 8); g.fill();
  g.strokeStyle = 'rgba(232,184,80,0.85)'; g.lineWidth = 1.4; g.beginPath();
  for (let i = 0; i < 9; i++) { const t = 0.12 + i * 0.095, x = lerp(16, W - 16, t), y = 30 + Math.sin(t * Math.PI) * 30; g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.moveTo(x, y - 3); g.lineTo(x, y + 3); }
  g.stroke();
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(11, 14); g.quadraticCurveTo(c, 148, W - 11, 14); g.stroke();
  g.strokeStyle = 'rgba(130,24,16,0.65)'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(c - 44, 54); g.quadraticCurveTo(c, 92, c + 24, 62); g.stroke();
  g.fillStyle = 'rgba(130,24,16,0.65)'; g.beginPath(); g.ellipse(c + 24, 66, 2, 4, 0, 0, TAU); g.fill();
  g.beginPath(); g.arc(c, 34, 15, 0, TAU); g.fillStyle = GOLD(g, c - 15, c + 15); g.fill(); g.strokeStyle = '#08080c'; g.lineWidth = 1.8; g.stroke();
  gem(g, c, 34, 7.4, '#e0283c');
});
/** A carved stone mount with a demon's face, set into the ceiling. */
const mountSprite = () => hd('t-mount', 80, 52, (g, W, H) => {
  const c = W / 2;
  g.save(); U.rr(g, 4, 0, W - 8, H - 6, 6); g.clip(); texFill(g, stoneTex(), 0, 0, W, H); g.fillStyle = lin(g, 0, 0, 0, H, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0.1)']]); g.fillRect(0, 0, W, H); g.restore();
  U.rr(g, 4, 0, W - 8, H - 6, 6); g.strokeStyle = '#0c0a06'; g.lineWidth = 2; g.stroke();
  g.fillStyle = 'rgba(6,4,2,0.85)';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(c + s * 22, 18); g.quadraticCurveTo(c + s * 13, 10, c + s * 5, 19); g.quadraticCurveTo(c + s * 14, 24, c + s * 22, 18); g.fill(); }
  g.fillStyle = '#ff4a1a'; for (const s of [-1, 1]) { g.beginPath(); g.arc(c + s * 13, 18, 2, 0, TAU); g.fill(); }
  U.rr(g, c - 13, 30, 26, 9, 3); g.fillStyle = 'rgba(6,4,2,0.85)'; g.fill();
  g.fillStyle = '#d0c6a4'; for (let i = 0; i < 5; i++) g.fillRect(c - 11 + i * 4.8, 30, 3.4, 3.6);
  g.fillStyle = '#c9a24a'; g.fillRect(4, H - 10, W - 8, 3);
});
const drawBlade = (ctx, x, pivotY, floorY, tau, T) => {
  const len = floorY - 118 - 57 - pivotY, sw = (t) => 0.8 * Math.sin(t * SWING), a = sw(tau);
  // a bright arc where the blade has just been
  ctx.save(); ctx.translate(x, pivotY); ctx.globalCompositeOperation = 'lighter';
  const a1 = sw(tau + 0.1), R0 = len + 46;
  ctx.strokeStyle = 'rgba(255,240,205,0.22)'; ctx.lineWidth = 34; ctx.beginPath(); ctx.arc(0, 0, R0, Math.PI / 2 - Math.max(a, a1), Math.PI / 2 - Math.min(a, a1)); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R0 + 22, Math.PI / 2 - Math.max(a, a1), Math.PI / 2 - Math.min(a, a1)); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.translate(x, pivotY); ctx.rotate(-a);
  chain(ctx, 0, 6, 0, len - 6, 11);
  ctx.fillStyle = '#c9a24a'; U.rr(ctx, -6, len - 14, 12, 10, 2); ctx.fill(); ctx.strokeStyle = '#100a04'; ctx.lineWidth = 1.4; ctx.stroke();
  put(ctx, bladeSprite(), -88, len - 12);
  ctx.restore();
  put(ctx, mountSprite(), x - 40, pivotY - 30);
  ctx.beginPath(); ctx.arc(x, pivotY, 7.5, 0, TAU); ctx.fillStyle = '#c9a24a'; ctx.fill(); ctx.strokeStyle = '#100a04'; ctx.lineWidth = 1.8; ctx.stroke();
  glow(ctx, x - 6.5, pivotY - 12, 9, '#ff4a1a', 0.5); glow(ctx, x + 6.5, pivotY - 12, 9, '#ff4a1a', 0.5);
};

/* ---------- the great fallen tree ---------- */
const FALL = { W: 290, H: 168, CX: 92 };
const fallenSprite = () => hd('t-fallen2', FALL.W, FALL.H, (g, W, H) => {
  const R = 60, cx = FALL.CX, cy = H - R - 3, r = U.rng(33);
  // the trunk running back into the jungle
  const body = () => { g.beginPath(); g.moveTo(cx, cy - R); g.bezierCurveTo(cx + 80, cy - R - 6, cx + 150, cy - R + 4, W - 4, cy - R + 12); g.lineTo(W - 2, cy + R - 2); g.lineTo(cx, cy + R); g.closePath(); };
  body(); g.fillStyle = lin(g, 0, cy - R, 0, cy + R, [[0, '#86643e'], [0.32, '#5c4026'], [1, '#1c120a']]); g.fill();
  g.save(); body(); g.clip();
  for (let k = 0; k < 15; k++) {
    const y = cy - R + 6 + k * 8 + r() * 4; g.strokeStyle = k % 3 ? 'rgba(20,12,4,0.5)' : 'rgba(200,160,110,0.22)'; g.lineWidth = 1.5 + r() * 2.2; g.beginPath(); g.moveTo(cx, y);
    for (let x = cx; x < W; x += 18) g.lineTo(x, y + Math.sin(x * 0.05 + k) * 2.5 + (r() - 0.5) * 2); g.stroke();
  }
  g.fillStyle = lin(g, cx, 0, W, 0, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10,20,10,0.5)']]); g.fillRect(cx, cy - R - 20, W, R * 2 + 30);
  g.restore();
  body(); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
  // a draped vine with leaves
  g.strokeStyle = '#2a5418'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 30, cy - R - 2); g.bezierCurveTo(cx + 46, cy + 10, cx + 80, cy + 30, cx + 96, cy - R + 4); g.stroke();
  for (let i = 0; i < 9; i++) { const t = i / 8, p = bez([cx + 30, cy - R - 2], [cx + 46, cy + 10], [cx + 80, cy + 30], [cx + 96, cy - R + 4], t); dab(g, p[0], p[1], 9 + r() * 5, 3.6, (i % 2 ? 0.6 : -2.4) + (r() - 0.5), i % 2 ? '#4f9a38' : '#6fb642'); }
  // bracket fungi along the side
  for (const [x, y, s] of [[cx + 66, cy + 10, 1], [cx + 84, cy - 6, 0.8], [cx + 124, cy + 16, 0.95], [cx + 166, cy + 4, 0.75], [cx + 196, cy + 22, 0.7]]) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = lin(g, 0, -7, 0, 2, [[0, '#ffd88a'], [0.5, '#e6802e'], [1, '#7a3410']]); g.beginPath(); g.ellipse(0, 0, 16, 7, 0, Math.PI, TAU); g.closePath(); g.fill(); g.strokeStyle = '#3a1a08'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = 'rgba(255,240,200,0.55)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(0, -1, 11, 3.6, 0, Math.PI, TAU); g.stroke();
    g.restore();
  }
  // moss blanket on top, with ferns
  for (let i = 0; i < 130; i++) { const x = cx - 4 + r() * (W - cx - 6), y = cy - R + 2 + Math.pow(r(), 2) * 22 + (x - cx) * 0.04; dab(g, x, y, 7 + r() * 11, 3 + r() * 4, r() * TAU, ['#4d8f34', '#6fae3f', '#37702a', '#8ac34a', '#2f6226'][i % 5]); }
  fern(g, cx + 150, cy - R + 6, 56, -1.9, '#2a8040', '#6abf52', r, 0.4, 1); fern(g, cx + 200, cy - R + 10, 48, -1.2, '#2a8040', '#6abf52', r, 0.4, 1);
  // glowing toadstools
  for (let i = 0; i < 7; i++) {
    const x = cx + 30 + r() * 170, y = cy - R + 4 + (x - cx) * 0.03;
    g.fillStyle = rad(g, x, y - 9, 0, 12, [[0, 'rgba(140,230,255,0.55)'], [1, 'rgba(140,230,255,0)']]); g.fillRect(x - 12, y - 21, 24, 24);
    g.fillStyle = '#e4f8ff'; g.fillRect(x - 1, y - 8, 2, 8);
    g.fillStyle = lin(g, 0, y - 14, 0, y - 8, [[0, '#c8f6ff'], [1, '#3aa6d8']]); g.beginPath(); g.ellipse(x, y - 9, 5.4, 4, 0, Math.PI, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x - 1.5, y - 11, 0.9, 0, TAU); g.arc(x + 2, y - 10, 0.7, 0, TAU); g.fill();
  }
  // a broken branch stub with fresh leaves
  g.save(); g.translate(cx + 132, cy - R + 8); g.rotate(-0.45);
  g.fillStyle = lin(g, -6, 0, 6, 0, [[0, '#3a2614'], [0.5, '#7a5a3a'], [1, '#2a1a0c']]); poly(g, [[-6.5, 0], [-4, -38], [0, -42], [5, -35], [6.5, 0]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
  g.restore();
  for (let i = 0; i < 6; i++) bigLeaf(g, cx + 146 + (r() - 0.5) * 10, cy - R - 26 + (r() - 0.5) * 8, 26 + r() * 14, 7 + r() * 3, -Math.PI / 2 + (r() - 0.5) * 2.4, '#9ad858', '#3c9a44', '#14562e', 0.1);
  // the cut end: bark, rings, heartwood and cracks
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fillStyle = rad(g, cx - 18, cy - 22, 6, R * 1.25, [[0, '#86643e'], [1, '#22140a']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
  g.beginPath(); g.arc(cx, cy, R - 9, 0, TAU); g.fillStyle = rad(g, cx - 10, cy - 12, 2, R, [[0, '#f4d6a0'], [0.6, '#c89a62'], [1, '#8a603a']]); g.fill();
  g.strokeStyle = 'rgba(96,62,28,0.6)'; g.lineWidth = 1.4;
  for (let k = 1; k <= 7; k++) { g.beginPath(); for (let a = 0; a <= TAU + 0.1; a += 0.25) { const R2 = (R - 9) * (k / 8) * (1 + Math.sin(a * 4 + k) * 0.035); (a ? g.lineTo(cx + Math.cos(a) * R2, cy + Math.sin(a) * R2) : g.moveTo(cx + Math.cos(a) * R2, cy + Math.sin(a) * R2)); } g.stroke(); }
  g.fillStyle = '#6a4424'; g.beginPath(); g.arc(cx + 2, cy + 1, 7, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(30,18,8,0.85)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 24, cy - 30); g.lineTo(cx - 30, cy - 44); g.moveTo(cx + 6, cy + 4); g.lineTo(cx + 34, cy + 20); g.lineTo(cx + 46, cy + 22); g.stroke();
  for (let i = 0; i < 44; i++) { const a = -Math.PI * r(); dab(g, cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), 9 + r() * 11, 3 + r() * 4, a + Math.PI / 2 + (r() - 0.5), ['#4d8f34', '#6fae3f', '#8ac34a'][i % 3]); }
  // growth at its foot
  fern(g, cx - R + 4, H - 3, 64, -2.5, '#2a8040', '#6abf52', r, 0.4, 1); fern(g, cx + R - 6, H - 2, 60, -0.7, '#2a8040', '#6abf52', r, 0.4, 1);
  for (let i = 0; i < 6; i++) { const x = cx - 50 + r() * 110, y = H - 4; g.fillStyle = '#efe3c2'; g.fillRect(x - 1.2, y - 8, 2.4, 9); g.fillStyle = '#d8452c'; g.beginPath(); g.ellipse(x, y - 9, 6, 4, 0, Math.PI, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x - 2, y - 10.5, 0.9, 0, TAU); g.fill(); }
  for (let i = 0; i < 5; i++) flower(g, cx - 40 + r() * 100, H - 10 - r() * 14, 4 + r() * 2.4, ['#ff5d8f', '#ff9a3c', '#c77dff'][i % 3]);
});

/* ---------- the python ---------- */
const PY = { ink: '#061008', base: '#2f7d3a', light: '#8fe07a', belly: '#ecd88e', saddle: '#16351a', edge: '#e2b84a' };
const saddles = (g, pts, w) => {
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], a = Math.atan2(pts[i + 1][1] - pts[i - 1][1], pts[i + 1][0] - pts[i - 1][0]);
    g.save(); g.translate(x, y); g.rotate(a);
    poly(g, [[-6.5, -w * 0.06], [0, -w * 0.44], [6.5, -w * 0.06], [0, w * 0.16]]); g.fillStyle = PY.saddle; g.fill(); g.strokeStyle = PY.edge; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = PY.edge; g.beginPath(); g.arc(0, -w * 0.16, 1.2, 0, TAU); g.fill();
    g.restore();
  }
};
/** Three resting coils, the top one lit. */
const coilSprite = () => hd('t-coil2', 170, 84, (g, W, H) => {
  const c = W / 2;
  for (let i = 0; i < 3; i++) {
    const rx = 64 - i * 13, ry = 13 - i * 1.4, y = H - 16 - i * 16, w = 21 - i * 1.5;
    const path = () => { g.beginPath(); g.ellipse(c, y, rx, ry, 0, 0, TAU); };
    tube(g, path, w, PY);
    const pts = []; for (let k = 0; k <= 14; k++) { const t = 0.08 + (k / 14) * 0.84; pts.push([c + Math.cos(t * Math.PI) * rx, y + Math.sin(t * Math.PI) * ry]); }
    saddles(g, pts.reverse(), w);
  }
});
/** The head in profile, facing left; the neck joins at (98, 50). `open` bares the fangs. */
const pyHead = (open) => hd('t-pyhead2-' + open, 124, 94, (g) => {
  g.lineJoin = 'round'; g.lineCap = 'round';
  const hx = 86, hy = 52, ja = open ? 0.58 : 0.04;
  const tipX = hx + (-76 * Math.cos(ja) - 2 * Math.sin(ja)), tipY = hy + (76 * Math.sin(ja) - 2 * Math.cos(ja) + 2);
  if (open) { // the mouth, deep pink to the throat
    poly(g, [[10, 46], [hx, hy - 2], [tipX + 4, tipY]]); g.fillStyle = lin(g, 10, 0, hx, 0, [[0, '#ff8aa0'], [0.6, '#c43a5a'], [1, '#5a0a1e']]); g.fill();
  }
  // lower jaw
  g.save(); g.translate(hx, hy); g.rotate(-ja);
  g.beginPath(); g.moveTo(4, -4); g.lineTo(-74, -3); g.quadraticCurveTo(-80, 3, -72, 8); g.quadraticCurveTo(-34, 14, 8, 8); g.closePath();
  g.fillStyle = lin(g, 0, -4, 0, 12, [[0, '#4f9c4a'], [0.5, '#9fd27c'], [1, '#ecd88e']]); g.fill(); g.strokeStyle = PY.ink; g.lineWidth = 2; g.stroke();
  g.strokeStyle = 'rgba(80,60,20,0.45)'; g.lineWidth = 0.9; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(-66 + i * 10, 4); g.lineTo(-62 + i * 10, 10); g.stroke(); }
  if (open) { g.fillStyle = '#fff6e4'; poly(g, [[-62, -3], [-59, -12], [-56, -3]]); g.fill(); }
  g.restore();
  // upper head
  const head = () => { g.beginPath(); g.moveTo(6, 44); g.quadraticCurveTo(3, 34, 14, 29); g.bezierCurveTo(30, 18, 54, 14, 78, 18); g.bezierCurveTo(102, 22, 112, 36, 104, 50); g.quadraticCurveTo(96, 58, 86, 52); g.lineTo(10, 47); g.closePath(); };
  head(); g.fillStyle = lin(g, 0, 14, 0, 52, [[0, '#a6e486'], [0.4, '#4aa452'], [1, '#22562a']]); g.fill();
  g.save(); head(); g.clip();
  // head plates
  g.strokeStyle = 'rgba(16,46,18,0.5)'; g.lineWidth = 1.1;
  for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) { const x = 22 + i * 10 + (row % 2) * 5, y = 20 + row * 7; g.beginPath(); g.arc(x, y, 5.4, 0.3, Math.PI - 0.3); g.stroke(); }
  // the dark mask through the eye
  g.fillStyle = 'rgba(14,40,16,0.6)'; poly(g, [[28, 30], [100, 32], [104, 44], [40, 39]]); g.fill();
  g.fillStyle = 'rgba(255,255,230,0.25)'; g.beginPath(); g.ellipse(52, 21, 22, 3, -0.05, 0, TAU); g.fill();
  g.restore();
  head(); g.strokeStyle = PY.ink; g.lineWidth = 2.2; g.stroke();
  // brow ridge, eye with a slit pupil, nostril, heat pits
  g.fillStyle = '#255a2a'; g.beginPath(); g.ellipse(46, 24.5, 13, 4.2, -0.1, Math.PI, TAU); g.fill();
  g.beginPath(); g.ellipse(46, 30.5, 7.6, 5.8, 0, 0, TAU); g.fillStyle = rad(g, 46, 30, 0, 8, [[0, '#fff6a8'], [0.55, '#ffb81e'], [1, '#b8600a']]); g.fill(); g.strokeStyle = PY.ink; g.lineWidth = 1.7; g.stroke();
  g.fillStyle = '#0a0603'; g.beginPath(); g.ellipse(46.5, 30.5, 1.5, 5, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(43.4, 28, 1.4, 0, TAU); g.fill();
  g.fillStyle = PY.ink; g.beginPath(); g.ellipse(14, 35, 2.2, 1.5, -0.3, 0, TAU); g.fill();
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(18 + i * 7, 44, 1, 0, TAU); g.fill(); }
  if (open) { // fangs
    g.fillStyle = '#fff8ea'; g.strokeStyle = 'rgba(60,40,20,0.7)'; g.lineWidth = 0.8;
    for (const fx of [18, 30]) { poly(g, [[fx - 2.6, 46], [fx, 60], [fx + 2.6, 46]]); g.fill(); g.stroke(); }
  }
});
const drawPython = (ctx, x, floorY, T, strike) => {
  put(ctx, coilSprite(), x - 85, floorY - 82);
  const sway = Math.sin(T * 3.4) * 5 * (1 - strike), nx = x - 6 - strike * 72 + sway, ny = floorY - 120 + strike * 18 + Math.cos(T * 3.4) * 2;
  const p0 = [x + 22, floorY - 48], p1 = [x + 58, floorY - 106], p2 = [x + 10 - strike * 26, floorY - 118], p3 = [nx + 2, ny + 6];
  const path = () => { ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]); };
  tube(ctx, path, 20, PY);
  const pts = []; for (let k = 0; k <= 9; k++) pts.push(bez(p0, p1, p2, p3, 0.05 + (k / 9) * 0.86));
  saddles(ctx, pts, 20);
  put(ctx, pyHead(strike > 0.3 ? 1 : 0), nx - 98, ny - 50);
  // the eye glows, the tongue flicks
  glow(ctx, nx - 52, ny - 20, 20, '#ffc33a', 0.55);
  if (Math.sin(T * 7) > 0.15 || strike > 0.1) {
    const tx = nx - 92, ty = ny - 6 + strike * 6, L = 14 + Math.sin(T * 30) * 3 + strike * 6;
    ctx.strokeStyle = '#c0283a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx + 6, ty); ctx.lineTo(tx - L, ty); ctx.lineTo(tx - L - 6, ty - 5); ctx.moveTo(tx - L, ty); ctx.lineTo(tx - L - 6, ty + 5); ctx.stroke();
  }
};

/* ---------- carnivorous plant ---------- */
/** One lobe of the trap: hinge at the right, a red rim along the lip and long pale spines. */
const jawSprite = () => hd('t-jaw2', 140, 88, (g, W, H) => {
  const hX = W - 6, hY = H - 8, lip = (t) => { const it = 1 - t; return [it * it * 10 + 2 * it * t * 52 + t * t * hX, it * it * (H - 24) + 2 * it * t * (H - 6) + t * t * hY]; };
  // spines along the lip, under the lobe
  for (let i = 0; i < 13; i++) {
    const t = 0.02 + (i / 12) * 0.86, [px, py] = lip(t), L = 22 - t * 10, a = 1.75 - t * 0.5;
    const ex = px + Math.cos(a) * L, ey = py + Math.sin(a) * L;
    g.fillStyle = lin(g, px, py, ex, ey, [[0, '#d8f0a0'], [0.7, '#f4f6d0'], [1, '#c0303a']]);
    poly(g, [[px - 2.6, py], [px + 2.6, py], [ex, ey]]); g.fill(); g.strokeStyle = 'rgba(40,60,20,0.6)'; g.lineWidth = 0.8; g.stroke();
  }
  const lobe = () => { g.beginPath(); g.moveTo(hX, hY); g.bezierCurveTo(W - 42, 2, 46, -2, 10, H - 24); g.quadraticCurveTo(52, H - 6, hX, hY); g.closePath(); };
  lobe(); g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#b2e874'], [0.5, '#58a844'], [0.8, '#8a3a3a'], [1, '#d23a52']]); g.fill();
  g.save(); lobe(); g.clip();
  g.strokeStyle = '#e03a54'; g.lineWidth = 12; g.beginPath(); g.moveTo(10, H - 24); g.quadraticCurveTo(52, H - 6, hX, hY); g.stroke();
  g.strokeStyle = 'rgba(255,170,180,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, H - 27); g.quadraticCurveTo(52, H - 11, hX - 4, hY - 4); g.stroke();
  g.strokeStyle = 'rgba(16,54,22,0.55)'; g.lineWidth = 1.3;
  for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(hX - 2, hY - 2); g.quadraticCurveTo(W - 44 - i * 8, 16 - i, 22 + i * 13, H - 26 + i * 2); g.stroke(); }
  g.fillStyle = 'rgba(160,30,40,0.35)'; for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(26 + i * 9, 28 + Math.sin(i * 1.7) * 9, 2.2, 1.6, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,230,0.35)'; g.beginPath(); g.ellipse(70, 16, 32, 5, -0.12, 0, TAU); g.fill();
  g.restore();
  lobe(); g.strokeStyle = '#0a2010'; g.lineWidth = 2.2; g.stroke();
});
const flytrapBase = () => hd('t-flybase2', 200, 100, (g, W, H) => {
  const r = U.rng(61);
  for (let i = 0; i < 9; i++) bigLeaf(g, W / 2 + (r() - 0.5) * 34, H, 64 + r() * 36, 15 + r() * 8, -Math.PI / 2 + (r() - 0.5) * 2.7, '#9ad858', '#3c9a44', '#14562e', 0);
  // two small closed buds beside the big head
  for (const [bx, s] of [[W / 2 - 52, 0.9], [W / 2 + 56, 0.75]]) {
    g.strokeStyle = '#2f6a26'; g.lineWidth = 4 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(W / 2, H); g.quadraticCurveTo(bx, H - 20, bx, H - 44 * s); g.stroke();
    g.save(); g.translate(bx, H - 50 * s); g.scale(s, s);
    g.fillStyle = lin(g, -10, 0, 10, 0, [[0, '#b2e874'], [1, '#3c8a3a']]); g.beginPath(); g.ellipse(0, 0, 9, 13, 0.2, 0, TAU); g.fill(); g.strokeStyle = '#0a2010'; g.lineWidth = 1.6; g.stroke();
    g.strokeStyle = '#e03a54'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-2, -12); g.quadraticCurveTo(1, 0, -1, 12); g.stroke();
    g.restore();
  }
});
const drawFlytrap = (ctx, x, floorY, T, snap) => {
  const sway = Math.sin(T * 2.2) * 5 * (1 - snap), hx = x + sway - snap * 22, hy = floorY - 176 + snap * 12;
  // the stalk: a thick living tube with leaves
  const p0 = [x, floorY - 6], p1 = [x + 26, floorY - 70], p2 = [hx + 54, hy + 70], p3 = [hx + 40, hy + 22];
  const path = () => { ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]); };
  tube(ctx, path, 12, { ink: '#0a2010', base: '#4f9a38', light: '#a6e070', belly: '#2f6a26' });
  for (const t of [0.35, 0.6]) { const p = bez(p0, p1, p2, p3, t); bigLeaf(ctx, p[0], p[1], 34, 9, t < 0.5 ? -0.6 : Math.PI + 0.5, '#9ad858', '#3c9a44', '#14562e', 0.1); }
  const open = lerp(0.72, 0.03, snap);
  // inside the mouth: a red glow and a string of drool
  if (open > 0.1) {
    ctx.save(); ctx.translate(hx + 48, hy + 20);
    const L = 112; ctx.fillStyle = rad(ctx, -40, 0, 4, 90, [[0, '#ff6a84'], [0.6, '#a01a34'], [1, '#3a0610']]);
    poly(ctx, [[0, 0], [-Math.cos(open) * L, -Math.sin(open) * L], [-Math.cos(open) * L, Math.sin(open) * L]]); ctx.fill();
    ctx.restore();
    glow(ctx, hx - 18, hy + 20, 52, '#ff4a7a', 0.34 * open);
    const dl = 14 + Math.sin(T * 2) * 6; ctx.strokeStyle = 'rgba(230,255,200,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 30, hy + 20 + Math.sin(open) * 40); ctx.lineTo(hx - 31, hy + 20 + Math.sin(open) * 40 + dl); ctx.stroke();
    ctx.fillStyle = 'rgba(230,255,200,0.8)'; ctx.beginPath(); ctx.arc(hx - 31, hy + 20 + Math.sin(open) * 40 + dl, 2.4, 0, TAU); ctx.fill();
  }
  const jaw = (sgn) => { ctx.save(); ctx.translate(hx + 48, hy + 20); ctx.scale(1, sgn); ctx.rotate(open); ctx.drawImage(jawSprite(), -134, -80, 140, 88); ctx.restore(); };
  jaw(1); jaw(-1);
  put(ctx, flytrapBase(), x - 100, floorY - 98);
};

/* ---------- crushing weight ---------- */
const crusherSprite = () => hd('t-crusher2', 196, 178, (g, W, H) => {
  g.save(); U.rr(g, 8, 0, W - 16, H - 28, 6); g.clip(); texFill(g, stoneTex(), 0, 0, W, H);
  g.fillStyle = lin(g, 8, 0, W - 8, 0, [[0, 'rgba(255,236,190,0.14)'], [0.5, 'rgba(0,0,0,0.02)'], [1, 'rgba(0,0,0,0.66)']]); g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(30, 0); g.lineTo(40, 30); g.lineTo(34, 54); g.moveTo(W - 40, 10); g.lineTo(W - 52, 44); g.stroke();
  for (let i = 0; i < 18; i++) dab(g, 14 + (i * 37) % (W - 28), 2 + (i % 3) * 3, 8 + (i % 4) * 2, 3, Math.PI / 2 + (i % 2 ? 0.4 : -0.4), ['#4d8f34', '#2f6226', '#6fae3f'][i % 3]);
  g.restore();
  U.rr(g, 8, 0, W - 16, H - 28, 6); g.strokeStyle = '#100c06'; g.lineWidth = 2.6; g.stroke();
  // carved border of step-frets
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2.5; g.strokeRect(22, 12, W - 44, H - 56);
  g.strokeStyle = 'rgba(201,162,74,0.7)'; g.lineWidth = 1.4; g.beginPath();
  for (let x = 26; x < W - 34; x += 14) { g.moveTo(x, 20); g.lineTo(x, 15); g.lineTo(x + 9, 15); g.lineTo(x + 9, 19); g.lineTo(x + 5, 19); }
  g.stroke();
  const c = W / 2; g.lineCap = 'round'; g.lineJoin = 'round';
  // a scowling face cut into the block
  g.fillStyle = 'rgba(6,4,2,0.9)';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(c + s * 54, 60); g.quadraticCurveTo(c + s * 31, 42, c + s * 12, 62); g.quadraticCurveTo(c + s * 33, 76, c + s * 54, 60); g.fill(); }
  g.strokeStyle = '#c9a24a'; g.lineWidth = 5; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(c + s * 62, 44); g.lineTo(c + s * 10, 58); g.stroke(); }
  g.fillStyle = 'rgba(6,4,2,0.7)'; poly(g, [[c - 7, 66], [c + 7, 66], [c + 12, 90], [c - 12, 90]]); g.fill();
  U.rr(g, c - 48, 100, 96, 32, 6); g.fillStyle = 'rgba(6,4,2,0.88)'; g.fill();
  g.fillStyle = '#cfc6a4'; for (let i = 0; i < 8; i++) { poly(g, [[c - 44 + i * 11.4, 100], [c - 35 + i * 11.4, 100], [c - 39.5 + i * 11.4, 111]]); g.fill(); }
  for (let i = 0; i < 8; i++) { poly(g, [[c - 44 + i * 11.4, 132], [c - 35 + i * 11.4, 132], [c - 39.5 + i * 11.4, 122]]); g.fill(); }
  for (let i = 0; i < 8; i++) { const x = 19 + i * 22.5; g.fillStyle = lin(g, x - 10, 0, x + 10, 0, [[0, '#26262c'], [0.45, '#d0d6de'], [1, '#17171c']]); poly(g, [[x - 10, H - 30], [x, H - 1], [x + 10, H - 30]]); g.fill(); g.strokeStyle = '#08070a'; g.lineWidth = 1.1; g.stroke(); g.fillStyle = 'rgba(140,24,16,0.5)'; poly(g, [[x - 2, H - 12], [x, H - 1], [x + 2.4, H - 13]]); g.fill(); }
});
const drawCrusher = (ctx, x, y, topY, eyeA) => {
  for (const sx of [-60, 60]) chain(ctx, x + sx, topY, x + sx, y + 6, 12);
  put(ctx, crusherSprite(), x - 98, y);
  for (const s of [-1, 1]) { ctx.fillStyle = U.rgba('#ffb08a', eyeA); ctx.beginPath(); ctx.ellipse(x + s * 32, y + 60, 8, 3.6, 0, 0, TAU); ctx.fill(); glow(ctx, x + s * 32, y + 60, 30, '#ff3a1a', eyeA * 0.75); }
};

/* ---------- falling rock ---------- */
const STAL = ['#0e2a2c', '#3a7470', '#9ad8cc'];
const stalactiteSprite = () => hd('t-stal2', 150, 290, (g, W, H) => {
  const c = W / 2, r = U.rng(17);
  // rock mass where it hangs from the roof
  for (let i = 0; i < 6; i++) rock(g, c + (r() - 0.5) * 80, 10 + r() * 18, 26 + r() * 22, 14 + r() * 10, STAL, r, 0.25, 0.6);
  const cone = (x0, x1, tx, ty) => { g.beginPath(); g.moveTo(x0, 24); g.bezierCurveTo(x0 + 4, ty * 0.35, tx - 12, ty * 0.7, tx, ty); g.bezierCurveTo(tx + 10, ty * 0.7, x1 - 4, ty * 0.35, x1, 24); g.closePath(); };
  for (const [x0, x1, tx, ty, k] of [[c - 34, c + 2, c - 18, H * 0.58, 0.7], [c + 6, c + 46, c + 26, H * 0.5, 0.75], [c - 46, c + 46, c + 2, H - 6, 1]]) {
    cone(x0, x1, tx, ty); g.fillStyle = lin(g, x0, 0, x1, 0, [[0, STAL[2]], [0.42, STAL[1]], [1, STAL[0]]]); g.globalAlpha = k; g.fill(); g.globalAlpha = 1; g.strokeStyle = '#020608'; g.lineWidth = 2; g.stroke();
    g.save(); cone(x0, x1, tx, ty); g.clip();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2; for (let y = 34; y < ty; y += 22) { g.beginPath(); g.moveTo(x0 - 4, y); g.quadraticCurveTo((x0 + x1) / 2, y + 9, x1 + 4, y - 2); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo((x0 + tx) / 2, 30); g.quadraticCurveTo(tx - 4, ty * 0.6, tx, ty - 6); g.stroke();
    g.fillStyle = 'rgba(210,255,240,0.32)'; g.beginPath(); g.moveTo(x0 + 8, 26); g.quadraticCurveTo(x0 + 12, ty * 0.5, tx - 2, ty - 8); g.lineTo(tx - 6, ty - 10); g.quadraticCurveTo(x0 + 6, ty * 0.5, x0 + 4, 26); g.closePath(); g.fill();
    g.restore();
  }
  // glowing crystal veins down its length, so it reads in the dark
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (const [x0, x1, y0, y1] of [[c - 10, c - 2, 60, 230], [c + 14, c + 6, 70, 150], [c - 26, c - 16, 50, 140]]) { g.strokeStyle = 'rgba(90,255,200,0.35)'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2, x1, y1); g.stroke(); g.strokeStyle = 'rgba(200,255,235,0.8)'; g.lineWidth = 1.4; g.stroke(); }
  g.restore();
  // crystals growing where it meets the roof
  for (let i = 0; i < 6; i++) {
    const x = c - 46 + r() * 92, h = 14 + r() * 18, w = 6 + r() * 5, a = Math.PI + (r() - 0.5) * 0.9;
    g.save(); g.translate(x, 26); g.rotate(a);
    poly(g, [[-w / 2, 0], [-w * 0.4, -h * 0.75], [0, -h], [w * 0.4, -h * 0.75], [w / 2, 0]]); g.fillStyle = lin(g, -w / 2, 0, w / 2, 0, [[0, '#9dffd8'], [0.5, '#32d39a'], [1, '#066050']]); g.fill();
    g.fillStyle = 'rgba(235,255,245,0.6)'; poly(g, [[-w * 0.2, -h * 0.1], [-w * 0.2, -h * 0.7], [0, -h], [-w * 0.02, -h * 0.2]]); g.fill();
    g.restore();
  }
});

/* ---------- darts ---------- */
const TOTEM = { W: 100, H: 236, MOUTH: [190, 152, 114] };
/** A carved stone totem: three stacked faces looking at the runner, each with a dart in its mouth. */
const totemSprite = () => hd('t-totem', TOTEM.W, TOTEM.H, (g, W, H) => {
  const r = U.rng(29);
  // plinth and pillar
  g.fillStyle = lin(g, 0, H - 18, 0, H, [[0, '#7a7258'], [1, '#2a281e']]); g.fillRect(4, H - 18, W - 8, 18);
  g.fillStyle = 'rgba(255,245,215,0.3)'; g.fillRect(4, H - 18, W - 8, 1.6);
  g.save(); U.rr(g, 12, 30, W - 24, H - 46, 6); g.clip(); texFill(g, stoneTex(), 0, 0, W, H);
  g.fillStyle = lin(g, 12, 0, W - 12, 0, [[0, 'rgba(255,236,190,0.18)'], [0.45, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.62)']]); g.fillRect(0, 0, W, H);
  g.restore();
  U.rr(g, 12, 30, W - 24, H - 46, 6); g.strokeStyle = '#0c0a06'; g.lineWidth = 2.2; g.stroke();
  // three faces, each looking left
  for (const m of TOTEM.MOUTH) {
    const y = H - m;
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(12, y - 30, W - 24, 2.4); g.fillStyle = 'rgba(201,162,74,0.75)'; g.fillRect(12, y - 27.6, W - 24, 1.6);
    // brow and eye socket
    g.fillStyle = 'rgba(6,4,2,0.88)'; g.beginPath(); g.moveTo(16, y - 16); g.quadraticCurveTo(28, y - 24, 42, y - 17); g.quadraticCurveTo(28, y - 11, 16, y - 16); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(14, y - 23); g.lineTo(44, y - 21); g.stroke();
    // nose ridge at the edge
    g.fillStyle = lin(g, 6, 0, 16, 0, [[0, '#4e4a38'], [1, '#8e876a']]); poly(g, [[12, y - 18], [6, y - 9], [12, y - 7]]); g.fill(); g.strokeStyle = '#0c0a06'; g.lineWidth = 1.2; g.stroke();
    // the mouth, a dark hole with teeth, and the dart waiting in it
    U.rr(g, 9, y - 5, 26, 10, 2); g.fillStyle = '#060402'; g.fill(); g.strokeStyle = '#0c0a06'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#cfc6a4'; for (let i = 0; i < 4; i++) { poly(g, [[12 + i * 6, y - 5], [16 + i * 6, y - 5], [14 + i * 6, y - 1.5]]); g.fill(); }
    g.fillStyle = '#3a2412'; g.fillRect(14, y - 1, 18, 2); g.fillStyle = '#1a1420'; poly(g, [[8, y], [14, y - 2.4], [14, y + 2.4]]); g.fill();
    // ear spool
    g.beginPath(); g.arc(W - 22, y - 12, 6, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 1.6; g.beginPath(); g.arc(W - 22, y - 12, 3, 0, TAU); g.stroke();
  }
  // a crown of stone feathers on top
  for (let k = -3; k <= 3; k++) {
    g.save(); g.translate(W / 2, 34); g.rotate(k * 0.3);
    g.beginPath(); g.ellipse(0, -16, 6, 17, 0, 0, TAU); g.fillStyle = lin(g, -6, 0, 6, 0, [[0, '#a29a78'], [1, '#4e4a38']]); g.fill(); g.strokeStyle = '#0c0a06'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = k % 2 ? '#2fbf8a' : '#c9a24a'; g.beginPath(); g.ellipse(0, -28, 3, 4, 0, 0, TAU); g.fill();
    g.restore();
  }
  for (let i = 0; i < 26; i++) dab(g, 12 + r() * (W - 24), 40 + r() * (H - 70), 6 + r() * 8, 2.6 + r() * 2.4, r() * TAU, ['#4d8f34', '#2f6226', '#6fae3f'][i % 3]);
});
export const drawDart = (ctx, d) => {
  ctx.save(); ctx.translate(d.x, d.y);
  const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = lin(ctx, 20, 0, 150, 0, [[0, 'rgba(255,240,205,0.5)'], [1, 'rgba(255,240,205,0)']]);
  poly(ctx, [[20, -2], [150, -0.5], [150, 0.5], [20, 2]]); ctx.fill();
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = lin(ctx, 0, -2, 0, 2, [[0, '#b0804a'], [1, '#3a2412']]); ctx.fillRect(-2, -1.7, 38, 3.4);
  ctx.fillStyle = '#5aff7a'; ctx.fillRect(2, -1.9, 3.4, 3.8);
  ctx.fillStyle = '#16121c'; poly(ctx, [[-19, 0], [-1, -4.6], [-1, 4.6]]); ctx.fill();
  ctx.fillStyle = 'rgba(200,220,255,0.65)'; poly(ctx, [[-16, -0.4], [-3, -3.4], [-3, -1]]); ctx.fill();
  for (const s of [-1, 1]) { ctx.fillStyle = s < 0 ? '#e0402a' : '#f2b33d'; ctx.beginPath(); ctx.moveTo(26, 0); ctx.quadraticCurveTo(34, s * 9, 42, s * 9.5); ctx.lineTo(38, 0); ctx.closePath(); ctx.fill(); }
  ctx.restore();
};

/* ---------- fire ---------- */
/** A carved fire altar: stepped base, a sun face, and a bronze brazier on top. */
const altarSprite = () => hd('t-altar', 88, 80, (g, W, H) => {
  const c = W / 2;
  g.fillStyle = lin(g, 0, H - 12, 0, H, [[0, '#c99a52'], [1, '#4a2a10']]); g.fillRect(4, H - 12, W - 8, 12);
  g.fillStyle = lin(g, 0, H - 24, 0, H - 12, [[0, '#d8aa60'], [1, '#6a3e18']]); g.fillRect(10, H - 24, W - 20, 12);
  g.save(); g.beginPath(); g.rect(16, 24, W - 32, H - 48); g.clip(); texFill(g, sandTex(), 0, 0, W, H); g.fillStyle = lin(g, 16, 0, W - 16, 0, [[0, 'rgba(255,210,140,0.25)'], [1, 'rgba(30,10,0,0.55)']]); g.fillRect(0, 0, W, H); g.restore();
  g.strokeStyle = '#2a1206'; g.lineWidth = 1.6; g.strokeRect(16, 24, W - 32, H - 48);
  for (const y of [H - 12, H - 24]) { g.fillStyle = 'rgba(255,236,190,0.35)'; g.fillRect(4, y, W - 8, 1.4); }
  // sun face
  const fy = 42;
  g.fillStyle = '#e0b04a';
  for (let i = 0; i < 12; i++) { g.save(); g.translate(c, fy); g.rotate((i / 12) * TAU); poly(g, [[-2.6, -9], [0, -15], [2.6, -9]]); g.fill(); g.restore(); }
  g.beginPath(); g.arc(c, fy, 9.5, 0, TAU); g.fillStyle = rad(g, c - 3, fy - 3, 1, 10, [[0, '#fff0a8'], [1, '#b8781a']]); g.fill(); g.strokeStyle = '#4a2a08'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#4a2a08'; g.beginPath(); g.ellipse(c - 3.4, fy - 2, 1.6, 1, 0, 0, TAU); g.ellipse(c + 3.4, fy - 2, 1.6, 1, 0, 0, TAU); g.fill();
  g.strokeStyle = '#4a2a08'; g.lineWidth = 1.2; g.beginPath(); g.arc(c, fy + 1, 3.6, 0.3, Math.PI - 0.3); g.stroke();
  // brazier
  poly(g, [[8, 8], [W - 8, 8], [W - 18, 24], [18, 24]]); g.fillStyle = lin(g, 8, 0, W - 8, 0, [[0, '#5a3010'], [0.35, '#e8b85a'], [0.6, '#a0661e'], [1, '#3a1e08']]); g.fill(); g.strokeStyle = '#1a0a02'; g.lineWidth = 1.6; g.stroke();
  g.fillStyle = '#ffe08a'; g.fillRect(8, 8, W - 16, 2);
  g.fillStyle = '#150802'; for (let i = 0; i < 6; i++) g.fillRect(20 + i * 9, 13, 4.6, 8);
  g.fillStyle = 'rgba(255,120,40,0.85)'; for (let i = 0; i < 6; i++) g.fillRect(21 + i * 9, 14, 2.6, 3);
});
const drawVents = (ctx, x, floorY, T, burst, seed) => {
  for (const sx of [-50, 50]) {
    const px = x + sx, top = floorY - 72, ht = 30 + Math.sin(T * 9 + sx) * 6 + burst * 280, wd = 15 + burst * 18;
    put(ctx, altarSprite(), px - 44, floorY - 80);
    glow(ctx, px, top - ht * 0.45, 60 + ht * 0.8, '#ff7a1a', 0.2 + burst * 0.42);
    fire(ctx, px, top, wd, ht, T, seed + sx, '#ffb43a', '#ff4a12');
  }
};
/** A crack in the floor full of molten rock. */
const fissureSprite = () => hd('t-fissure', 280, 64, (g, W, H) => {
  const c = W / 2, r = U.rng(41), y0 = 10;
  g.save(); g.translate(c, y0 + 4); g.scale(1, 0.24); g.fillStyle = rad(g, 0, 0, 0, 140, [[0, 'rgba(14,4,0,0.9)'], [1, 'rgba(14,4,0,0)']]); g.fillRect(-140, -140, 280, 280); g.restore();
  const crack = () => { g.beginPath(); g.moveTo(16, y0 + 2); const pts = [[50, y0 - 3], [86, y0 + 6], [118, y0 - 4], [150, y0 + 4], [186, y0 - 4], [222, y0 + 5], [262, y0 + 1]]; pts.forEach((p) => g.lineTo(p[0], p[1])); [[230, y0 + 20], [196, y0 + 14], [158, y0 + 30], [122, y0 + 18], [88, y0 + 32], [54, y0 + 16]].forEach((p) => g.lineTo(p[0], p[1])); g.closePath(); };
  crack(); g.fillStyle = lin(g, 0, y0 - 4, 0, y0 + 32, [[0, '#ff4a0a'], [0.4, '#ffb03a'], [1, '#ff6a14']]); g.fill();
  g.save(); crack(); g.clip();
  g.strokeStyle = '#fff2b0'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, y0 + 8); g.bezierCurveTo(90, y0 + 18, 150, y0 + 4, 240, y0 + 10); g.stroke();
  g.fillStyle = 'rgba(80,16,0,0.55)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(30 + r() * 220, y0 + 4 + r() * 20, 6 + r() * 10, 2 + r() * 3, 0, 0, TAU); g.fill(); }
  g.restore();
  crack(); g.strokeStyle = '#0a0300'; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 12; i++) rock(g, 20 + (i * 22) + r() * 8, y0 + (i % 2 ? -4 : 26) + r() * 4, 10 + r() * 8, 5 + r() * 3, ['#120602', '#3a1608', '#6a3416'], r, 0, 0.8);
});
const drawGeyser = (ctx, x, floorY, T, burst, seed) => {
  put(ctx, fissureSprite(), x - 140, floorY - 8);
  glow(ctx, x, floorY + 6, 150, '#ff6a14', 0.3 + 0.1 * Math.sin(T * 4), 30);
  // molten bubbles rising and popping
  for (let i = 0; i < 6; i++) { const ph = U.wrap(T * 0.9 + i * 0.37, 1), bx = x - 100 + ((i * 47) % 200), by = floorY + 10 - ph * 10, rr = 2 + ph * 4; ctx.fillStyle = U.rgba('#ffd27a', 1 - ph); ctx.beginPath(); ctx.arc(bx, by, rr, 0, TAU); ctx.fill(); }
  const ht = 14 + Math.sin(T * 7) * 4 + burst * 330, wd = 26 + burst * 36;
  glow(ctx, x, floorY - ht * 0.5, 80 + ht * 0.9, '#ff6a14', 0.26 + burst * 0.5);
  fire(ctx, x, floorY + 4, wd, ht, T, seed, '#ffcf5a', '#ff3a0a');
  if (burst > 0.2) for (let i = 0; i < 12; i++) { const a = T * 3 + i * 0.7, rr = burst * (40 + i * 10), px = x + Math.sin(a * 2 + i) * rr * 0.6, py = floorY - U.wrap(T * 480 + i * 40, ht * 1.05); ctx.fillStyle = i % 2 ? '#ffd27a' : '#ff6a14'; ctx.beginPath(); ctx.arc(px, py, 3.4, 0, TAU); ctx.fill(); }
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
    for (const m of TOTEM.MOUTH) api.dart(t.x - 38, -m, sp);
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
  if (t.kind === 'punji') put(ctx, pitSprite('punji'), x - PIT.W / 2, floorY - PIT.TOP - 1);
  else if (t.kind === 'spikes') {
    put(ctx, pitSprite('spikes', tint, E.pitWall), x - PIT.W / 2, floorY - PIT.TOP - 1);
    glow(ctx, x, floorY + 74, 116, tint, 0.28 + 0.08 * Math.sin(T * 5));
  }
  else if (t.kind === 'fallen') put(ctx, fallenSprite(), x - FALL.CX, floorY - FALL.H + 5);
  else if (t.kind === 'python') drawPython(ctx, x, floorY, T, !betting && tau > -0.34 ? clampStrike(tau, 0.46, 0.2) : 0);
  else if (t.kind === 'flytrap') drawFlytrap(ctx, x, floorY, T, !betting && tau > -0.5 ? clampStrike(tau, 0.28, 0.1) : 0);
  else if (t.kind === 'darts') {
    const tx = x - 48; put(ctx, totemSprite(), tx, floorY - TOTEM.H + 4);
    const armed = tau < 1.3 && tau > -0.4 ? 1 : 0.35;
    for (const m of TOTEM.MOUTH) glow(ctx, tx + 29, floorY - m - 12, 16, '#ff3a1a', armed * (0.55 + 0.3 * Math.sin(T * 9)));
  }
  else if (t.kind === 'flames') { const t0 = E.firedAt(t.j, 'burst'), a = t0 == null ? 99 : T - t0; drawVents(ctx, x, floorY, T, a < 0.1 ? a / 0.1 : Math.max(0, 1 - (a - 0.1) / 0.7), t.j); }
  else if (t.kind === 'geyser') { const t0 = E.firedAt(t.j, 'burst'), a = t0 == null ? 99 : T - t0; drawGeyser(ctx, x, floorY, T, a < 0.1 ? a / 0.1 : Math.max(0, 1 - (a - 0.1) / 0.85), t.j); }
};

/** Drawn in front of the runner. */
export const drawTrapFront = (ctx, t, E) => {
  const { x, tau } = t, { floorY, T, ext } = E;
  if (t.kind === 'log') drawLog(ctx, x, floorY, tau, ext);
  else if (t.kind === 'blade') drawBlade(ctx, x, 40, floorY, tau, T);
  else if (t.kind === 'crusher') {
    const rest = floorY - 174, up = rest - 250, t0 = E.firedAt(t.j, 'slam');
    let y = up + (t0 == null && tau < 1 ? Math.sin(T * 34) * 1.6 : 0);
    if (t0 != null) { const a = T - t0; y = a < 0.11 ? lerp(up, rest, (a / 0.11) * (a / 0.11)) : a < 0.6 ? rest : lerp(rest, up, smooth((a - 0.6) / 1.4)); }
    drawCrusher(ctx, x, y, -ext, 0.5 + 0.3 * Math.sin(T * 5));
  }
  else if (t.kind === 'stalactite') {
    const t0 = E.firedAt(t.j, 'drop');
    if (t0 != null && T - t0 >= 0.32) return; // shattered
    const a = t0 == null ? 0 : T - t0, y = 30 + (t0 == null ? 0 : 0.5 * 2800 * a * a), shaking = t0 == null && tau < 0.75, sh = shaking ? Math.sin(T * 60) * 2.2 : 0;
    put(ctx, stalactiteSprite(), x - 75 + sh, y - 20);
    // a glowing drip at the tip, and grit falling as it works loose
    if (t0 == null) { const dy = U.wrap(T * 1.4, 1); ctx.fillStyle = U.rgba('#9dffd8', 0.9 * (1 - dy)); ctx.beginPath(); ctx.ellipse(x + 2, y + 270 + dy * 60, 2.4, 3.4, 0, 0, TAU); ctx.fill(); glow(ctx, x + 2, y + 268, 18, '#5cffc0', 0.5); }
    if (shaking) for (let i = 0; i < 5; i++) { const ph = U.wrap(T * 2.2 + i * 0.23, 1), gx = x - 30 + i * 15, gy = 40 + ph * 300; ctx.fillStyle = 'rgba(80,120,110,' + (0.8 * (1 - ph)).toFixed(2) + ')'; ctx.fillRect(gx, gy, 3, 3); }
  }
};
