/* The split. The jungle ends at a cliff: stairs climb to the blazing Sun Gate above, a ramp drops into the
   jaws of a colossal stone serpent below. Up or down reads instantly, on wide and on tall screens alike.
   Local coordinates: origin where the two paths part, at floor level; y is negative upwards. */
import { U, TAU, clamp, lerp, smooth, sprite, put, lin, rad, glow, fire, dab, vine, fern, texFill, stoneTex, slateTex, sandTex, rock, foliage, ramp16, INK } from './kit.js';
import { flower, FLOWERS } from './relics.js';

export const PX = 400, TOP = -160, LOW = 52; const HK = 0.84; // portal centre, upper landing height, lower ramp foot
const OX = 40, OY = 480, FW = 1360, FH = 800; // sprite origin and size
const LEAF = ramp16([[0, '#04261f'], [0.4, '#14583a'], [0.75, '#39923f'], [1, '#b6e062']]);

const paintFacade = (g, W, H) => {
  g.translate(OX, OY);
  const r = U.rng(5);
  // the cliff: a jagged left edge, filled to the right of the frame
  const cliff = () => { g.beginPath(); g.moveTo(1320, 330); g.lineTo(150, 330); g.lineTo(150, 170); const ys = [60, 0, -70, -150, -240, -330, -420, -480]; ys.forEach((y, i) => g.lineTo(130 - (i % 2) * 34 - i * 8 + r() * 22, y)); g.lineTo(1320, -480); g.closePath(); };
  cliff(); g.save(); g.clip(); texFill(g, stoneTex(), -60, -500, 1500, 860);
  g.fillStyle = lin(g, 60, 0, 1000, 0, [[0, 'rgba(8,30,28,0.32)'], [0.4, 'rgba(10,14,12,0.5)'], [1, 'rgba(4,6,8,0.78)']]); g.fillRect(-60, -500, 1500, 860);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; for (let y = -470; y < 330; y += 44) { g.beginPath(); g.moveTo(-60, y + Math.sin(y) * 10); g.bezierCurveTo(300, y - 18, 700, y + 18, 1400, y); g.stroke(); }
  for (let i = 0; i < 26; i++) rock(g, 80 + r() * 1100, -470 + r() * 620, 40 + r() * 70, 22 + r() * 38, ['#141a16', '#2c332a', '#4f5546'], r, 0.3);
  g.restore();

  // the rock prow between the roads, under the stairs
  g.beginPath(); g.moveTo(84, 0); g.lineTo(PX - 80, TOP); g.lineTo(PX - 70, TOP + 30); g.lineTo(PX - 100, TOP + 80); g.lineTo(PX - 196, LOW - 54); g.lineTo(PX - 150, LOW + 54); g.lineTo(74, 2); g.closePath();
  g.save(); g.clip(); texFill(g, stoneTex(), 60, -180, 380, 340); g.fillStyle = 'rgba(10,18,14,0.5)'; g.fillRect(60, -180, 380, 340); g.restore();

  /* ---- the Sun Gate, high on the cliff ---- */
  const cx = PX, base = TOP;
  // stepped golden frame rising around the door
  for (let i = 5; i >= 0; i--) {
    const ww = 300 - i * 34, top = base - 300 + i * 24;
    g.save(); g.beginPath(); g.rect(cx - ww / 2, top, ww, base - top); g.clip(); texFill(g, sandTex(), cx - ww, top, ww * 2, base - top);
    g.fillStyle = lin(g, cx - ww / 2, 0, cx + ww / 2, 0, [[0, 'rgba(255,214,130,0.28)'], [0.5, 'rgba(120,60,10,0.2)'], [1, 'rgba(30,10,2,0.62)']]); g.fillRect(cx - ww, top, ww * 2, base - top); g.restore();
    g.fillStyle = '#ffd77e'; g.fillRect(cx - ww / 2, top, ww, 3); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(cx - ww / 2, top + 3, ww, 2);
  }
  // arch opening
  const aw = 136, atop = base - 216;
  const arch = () => { g.beginPath(); g.moveTo(cx - aw / 2, base); g.lineTo(cx - aw / 2, atop + aw / 2); g.arc(cx, atop + aw / 2, aw / 2, Math.PI, TAU); g.lineTo(cx + aw / 2, base); g.closePath(); };
  arch(); g.fillStyle = rad(g, cx, base - 70, 10, 220, [[0, '#ffe9a8'], [0.3, '#ffae3c'], [0.7, '#a84a12'], [1, '#2a0f06']]); g.fill();
  g.save(); arch(); g.clip(); for (let s = 0; s < 8; s++) { g.fillStyle = 'rgba(255,240,190,' + (0.24 - s * 0.02) + ')'; g.fillRect(cx - aw / 2, base - 6 - s * 11, aw, 2.4); } g.restore();
  arch(); g.strokeStyle = '#2a1206'; g.lineWidth = 26; g.stroke(); g.strokeStyle = lin(g, cx - aw / 2, 0, cx + aw / 2, 0, [[0, '#ffd77e'], [0.5, '#c98a2c'], [1, '#6a3a12']]); g.lineWidth = 18; g.stroke();
  g.strokeStyle = 'rgba(40,20,6,0.8)'; g.lineWidth = 2; for (let k = 1; k < 9; k++) { const a = Math.PI + (k * Math.PI) / 9, cy = atop + aw / 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * (aw / 2 - 9), cy + Math.sin(a) * (aw / 2 - 9)); g.lineTo(cx + Math.cos(a) * (aw / 2 + 9), cy + Math.sin(a) * (aw / 2 + 9)); g.stroke(); }

  /* ---- the serpent's head, jaws open towards the runner ---- */
  const sy = LOW + 6;
  g.save(); g.translate(PX, sy); g.scale(HK, HK); g.translate(-PX, -sy);
  // mouth interior first
  g.beginPath(); g.moveTo(PX - 158, sy - 58); g.quadraticCurveTo(PX + 20, sy - 96, PX + 980, sy - 38); g.lineTo(PX + 980, sy + 70); g.quadraticCurveTo(PX, sy + 130, PX - 140, sy + 72); g.closePath();
  g.fillStyle = rad(g, PX + 90, sy + 10, 8, 260, [[0, '#5ff0c0'], [0.22, '#14a483'], [0.6, '#05403a'], [1, '#02100e']]); g.fill();
  // ribs of the throat
  g.strokeStyle = 'rgba(0,30,24,0.55)'; g.lineWidth = 9; for (let i = 0; i < 4; i++) { const x = PX - 60 + i * 62; g.beginPath(); g.moveTo(x, sy - 92 + i * 6); g.quadraticCurveTo(x + 26, sy + 10, x, sy + 104 - i * 4); g.stroke(); }
  // lower jaw
  const stone = lin(g, 0, sy - 180, 0, sy + 150, [[0, '#7fae96'], [0.4, '#3f7468'], [1, '#0d2b2a']]);
  g.beginPath(); g.moveTo(PX - 196, sy + 62); g.quadraticCurveTo(PX - 150, sy + 56, PX - 120, sy + 74); g.quadraticCurveTo(PX + 10, sy + 124, PX + 980, sy + 70); g.lineTo(PX + 980, sy + 320); g.lineTo(PX - 200, sy + 320); g.closePath();
  g.fillStyle = stone; g.fill(); g.strokeStyle = '#04100e'; g.lineWidth = 3; g.stroke();
  for (const [x, h] of [[-168, 34], [-136, 22], [-104, 26], [-70, 18]]) { const fy = sy + 68 + (x + 168) * 0.28; g.beginPath(); g.moveTo(PX + x - 9, fy + 2); g.lineTo(PX + x, fy - h); g.lineTo(PX + x + 9, fy + 2); g.closePath(); g.fillStyle = lin(g, PX + x - 9, 0, PX + x + 9, 0, [[0, '#f4efdc'], [1, '#a59a78']]); g.fill(); g.strokeStyle = '#1a1408'; g.lineWidth = 1.2; g.stroke(); }
  // upper jaw and skull, carrying the landing above it
  g.beginPath(); g.moveTo(PX - 220, sy - 62); g.quadraticCurveTo(PX - 196, sy - 110, PX - 110, sy - 124); g.quadraticCurveTo(PX + 40, sy - 176, PX + 980, sy - 150); g.lineTo(PX + 980, sy - 38); g.quadraticCurveTo(PX + 20, sy - 92, PX - 150, sy - 58); g.quadraticCurveTo(PX - 196, sy - 54, PX - 220, sy - 62); g.closePath();
  g.fillStyle = stone; g.fill(); g.strokeStyle = '#04100e'; g.lineWidth = 3; g.stroke();
  g.save(); g.clip();
  for (let row = 0; row < 7; row++) for (let i = 0; i < 62; i++) { const x = PX - 200 + i * 20 + (row % 2) * 10, y = sy - 168 + row * 18 + i * -0.4; g.strokeStyle = 'rgba(4,20,18,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 9.5, 0.25, Math.PI - 0.25); g.stroke(); g.strokeStyle = 'rgba(190,255,225,0.12)'; g.lineWidth = 1; g.beginPath(); g.arc(x - 1, y - 2, 8.5, 3.6, 5.8); g.stroke(); }
  g.restore();
  for (const [x, h] of [[-178, 62], [-126, 40], [-84, 30], [-44, 26]]) { const fy = sy - 58 + (x + 178) * -0.06; g.beginPath(); g.moveTo(PX + x - 12, fy - 3); g.lineTo(PX + x + 1, fy + h); g.lineTo(PX + x + 12, fy - 3); g.closePath(); g.fillStyle = lin(g, PX + x - 12, 0, PX + x + 12, 0, [[0, '#fff8e8'], [0.6, '#d0c8a4'], [1, '#8d8460']]); g.fill(); g.strokeStyle = '#1a1408'; g.lineWidth = 1.4; g.stroke(); }
  // brow and eye socket (the eye itself is lit each frame); nostril
  g.beginPath(); g.moveTo(PX - 122, sy - 128); g.quadraticCurveTo(PX - 56, sy - 158, PX + 6, sy - 134); g.quadraticCurveTo(PX - 60, sy - 134, PX - 122, sy - 128); g.fillStyle = '#071c1a'; g.fill();
  g.beginPath(); g.ellipse(PX - 56, sy - 118, 24, 13, -0.08, 0, TAU); g.fillStyle = '#031210'; g.fill();
  g.beginPath(); g.ellipse(PX - 186, sy - 92, 7, 4, -0.5, 0, TAU); g.fillStyle = '#031210'; g.fill();
  g.restore();

  /* ---- the two roads ---- */
  // ramp down: side wall and walking surface
  g.beginPath(); g.moveTo(70, 0); g.lineTo(PX - 150, LOW + 54); g.lineTo(PX - 150, 330); g.lineTo(70, 330); g.closePath(); g.save(); g.clip(); texFill(g, slateTex(), 40, -20, 400, 360); g.fillStyle = lin(g, 0, 0, 0, 200, [[0, 'rgba(0,20,18,0.1)'], [1, 'rgba(0,8,10,0.86)']]); g.fillRect(40, -20, 400, 360); g.restore();
  g.lineWidth = 7; g.strokeStyle = '#7fae96'; g.lineCap = 'butt'; g.beginPath(); g.moveTo(70, 2); g.lineTo(PX - 150, LOW + 56); g.stroke();
  g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.moveTo(70, 7); g.lineTo(PX - 150, LOW + 61); g.stroke();
  // stairs up: each step a tread and a riser, so the rock and the serpent show beneath them
  for (let i = 0; i < 11; i++) { const x0 = 84 + (i * (PX - 80 - 84)) / 11, dx = (PX - 80 - 84) / 11, y = (i * TOP) / 11; g.fillStyle = lin(g, 0, y - 15, 0, y + 22, [[0, '#ffdf98'], [0.18, '#c9a05a'], [1, '#4a2a10']]); g.fillRect(x0, y - 14.5, dx + 1, 38); g.fillStyle = '#ffe9b0'; g.fillRect(x0, y - 14.5, dx + 1, 2.4); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 + dx - 1.5, y - 14.5, 2, 38); }
  g.fillStyle = lin(g, 0, TOP - 2, 0, TOP + 40, [[0, '#ffdf98'], [0.14, '#c9a05a'], [1, '#4a2a10']]); g.fillRect(PX - 80, TOP - 1, 280, 40); g.fillStyle = '#ffe9b0'; g.fillRect(PX - 80, TOP - 1, 280, 2.4);
  g.fillStyle = '#ffd24d'; g.fillRect(PX - 80, TOP + 20, 280, 2);

  // vines and growth where the jungle meets the rock
  for (let i = 0; i < 34; i++) { const x = 90 + r() * 560, y = -470 + r() * 40; vine(g, x, y, 90 + r() * 260, (r() - 0.5) * 40, '#27481c', ['#4f9a38', '#3a7f2e', '#6fb642'], r, 15, 1.05); }
  for (let i = 0; i < 16; i++) foliage(g, 60 + r() * 700, -470 + r() * 50, 70 + r() * 100, 34 + r() * 40, LEAF, r, 150, 1.1);
  for (let i = 0; i < 12; i++) foliage(g, 66 + r() * 60, -300 + r() * 280, 34 + r() * 34, 40 + r() * 50, LEAF, r, 90, 1);
  for (let i = 0; i < 14; i++) flower(g, 70 + r() * 640, -440 + r() * 300, 5 + r() * 4, FLOWERS[i % 3]);

  /* ---- route stone at the parting of the ways ---- */
  const sx = 106;
  g.save(); g.translate(sx, 0); U.rr(g, -26, -150, 52, 152, 6); g.save(); g.clip(); texFill(g, stoneTex(), -30, -160, 70, 170); g.fillStyle = lin(g, -26, 0, 26, 0, [[0, 'rgba(255,230,180,0.2)'], [1, 'rgba(0,0,0,0.62)']]); g.fillRect(-30, -160, 70, 170); g.restore();
  U.rr(g, -26, -150, 52, 152, 6); g.strokeStyle = '#0c0a06'; g.lineWidth = 2.4; g.stroke();
  g.strokeStyle = '#d9b25a'; g.lineWidth = 4.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(0, -56); g.lineTo(0, -80); g.lineTo(-13, -102); g.moveTo(0, -80); g.lineTo(13, -102); g.moveTo(-13, -102); g.lineTo(-13, -92); g.moveTo(-13, -102); g.lineTo(-3, -102); g.moveTo(13, -102); g.lineTo(13, -92); g.moveTo(13, -102); g.lineTo(3, -102); g.stroke();
  g.restore();
};

export const facadeImg = () => sprite('facade', FW, FH, 1.2, paintFacade);

/** k scales the whole set-piece so both doors fit on narrow screens. */
export const forkScale = (w, exX) => clamp((w - exX + 30) / (PX + 180), 0.6, 1);

export const drawFacade = (ctx, x0, floorY, k, S, T, ext) => {
  const c = facadeImg(), img = (x, y) => [x0 + x * k, floorY + y * k], sel = S.route;
  // rock continues above tall screens
  if (ext > 0) { ctx.fillStyle = '#10140f'; ctx.fillRect(x0 + 120 * k, -ext - 40, 2000, floorY - OY * k + ext + 42); }
  ctx.fillStyle = '#050807'; ctx.fillRect(-2000, floorY + 312 * k, 8000, 1600);
  ctx.drawImage(c, x0 - OX * k, floorY - OY * k, FW * k, FH * k);
  const p = 0.72 + 0.28 * Math.sin(T * 4.2);
  // light spilling from whichever door is chosen
  const [sx, sy] = img(PX, TOP - 90), [lx, ly] = img(PX + 60, LOW + 10);
  glow(ctx, sx, sy, 300 * k, '#ffcf6a', sel === 'R' ? 0.62 * p : 0.14);
  glow(ctx, sx, sy + 60 * k, 110 * k, '#fff6d0', sel === 'R' ? 0.7 * p : 0.14);
  glow(ctx, lx, ly, 280 * k, '#35e8a8', sel === 'L' ? 0.34 * p : 0.08);
  glow(ctx, lx + 40 * k, ly, 90 * k, '#caffef', sel === 'L' ? 0.26 * p : 0.04);
  // the serpent's eye
  const [ex, ey] = img(PX - 56 * HK, LOW + 6 - 118 * HK);
  ctx.fillStyle = sel === 'L' ? '#d0ffe8' : '#62c49a'; ctx.beginPath(); ctx.ellipse(ex, ey, 13 * k, 6.5 * k, -0.08, 0, TAU); ctx.fill();
  ctx.fillStyle = '#04100e'; ctx.beginPath(); ctx.ellipse(ex + 2 * k, ey, 2.6 * k, 7 * k, 0, 0, TAU); ctx.fill();
  glow(ctx, ex, ey, 52 * k, '#5cffc0', sel === 'L' ? 0.8 * p : 0.3);
  // chevrons racing along the chosen road
  const chev = (ax, ay, bx, by, col) => {
    const dx = bx - ax, dy = by - ay, a = Math.atan2(dy, dx);
    for (let i = 0; i < 6; i++) {
      const t = U.wrap(T * 0.8 + i / 6, 1), x = x0 + (ax + dx * t) * k, y = floorY + (ay + dy * t - 26) * k, s = 11 * k;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = Math.sin(t * Math.PI); ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, -s * 0.72); ctx.lineTo(-s * 0.3, 0); ctx.lineTo(-s * 0.7, s * 0.72); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  };
  if (sel === 'R') chev(110, -8, PX - 100, TOP - 8, '#ffe28a'); else chev(120, 42, PX - 176, LOW + 46, '#7dffc8');
  // the two names
  const names = S.routes, plaque = (px, py, name, col, on, up) => {
    const f = Math.max(13, Math.round(20 * k)); ctx.font = '800 ' + f + 'px "Big Shoulders Display", sans-serif'; ctx.textAlign = 'center'; const tw = ctx.measureText(name.toUpperCase()).width + 36 * k, ph = f + 13 * k, X = x0 + px * k, Y = floorY + py * k;
    ctx.fillStyle = on ? col : 'rgba(6,10,6,0.86)'; U.rr(ctx, X - tw / 2, Y - ph / 2, tw, ph, 6 * k); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = on ? '#0b120a' : col; ctx.fillText((up ? '▲ ' : '▼ ') + name.toUpperCase(), X, Y + f * 0.35);
  };
  plaque(PX - 260, TOP - 48, names.R.name, names.R.color, sel === 'R', true);
  plaque(PX - 268, LOW + 20, names.L.name, names.L.color, sel === 'L', false);
  // torches flanking the stairs
  for (const lx2 of [PX - 74, PX + 74]) {
    const [tx, ty] = img(lx2, TOP - 58);
    ctx.fillStyle = '#2a1206'; ctx.fillRect(tx - 3 * k, ty, 6 * k, 58 * k); ctx.fillStyle = '#ffd24d'; ctx.fillRect(tx - 9 * k, ty - 3 * k, 18 * k, 4 * k);
    fire(ctx, tx, ty - 2 * k, 12 * k, 44 * k, T, lx2, '#ffb43a', '#ff4a12'); glow(ctx, tx, ty - 18 * k, 120 * k, '#ff9a3c', 0.34);
  }
  // the split multiplier on the route stone
  ctx.font = '900 ' + Math.max(14, Math.round(21 * k)) + 'px "Big Shoulders Display", sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillText((S.fork || 1.8).toFixed(2) + '×', x0 + 107 * k, floorY - 113 * k + 1.5); ctx.fillStyle = '#ffd36a'; ctx.fillText((S.fork || 1.8).toFixed(2) + '×', x0 + 106 * k, floorY - 114 * k);
};

/** Where the runner is, e in 0..1 along his chosen road. Returns local x, y, a depth scale and a slope. */
export const forkPath = (route, e) => {
  const pts = route === 'R' ? [[0, 0], [86, -4], [PX - 84, TOP], [PX - 8, TOP]] : [[0, 0], [78, 2], [PX - 150, LOW + 52], [PX - 46, LOW + 40]];
  const seg = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  let d = e * tot, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
  const u = clamp(d / seg[i], 0, 1), a = pts[i], b = pts[i + 1];
  return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), slope: Math.atan2(b[1] - a[1], b[0] - a[0]), depth: lerp(1, 0.52, smooth((e - 0.68) / 0.32)), fade: 1 - smooth((e - 0.84) / 0.16) };
};
/** The point the camera pushes into. */
export const forkFocus = (route) => (route === 'R' ? [PX, TOP - 100] : [PX + 70, LOW + 8]);
