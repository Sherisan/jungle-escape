/* Painter's kit for the Jungle Escape world: cached sprites and tileable strips, plus the brushes
   everything is built from (foliage masses, trunks, ferns, broad leaves, rocks, dust, flame, glow).
   All of it paints once into offscreen canvases, so a frame is mostly drawImage calls. */
import { CG } from '../../engine/core.js';
import '../../engine/art.js';

export const U = CG.U;
export const TAU = Math.PI * 2;
export const clamp = U.clamp, lerp = U.lerp, smooth = U.smooth;

/* ---------- sprites ---------- */
let Q = 1; // overall art resolution; small screens paint less
export const setQuality = (q) => { Q = q; };

/** Sprite with a logical size w x h, painted at `res` pixels per unit. */
export const sprite = (key, w, h, res, paint) => {
  const r = res * Q;
  const c = U.sprite(key + '@' + r.toFixed(2), Math.ceil(w * r), Math.ceil(h * r), (g, W, H) => { g.scale(W / w, H / h); paint(g, w, h); });
  c.lw = w; c.lh = h; return c;
};
export const hd = (key, w, h, paint) => sprite(key, w, h, 2, paint);
export const put = (ctx, c, x, y, k = 1) => ctx.drawImage(c, x, y, c.lw * k, c.lh * k);

/** Horizontally tileable layer. Paint uses its own seeded rng, so the three passes line up across the seam. */
export const strip = (key, W, H, res, paint, finish) => sprite(key, W, H, res, (g) => {
  for (const dx of [-W, 0, W]) { g.save(); g.translate(dx, 0); paint(g, W, H); g.restore(); }
  if (finish) { g.save(); g.globalCompositeOperation = 'source-atop'; finish(g, W, H); g.restore(); }
});
export const drawStrip = (ctx, c, scroll, y, w, k = 1) => {
  const W = c.lw * k, H = c.lh * k;
  for (let x = -U.wrap(scroll + 60, W) - 60; x < w + 60; x += W) ctx.drawImage(c, x, y, W + 0.6, H);
};

/* ---------- textures: periods divide 1536, so strips of that width tile cleanly ---------- */
export const stoneTex = () => U.rockTile('je-stone2', 256, '#1b2421', '#80816f', { scale: 0.04, seed: 77 });
export const earthTex = () => U.rockTile('je-earth', 256, '#1d140c', '#6d5236', { scale: 0.05, seed: 31 });
export const slateTex = () => U.rockTile('je-slate', 256, '#06141a', '#3d6668', { scale: 0.035, seed: 53 });
export const sandTex = () => U.rockTile('je-sand', 256, '#3a2110', '#c79a55', { scale: 0.04, seed: 19 });
export const texFill = (g, tex, x, y, w, h) => { g.fillStyle = g.createPattern(tex, 'repeat'); g.fillRect(x, y, w, h); };

/* ---------- colour ---------- */
export const lin = (g, x0, y0, x1, y1, stops) => U.lin(g, x0, y0, x1, y1, stops);
export const rad = (g, x, y, r0, r1, stops) => U.rad(g, x, y, r0, r1, stops);
export const ramp16 = (stops) => {
  const a = []; for (let i = 0; i < 16; i++) a.push(U.ramp(stops, i / 15));
  return (t) => a[Math.max(0, Math.min(15, Math.round(t * 15)))];
};

/* ---------- light ---------- */
const glowCache = {};
export const glowImg = (col) => glowCache[col] || (glowCache[col] = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, U.rgba(col, 1)); gr.addColorStop(0.22, U.rgba(col, 0.6)); gr.addColorStop(0.55, U.rgba(col, 0.16)); gr.addColorStop(1, U.rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
})());
/** Soft additive glow; rx/ry let it be squashed into a floor pool. Sets and restores the blend mode. */
export const glow = (ctx, x, y, rx, col, a, ry = rx) => {
  if (a <= 0.003) return;
  const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glowImg(col), x - rx, y - ry, rx * 2, ry * 2);
  ctx.globalCompositeOperation = op; ctx.globalAlpha = ga;
};

/* ---------- plant brushes ---------- */
/** One leaf-shaped dab, the basic stroke of every plant. */
export const dab = (g, x, y, L, W, a, col) => {
  const c = Math.cos(a), s = Math.sin(a), ex = x + c * L, ey = y + s * L, mx = x + c * L * 0.48, my = y + s * L * 0.48, nx = -s * W, ny = c * W;
  g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx + nx, my + ny, ex, ey); g.quadraticCurveTo(mx - nx, my - ny, x, y); g.fill();
};

/** Round mass of leaves lit from the upper left: dark dabs first, sunlit ones last, so it reads as a volume. */
export const foliage = (g, cx, cy, rx, ry, ramp, r, n, s = 1) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()), nx = Math.cos(a) * d, ny = Math.sin(a) * d;
    pts.push([nx, ny, clamp(0.5 - 0.55 * ny - 0.3 * nx + (r() - 0.5) * 0.34, 0, 1), r()]);
  }
  pts.sort((a, b) => a[2] - b[2]);
  for (const [nx, ny, lit, v] of pts) {
    const L = (9 + v * 13) * s, ang = -Math.PI / 2 + nx * 1.3 + (v - 0.5) * 2.2 + (ny > 0 ? Math.PI * 0.9 : 0);
    dab(g, cx + nx * rx, cy + ny * ry, L, L * 0.36, ang, ramp(lit));
  }
};

/** Tapered tree trunk, sunlit on its left, with bark grooves, moss and flared buttress roots. */
export const trunk = (g, x, base, top, w0, w1, lean, pal, r, moss = 0.6, roots = 4) => {
  const h = top - base, edge = (sd) => {
    g.bezierCurveTo(x + sd * w0 * 0.42 + lean * 0.2, base + h * 0.33, x + sd * w1 * 0.62 + lean * 0.7, base + h * 0.68, x + sd * w1 / 2 + lean, top);
  };
  const body = () => {
    g.beginPath(); g.moveTo(x - w0 / 2, base); edge(-1); g.lineTo(x + w1 / 2 + lean, top);
    g.bezierCurveTo(x + w1 * 0.62 + lean * 0.7, base + h * 0.68, x + w0 * 0.42 + lean * 0.2, base + h * 0.33, x + w0 / 2, base); g.closePath();
  };
  for (let i = 0; i < roots; i++) { // buttress roots
    const sd = i % 2 ? 1 : -1, rw = w0 * (0.8 + r() * 0.7), rh = w0 * (0.9 + r() * 1.1), o = (r() - 0.5) * w0 * 0.3;
    g.beginPath(); g.moveTo(x + o - sd * w0 * 0.2, base - rh); g.quadraticCurveTo(x + o + sd * w0 * 0.4, base - rh * 0.25, x + o + sd * rw, base + 3); g.lineTo(x + o - sd * w0 * 0.3, base + 3); g.closePath();
    g.fillStyle = lin(g, x + o - rw, 0, x + o + rw, 0, [[0, pal.light], [0.4, pal.mid], [1, pal.deep]]); g.fill();
  }
  body(); g.fillStyle = lin(g, x - w0 / 2 + lean * 0.3, 0, x + w0 / 2 + lean * 0.3, 0, [[0, pal.mid], [0.16, pal.light], [0.5, pal.mid], [0.82, pal.dark], [1, pal.deep]]); g.fill();
  g.save(); body(); g.clip();
  g.lineCap = 'round';
  const n = Math.round(w0 / 3.2);
  for (let i = 0; i < n; i++) { // bark grooves running up the tree
    const u = r(), x0 = x - w0 / 2 + u * w0; let px = x0, py = base + 6;
    g.strokeStyle = r() < 0.72 ? U.rgba(pal.groove, 0.24 + r() * 0.34) : U.rgba(pal.hi, 0.1 + r() * 0.16); g.lineWidth = 1 + r() * 2.6; g.beginPath(); g.moveTo(px, py);
    const stop = base + h * (0.25 + r() * 0.75), lp = lean / Math.max(1, -h);
    while (py > stop) { py -= 14 + r() * 26; px += (r() - 0.5) * 7 + lp * -28 + (x0 < x ? 0.8 : -0.8); g.lineTo(px, py); }
    g.stroke();
  }
  g.restore();
  for (let i = 0; i < 90 * moss * (w0 / 60); i++) { // moss creeping over the lit side
    const t = Math.pow(r(), 1.4), y = base + h * t, cx = x + lean * t - lerp(w0, w1, t) * (0.08 + r() * 0.42);
    dab(g, cx, y, 7 + r() * 10, 3 + r() * 3, r() * TAU, [pal.moss0, pal.moss1, pal.moss2][Math.floor(r() * 3)]);
  }
};

/** Hanging liana with leaves along it. Returns nothing; ends at (x + bend, y + len). */
export const vine = (g, x, y, len, bend, stem, leafCols, r, leafEvery = 15, leafS = 1) => {
  const qx = x + bend * 0.25, qy = y + len * 0.55, ex = x + bend, ey = y + len;
  g.strokeStyle = stem; g.lineWidth = 1.6 + r() * 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(qx, qy, ex, ey); g.stroke();
  if (!leafEvery) return;
  const n = Math.floor(len / leafEvery);
  for (let k = 1; k <= n; k++) {
    const t = k / (n + 0.4), it = 1 - t, lx = it * it * x + 2 * it * t * qx + t * t * ex, ly = it * it * y + 2 * it * t * qy + t * t * ey, sz = (9 + r() * 8) * leafS;
    dab(g, lx, ly, sz, sz * 0.42, (k % 2 ? 0.5 : Math.PI - 0.5) + (r() - 0.5) * 0.5, leafCols[Math.floor(r() * leafCols.length)]);
  }
};

/** Arching fern frond: a curved midrib with paired leaflets that shrink towards the tip. */
export const fern = (g, x, y, L, a, c0, c1, r, droop = 0.5, wide = 1) => {
  const ca = Math.cos(a), sa = Math.sin(a), mx = x + ca * L * 0.55, my = y + sa * L * 0.55 - L * 0.08, ex = x + ca * L, ey = y + sa * L + L * droop * 0.5;
  g.strokeStyle = c0; g.lineWidth = Math.max(1, L * 0.018); g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
  const n = Math.max(6, Math.round(L / 8));
  for (let k = 1; k < n; k++) {
    const t = k / n, it = 1 - t, px = it * it * x + 2 * it * t * mx + t * t * ex, py = it * it * y + 2 * it * t * my + t * t * ey;
    const dx = 2 * it * (mx - x) + 2 * t * (ex - mx), dy = 2 * it * (my - y) + 2 * t * (ey - my), ang = Math.atan2(dy, dx), sz = (1 - t * 0.82) * L * 0.2 * wide;
    dab(g, px, py, sz, sz * 0.24, ang - 1.1, k % 2 ? c0 : c1); dab(g, px, py, sz, sz * 0.24, ang + 1.1, c1);
  }
};

/** Broad banana-style leaf with a lit half, a dark half, a midrib and side veins. */
export const bigLeaf = (g, x, y, L, W, a, lit, mid, dark, bend = 0.12) => {
  g.save(); g.translate(x, y); g.rotate(a);
  const tip = L * bend;
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(L * 0.18, -W, L * 0.72, -W * 0.98, L, tip); g.bezierCurveTo(L * 0.72, W * 0.82, L * 0.2, W * 0.9, 0, 0); g.closePath();
  g.fillStyle = lin(g, 0, -W, 0, W, [[0, lit], [0.46, mid], [0.53, dark], [1, U.mixHex(dark, '#000000', 0.2)]]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = Math.max(0.7, L * 0.008); g.beginPath();
  for (let k = 1; k < 10; k++) { const t = k / 10, sx = L * t, sy = tip * t * t; g.moveTo(sx, sy); g.lineTo(sx + L * 0.09, sy - W * 0.8 * Math.sin(t * Math.PI + 0.25)); g.moveTo(sx, sy); g.lineTo(sx + L * 0.09, sy + W * 0.72 * Math.sin(t * Math.PI + 0.25)); }
  g.stroke();
  g.strokeStyle = 'rgba(235,255,190,0.5)'; g.lineWidth = Math.max(1, L * 0.014); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, tip * 0.25, L * 0.98, tip); g.stroke();
  g.restore();
};

/** A tuft of grass blades. */
export const tuft = (g, x, y, n, h, cols, r, spread = 1) => {
  for (let i = 0; i < n; i++) {
    const bx = x + (r() - 0.5) * 14 * spread, ln = (r() - 0.5) * 18, H = h * (0.55 + r() * 0.55), w = 1.4 + r() * 1.6;
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.beginPath(); g.moveTo(bx - w, y); g.quadraticCurveTo(bx - w * 0.3 + ln * 0.2, y - H * 0.6, bx + ln, y - H); g.quadraticCurveTo(bx + w * 0.6 + ln * 0.25, y - H * 0.55, bx + w, y); g.fill();
  }
};

/* ---------- rock ---------- */
export const rockPts = (r, rx, ry, n = 13, rough = 0.2) => {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + (r() - 0.5) * 0.25, k = 1 + (r() - 0.5) * rough * 2; pts.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]); }
  return pts;
};
const polyPath = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };

/** Faceted boulder or slab, lit from the upper left, with cracks and optional moss on top. */
export const rock = (g, x, y, rx, ry, pal, r, moss = 0, facets = 1) => {
  const pts = rockPts(r, rx, ry);
  g.save(); g.translate(x, y);
  polyPath(g, pts); g.fillStyle = lin(g, -rx * 0.8, -ry, rx * 0.7, ry, [[0, pal[2]], [0.5, pal[1]], [1, pal[0]]]); g.fill();
  g.save(); polyPath(g, pts); g.clip();
  for (let i = 0; i < 5; i++) { // facets
    const a = pts[Math.floor(r() * pts.length)], b = pts[Math.floor(r() * pts.length)], c = [(r() - 0.5) * rx, (r() - 0.5) * ry];
    g.fillStyle = r() < 0.5 ? 'rgba(255,240,205,' + (0.07 * facets).toFixed(3) + ')' : 'rgba(0,0,0,' + (0.16 * facets).toFixed(3) + ')'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,0.42)'; g.lineWidth = 1.2; g.beginPath();
  for (let i = 0; i < 4; i++) { let px = (r() - 0.5) * rx * 1.4, py = (r() - 0.5) * ry * 1.4; g.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (r() - 0.5) * rx * 0.5; py += (r() - 0.3) * ry * 0.4; g.lineTo(px, py); } }
  g.stroke();
  if (moss) for (let i = 0; i < 26 * moss; i++) dab(g, (r() - 0.5) * rx * 1.7, -ry * (0.35 + r() * 0.7), 6 + r() * 9, 2.4 + r() * 3, r() * TAU, ['#4d8f34', '#6fae3f', '#37702a'][i % 3]);
  g.restore();
  polyPath(g, pts); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.stroke();
  g.restore();
};

/* ---------- smoke, dust and fire ---------- */
const hexRgb = (h) => U.hex(h).join(',');
/** Billowing cloud sprite built from many soft blobs. Far better than one gradient circle. */
export const puffImg = (v, tint) => sprite('je-puff-' + v + tint, 120, 120, 1, (g, W) => {
  const r = U.rng(5 + v * 9), c = W / 2, rgb = hexRgb(tint);
  for (let i = 0; i < 34; i++) {
    const a = r() * TAU, d = r() * r() * 36, R = 11 + r() * 22, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d;
    g.fillStyle = rad(g, x, y, 0, R, [[0, 'rgba(' + rgb + ',0.2)'], [0.55, 'rgba(' + rgb + ',0.09)'], [1, 'rgba(' + rgb + ',0)']]);
    g.fillRect(x - R, y - R, R * 2, R * 2);
  }
});
export const addPuff = (parts, x, y, size, tint, o = {}) => parts.add({
  x, y, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag == null ? 1.6 : o.drag, life: o.life || 1.1, size, grow: o.grow == null ? 1.1 : o.grow, alpha: o.alpha == null ? 0.7 : o.alpha,
  shape: 'sprite', img: puffImg(Math.floor(Math.random() * 3), tint), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 1.1, floor: o.floor,
});

/** Flame tongue for additive fire: white heart, gold body, orange edge. */
export const tongueImg = (hot = '#ffb43a', edge = '#ff4a12') => sprite('je-tongue' + hot + edge, 64, 120, 1, (g) => {
  g.translate(32, 88); g.scale(1, 2.4);
  g.fillStyle = rad(g, 0, 0, 0, 30, [[0, '#ffffff'], [0.3, '#fff0b8'], [0.55, hot], [0.82, U.rgba(edge, 0.55)], [1, U.rgba(edge, 0)]]);
  g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill();
});

/** Layered living flame: a handful of additive tongues rising from (x, y). */
export const fire = (ctx, x, y, wd, ht, T, seed, hot, edge, lean = 0) => {
  const img = tongueImg(hot, edge), op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), ph = T * (8 + i * 2.3) + seed + i * 1.9, flick = 0.82 + 0.18 * Math.sin(ph) * Math.sin(ph * 0.63 + 1);
    const W = wd * (1.8 - t * 1.05), H = ht * (1 - t * 0.5) * flick, ox = Math.sin(ph * 0.7) * wd * 0.22 * (1 - t) + lean * H * 0.28;
    ctx.globalAlpha = 0.5 + t * 0.4;
    ctx.save(); ctx.translate(x + ox, y + H * 0.08); ctx.transform(1, 0, lean * 0.45, 1, 0, 0); ctx.drawImage(img, -W, -H * 0.86, W * 2, H); ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = op;
};

/* ---------- shared line art ---------- */
export const INK = '#160d06';
/** Tapered limb segment appended to the current path: two circles joined by their outer tangents. */
export const capsule = (g, x0, y0, r0, x1, y1, r1) => {
  const a = Math.atan2(y1 - y0, x1 - x0), d = Math.max(0.001, Math.hypot(x1 - x0, y1 - y0)), th = Math.acos(clamp((r0 - r1) / d, -1, 1));
  g.moveTo(x0 + Math.cos(a + th) * r0, y0 + Math.sin(a + th) * r0);
  g.arc(x0, y0, r0, a + th, a - th + TAU);
  g.arc(x1, y1, r1, a - th, a + th);
  g.closePath();
};
/** Parts outlined as one silhouette, so a limb's segments merge without inner lines. */
export const solid = (g, build, fill, lw = 1.4, ink = INK) => { g.beginPath(); build(); g.strokeStyle = ink; g.lineWidth = lw * 2; g.stroke(); g.fillStyle = fill; g.fill(); };
/** Round shading across a limb, lit on its forward side. */
export const across = (g, x0, y0, x1, y1, r, dark, mid, light) => {
  const dx = x1 - x0, dy = y1 - y0, d = Math.max(0.001, Math.hypot(dx, dy)); let nx = -dy / d, ny = dx / d;
  if (nx < 0) { nx = -nx; ny = -ny; }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return lin(g, mx - nx * r, my - ny * r, mx + nx * r, my + ny * r, [[0, dark], [0.55, mid], [1, light]]);
};
