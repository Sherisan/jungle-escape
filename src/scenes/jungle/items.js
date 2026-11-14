/* Treasure along the route. Purely decoration: nothing here changes a bet or a result.
   Coins, gems and the odd golden idol sit on the runner's line; when he reaches one it flies into his sack.
   Relics stand back from the path. */
import { U, TAU, clamp, lerp, hd, glow, put, lin, rad } from './kit.js';
import { TREASURES } from './relics.js';

/* ---------- coins ---------- */
const coinFace = () => hd('it-coin3', 40, 40, (g, W) => {
  const c = W / 2, R = 19;
  // milled rim
  g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = lin(g, 2, 2, W - 2, W - 2, [[0, '#fff7c8'], [0.32, '#ffd54c'], [0.7, '#d18a12'], [1, '#7a4a06']]); g.fill();
  g.strokeStyle = '#5a3505'; g.lineWidth = 1.4; g.stroke();
  g.strokeStyle = 'rgba(96,56,6,0.55)'; g.lineWidth = 1;
  for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * (R - 0.6), c + Math.sin(a) * (R - 0.6)); g.lineTo(c + Math.cos(a) * (R - 3.2), c + Math.sin(a) * (R - 3.2)); g.stroke(); }
  // inner field
  g.beginPath(); g.arc(c, c, R - 4, 0, TAU); g.fillStyle = lin(g, W - 6, W - 6, 6, 6, [[0, '#fff2ac'], [0.5, '#f4b832'], [1, '#b8780e']]); g.fill(); g.strokeStyle = 'rgba(110,64,6,0.85)'; g.lineWidth = 1.2; g.stroke();
  g.strokeStyle = 'rgba(255,240,180,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.arc(c, c, R - 6, 3.4, 5.6); g.stroke();
  // embossed stepped temple under a sun
  const emboss = (dx, dy, col) => {
    g.fillStyle = col; g.beginPath();
    const p = [[-9, 7], [-9, 4], [-6.5, 4], [-6.5, 1], [-4, 1], [-4, -2], [4, -2], [4, 1], [6.5, 1], [6.5, 4], [9, 4], [9, 7]];
    p.forEach(([x, y], i) => (i ? g.lineTo(c + x + dx, c + y + dy) : g.moveTo(c + x + dx, c + y + dy))); g.closePath(); g.fill();
    g.beginPath(); g.arc(c + dx, c - 7.2 + dy, 3, 0, TAU); g.fill();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.fillRect(c + dx + Math.cos(a) * 4.6 - 0.6, c - 7.2 + dy + Math.sin(a) * 4.6 - 0.6, 1.2, 1.2); }
  };
  emboss(0.9, 0.9, 'rgba(110,62,4,0.85)'); emboss(-0.6, -0.6, '#fff4c4'); emboss(0, 0, '#e8a628');
  g.fillStyle = '#7a4a06'; g.fillRect(c - 1.2, c + 3, 2.4, 4);
  // shine
  g.save(); g.beginPath(); g.arc(c, c, R, 0, TAU); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.32)'; g.beginPath(); g.ellipse(c - 6, c - 8, 11, 4.6, -0.6, 0, TAU); g.fill();
  g.restore();
});

/** A spinning coin with a real edge: the face narrows and the milled rim shows as it turns. */
export const drawCoin = (ctx, x, y, R, spin) => {
  const cs = Math.cos(spin), sn = Math.sin(spin), sx = Math.max(0.07, Math.abs(cs)), e = R * 0.17 * sn;
  ctx.fillStyle = '#7a4a08'; ctx.beginPath(); ctx.ellipse(x - e, y, R * sx, R, 0, 0, TAU); ctx.fill();
  if (Math.abs(e) > 0.6) {
    const x0 = Math.min(x - e, x + e), w = Math.abs(2 * e);
    ctx.fillStyle = lin(ctx, 0, y - R, 0, y + R, [[0, '#ffe08a'], [0.5, '#b07812'], [1, '#6a4006']]); ctx.fillRect(x0, y - R, w, R * 2);
    ctx.strokeStyle = 'rgba(70,40,4,0.55)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let k = -4; k <= 4; k++) { const yy = y + k * R * 0.21; ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); }
    ctx.stroke();
  }
  ctx.drawImage(coinFace(), x + e - R * 1.05 * sx, y - R * 1.05, R * 2.1 * sx, R * 2.1);
};

/* ---------- gems ---------- */
const GEM_COL = { ruby: ['#ffb0bc', '#e8283c', '#7a0e20'], emerald: ['#b8ffdc', '#1fb873', '#0a5c3a'], sapphire: ['#c4e4ff', '#2b7fe0', '#0f3a7a'], amethyst: ['#f0d4ff', '#9a4ae0', '#4a1a7a'] };
const gemImg = (kind) => hd('it-gem3-' + kind, 52, 52, (g, W) => {
  const [hi, md, lo] = GEM_COL[kind], c = W / 2, top = 10, belt = 21, bot = 47, hw = 21, tw = 11;
  const facet = (pts, col) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = col; g.fill(); };
  const m = (a, b, t) => U.mixHex(a, b, t);
  // crown: a table and eight facets
  facet([[c - tw, top], [c + tw, top], [c + hw, belt], [c - hw, belt]], md);
  facet([[c - tw, top], [c - hw, belt], [c - 12, belt]], m(hi, md, 0.25));
  facet([[c - tw, top], [c - 12, belt], [c - 3, belt], [c - 3, top]], hi);
  facet([[c - 3, top], [c - 3, belt], [c + 6, belt], [c + 4, top]], m(hi, md, 0.45));
  facet([[c + 4, top], [c + 6, belt], [c + 14, belt], [c + tw, top]], m(hi, md, 0.7));
  facet([[c + tw, top], [c + 14, belt], [c + hw, belt]], m(md, lo, 0.4));
  // pavilion: long facets meeting at the point
  facet([[c - hw, belt], [c - 12, belt], [c, bot]], m(hi, md, 0.4));
  facet([[c - 12, belt], [c - 3, belt], [c, bot]], m(md, hi, 0.2));
  facet([[c - 3, belt], [c + 6, belt], [c, bot]], md);
  facet([[c + 6, belt], [c + 14, belt], [c, bot]], m(md, lo, 0.45));
  facet([[c + 14, belt], [c + hw, belt], [c, bot]], lo);
  g.beginPath(); g.moveTo(c - tw, top); g.lineTo(c + tw, top); g.lineTo(c + hw, belt); g.lineTo(c, bot); g.lineTo(c - hw, belt); g.closePath();
  g.strokeStyle = m(lo, '#000000', 0.55); g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(c - hw + 1, belt); g.lineTo(c + hw - 1, belt); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.moveTo(c - 9, top + 2); g.lineTo(c - 4, top + 2); g.lineTo(c - 10, belt - 2); g.lineTo(c - 14, belt - 2); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(c - 8, belt + 3); g.lineTo(c - 5, belt + 3); g.lineTo(c - 1, bot - 8); g.closePath(); g.fill();
});
const GEMS = Object.keys(GEM_COL);
export const GEM_GLOW = { ruby: '#ff4a64', emerald: '#3cf0a0', sapphire: '#5aaeff', amethyst: '#c07aff', idol: '#ffd34d' };

/* ---------- the rare golden idol ---------- */
const idolImg = () => hd('it-idol', 50, 60, (g, W, H) => {
  const c = W / 2, gold = (x0, x1) => lin(g, x0, 0, x1, 0, [[0, '#5a3905'], [0.28, '#ffe48f'], [0.52, '#f2b53e'], [0.8, '#a66d0e'], [1, '#4a2e04']]);
  g.lineJoin = 'round';
  // feathered headdress
  for (let k = -3; k <= 3; k++) {
    g.save(); g.translate(c, 24); g.rotate(k * 0.34);
    g.beginPath(); g.ellipse(0, -14, 3.6, 11, 0, 0, TAU); g.fillStyle = gold(-4, 4); g.fill(); g.strokeStyle = '#2a1704'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.ellipse(0, -23, 2.4, 3.4, 0, 0, TAU); g.fillStyle = k % 2 ? '#2fbf8a' : '#e0283c'; g.fill(); g.stroke();
    g.restore();
  }
  // head
  U.rr(g, c - 12, 18, 24, 27, 6); g.fillStyle = gold(c - 12, c + 12); g.fill(); g.strokeStyle = '#2a1704'; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = '#7a4a08'; g.fillRect(c - 12, 21, 24, 3);
  for (const s of [-1, 1]) { g.beginPath(); g.arc(c + s * 13, 31, 3.6, 0, TAU); g.fillStyle = gold(c + s * 13 - 4, c + s * 13 + 4); g.fill(); g.stroke(); g.fillStyle = '#2fbf8a'; g.beginPath(); g.arc(c + s * 13, 31, 1.5, 0, TAU); g.fill(); }
  // glowing emerald eyes, nose and a solemn mouth
  g.fillStyle = '#5cffb4'; g.beginPath(); g.ellipse(c - 5, 29, 3, 1.8, 0, 0, TAU); g.ellipse(c + 5, 29, 3, 1.8, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(90,50,0,0.8)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(c, 30); g.lineTo(c, 35); g.moveTo(c - 5, 39); g.lineTo(c + 5, 39); g.stroke();
  g.fillStyle = 'rgba(255,255,230,0.55)'; g.fillRect(c - 9, 25, 2, 15);
  // little base
  g.beginPath(); g.moveTo(c - 10, 45); g.lineTo(c + 10, 45); g.lineTo(c + 14, H - 3); g.lineTo(c - 14, H - 3); g.closePath(); g.fillStyle = gold(c - 14, c + 14); g.fill(); g.strokeStyle = '#2a1704'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#2fbf8a'; g.fillRect(c - 8, 50, 16, 2.4);
});

/** A gem or idol icon, used for pickups on the path and for the ones flying into the sack. */
export const drawGemIcon = (ctx, kind, x, y, s) => {
  if (kind === 'idol') { const c = idolImg(); ctx.drawImage(c, x - 25 * s, y - 32 * s, 50 * s, 60 * s); return; }
  ctx.drawImage(gemImg(kind), x - 26 * s, y - 26 * s, 52 * s, 52 * s);
};

/** Coins lead up to each trap, arc over the jumps and thread under the slides; a gem now and then at chest height,
    and every third gem a golden idol. Interior items carry the route they belong to, since each hall has its own traps. */
export const planItems = (plan, TRAPS, speedAt, windowFor, keep) => {
  const out = [], r = U.rng(Math.floor(Math.random() * 1e9)), add = (it) => { if (keep(it.x)) out.push(it); };
  plan.forEach((p, i) => {
    const area = p.kinds.J ? 'J' : 'I', lead = 4 + Math.floor(r() * 3), ls = 40 + p.speed * 0.03;
    for (let k = 0; k < lead; k++) add({ x: p.x - 150 - (lead - k) * ls, y: -74 - Math.sin((k / (lead - 1)) * Math.PI) * 26, ph: k * 0.5, z: area });
    for (const [zone, kind] of Object.entries(p.kinds)) {
      const def = TRAPS[kind];
      if (def.h) { const w = windowFor(def), span = p.speed * (w[0] + w[1]); for (const u of [0.14, 0.32, 0.5, 0.68, 0.86]) add({ x: p.x + (u - 0.5) * span * 0.94, y: -(def.h * 4 * u * (1 - u) + 92), ph: u * 6, z: zone }); }
      else if (def.act === 'slide') for (let k = -2; k <= 2; k++) add({ x: p.x + k * 46, y: -40, ph: k, z: zone });
    }
    if (i % 2 === 1) add({ x: p.x + p.speed * 0.5, y: -104, ph: i, gem: i % 6 === 5 ? 'idol' : GEMS[Math.floor(r() * GEMS.length)], z: area });
  });
  return out;
};

/** Light rays turning behind a gem. */
const rays = (ctx, x, y, R, col, a, T) => {
  const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  ctx.save(); ctx.translate(x, y); ctx.rotate(T * 0.8);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(TAU / 6);
    ctx.fillStyle = lin(ctx, 0, 0, R, 0, [[0, U.rgba(col, a)], [1, U.rgba(col, 0)]]);
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(R, -R * 0.12); ctx.lineTo(R, R * 0.12); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
  }
  ctx.restore(); ctx.globalCompositeOperation = op;
};

export const drawItems = (ctx, items, zone, exX, wx, w, floorY, T, onGet) => {
  const area = zone === 'J' ? 'J' : 'I';
  for (const it of items) {
    if (it.got || (it.z !== zone && it.z !== area)) continue;
    const x = exX + (it.x - wx);
    if (x > w + 60) continue;
    if (x < exX + 14) { it.got = true; onGet(it, x, floorY + it.y); continue; }
    const bob = Math.sin(T * 3 + it.ph) * 4, y = floorY + it.y + bob;
    if (it.gem) {
      const col = GEM_GLOW[it.gem], big = it.gem === 'idol';
      rays(ctx, x, y, big ? 66 : 50, col, big ? 0.34 : 0.24, T + it.ph);
      glow(ctx, x, y, big ? 64 : 48, col, 0.55 + 0.2 * Math.sin(T * 4 + it.ph));
      drawGemIcon(ctx, it.gem, x, y, (big ? 1.05 : 0.92) * (1 + Math.sin(T * 3 + it.ph) * 0.05));
      if (Math.sin(T * 2.3 + it.ph) > 0.8) sparkle(ctx, x - 9, y - 13, 13 * (Math.sin(T * 2.3 + it.ph) - 0.8) * 5);
    } else {
      glow(ctx, x, y, 20, '#ffd34d', 0.3);
      drawCoin(ctx, x, y, 13, T * 4.5 + it.ph);
      if (Math.sin(T * 1.7 + it.ph * 3) > 0.94) sparkle(ctx, x - 5, y - 6, 9);
    }
  }
};

/** Collected treasure arcing into the sack. Returns the ones that arrived this frame. */
export const drawFlyers = (ctx, fly, target, dt, T) => {
  const landed = [];
  for (const f of fly) {
    f.t += dt / (f.gem ? 0.42 : 0.3);
    const u = Math.min(1, f.t), e = u * u, [tx, ty] = target;
    const cx = lerp(f.x0, tx, 0.45), cy = Math.min(f.y0, ty) - (f.gem ? 90 : 60);
    const x = (1 - e) * (1 - e) * f.x0 + 2 * (1 - e) * e * cx + e * e * tx, y = (1 - e) * (1 - e) * f.y0 + 2 * (1 - e) * e * cy + e * e * ty, s = lerp(1, 0.55, e);
    if (f.t >= 1) { landed.push(f); continue; }
    if (f.gem) { glow(ctx, x, y, 34 * s, GEM_GLOW[f.gem], 0.5); drawGemIcon(ctx, f.gem, x, y, 0.8 * s); }
    else { glow(ctx, x, y, 16 * s, '#ffd34d', 0.4); drawCoin(ctx, x, y, 11 * s, T * 14 + f.spin); }
  }
  if (landed.length) for (const f of landed) fly.splice(fly.indexOf(f), 1);
  return landed;
};

export const sparkle = (ctx, x, y, r) => {
  if (r <= 0.2) return;
  const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fff6d0';
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.16, y - r * 0.16); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.16, y + r * 0.16); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.16, y + r * 0.16); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.16, y - r * 0.16); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = op;
};

/** Relics standing back from the path, one every so often, with their own pool of light. */
export const drawRelics = (ctx, wx, exX, w, floorY, T, dng, skip) => {
  const gap = 760, base = exX + 420;
  for (let i = Math.floor((wx - base - 200) / gap); i <= Math.floor((wx + w + 200 - base) / gap); i++) {
    if (U.hash(i, 5, 8) > 0.5 + dng * 0.35) continue;
    const x = i * gap - wx + base + U.hash(i, 6, 8) * 180;
    if (skip(x)) continue;
    const tr = TREASURES[Math.floor(U.hash(i, 7, 4) * TREASURES.length)], s = 0.86, W = tr.w * s, H = tr.h * s, y = floorY - 16;
    glow(ctx, x, y - H * 0.55, 96, tr.glow, 0.3 + 0.12 * Math.sin(T * 3 + i));
    glow(ctx, x, y + 2, 92, tr.glow, 0.28, 13);
    ctx.drawImage(tr.art(), x - W / 2, y - H, W, H);
    const tw = Math.max(0, Math.sin(T * 2.2 + i * 1.7));
    if (tw > 0.84) sparkle(ctx, x + tr.spark[0] * s, y + tr.spark[1] * s, 11 * ((tw - 0.84) / 0.16));
  }
};
