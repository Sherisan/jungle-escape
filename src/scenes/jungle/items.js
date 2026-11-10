/* Treasure along the route. Purely decoration: nothing here changes a bet or a result.
   Coins and gems sit on the runner's line and sparkle away as he reaches them; relics stand back from the path. */
import { U, TAU, clamp, hd, glow, put } from './kit.js';
import { TREASURES } from './relics.js';

const coinFace = () => hd('it-coin', 36, 36, (g, W) => {
  const c = W / 2;
  g.beginPath(); g.arc(c, c, 16.5, 0, TAU); g.fillStyle = U.lin(g, 4, 4, W - 4, W - 4, [[0, '#fff3b4'], [0.45, '#ffc93e'], [1, '#a0640c']]); g.fill(); g.strokeStyle = '#5a3505'; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.arc(c, c, 12.6, 0, TAU); g.fillStyle = U.lin(g, W - 8, W - 8, 8, 8, [[0, '#ffe487'], [1, '#d99a1e']]); g.fill(); g.strokeStyle = 'rgba(120,70,8,0.7)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#b57a12'; g.beginPath(); g.arc(c + 0.5, c + 0.5, 4.8, 0, TAU); g.fill();
  g.fillStyle = '#fff0b0'; g.beginPath(); g.arc(c - 0.5, c - 0.5, 4.4, 0, TAU); g.fill();
  g.strokeStyle = '#b57a12'; g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.moveTo(c + Math.cos(a) * 6.8, c + Math.sin(a) * 6.8); g.lineTo(c + Math.cos(a) * 10, c + Math.sin(a) * 10); }
  g.stroke();
});
const GEM_COL = { ruby: ['#ff8a9a', '#e0283c', '#7a0e20'], emerald: ['#9dffcf', '#1fb873', '#0a5c3a'], sapphire: ['#a8d8ff', '#2b7fe0', '#0f3a7a'], amethyst: ['#e6c0ff', '#9a4ae0', '#4a1a7a'] };
const gemImg = (kind) => hd('it-gem-' + kind, 44, 44, (g, W, H) => {
  const [hi, md, lo] = GEM_COL[kind], c = W / 2, top = 9, belt = 19, bot = 40, hw = 18, tw = 10;
  const facet = (pts, col) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = col; g.fill(); };
  facet([[c - tw, top], [c + tw, top], [c + hw, belt], [c - hw, belt]], md);
  facet([[c - tw, top], [c, top], [c - 6, belt], [c - hw, belt]], hi);
  facet([[c, top], [c + tw, top], [c + 6, belt], [c - 6, belt]], U.mixHex(hi, md, 0.5));
  facet([[c - hw, belt], [c - 6, belt], [c, bot]], U.mixHex(hi, md, 0.35));
  facet([[c - 6, belt], [c + 6, belt], [c, bot]], md);
  facet([[c + 6, belt], [c + hw, belt], [c, bot]], lo);
  g.beginPath(); g.moveTo(c - tw, top); g.lineTo(c + tw, top); g.lineTo(c + hw, belt); g.lineTo(c, bot); g.lineTo(c - hw, belt); g.closePath(); g.strokeStyle = U.mixHex(lo, '#000000', 0.5); g.lineWidth = 1.5; g.lineJoin = 'round'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.moveTo(c - 9, top + 2); g.lineTo(c - 4, top + 2); g.lineTo(c - 10, belt - 2); g.lineTo(c - 13, belt - 2); g.closePath(); g.fill();
});
const GEMS = Object.keys(GEM_COL);
export const GEM_GLOW = { ruby: '#ff4a64', emerald: '#3cf0a0', sapphire: '#5aaeff', amethyst: '#c07aff' };

/** Coins lead up to each trap, arc over the jumps and thread under the slides; a gem now and then at chest height.
    Interior items carry the route they belong to, since each hall has its own traps. */
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
    if (i % 2 === 1) add({ x: p.x + p.speed * 0.5, y: -100, ph: i, gem: GEMS[Math.floor(r() * GEMS.length)], z: area });
  });
  return out;
};

export const drawItems = (ctx, items, zone, exX, wx, w, floorY, T, onGet) => {
  const area = zone === 'J' ? 'J' : 'I';
  for (const it of items) {
    if (it.got || (it.z !== zone && it.z !== area)) continue;
    const x = exX + (it.x - wx);
    if (x > w + 60) continue;
    if (x < exX + 14) { it.got = true; onGet(it, x, floorY + it.y); continue; }
    const bob = Math.sin(T * 3 + it.ph) * 4, y = floorY + it.y + bob, R = 13;
    if (it.gem) {
      glow(ctx, x, y, 46, GEM_GLOW[it.gem], 0.55 + 0.2 * Math.sin(T * 4 + it.ph));
      const c = gemImg(it.gem), s = 1 + Math.sin(T * 3 + it.ph) * 0.06;
      ctx.drawImage(c, x - 22 * s, y - 22 * s, 44 * s, 44 * s);
      if (Math.sin(T * 2.3 + it.ph) > 0.86) sparkle(ctx, x - 9, y - 12, 12);
    } else {
      const spin = T * 5 + it.ph, cx = Math.cos(spin), sx = Math.abs(cx) * 0.94 + 0.06, c = coinFace();
      glow(ctx, x, y, 19, '#ffd34d', 0.3);
      ctx.fillStyle = '#7a4a0a'; ctx.beginPath(); ctx.ellipse(x + cx * 2, y, R * sx, R, 0, 0, TAU); ctx.fill();
      ctx.drawImage(c, x - R * 1.09 * sx, y - R * 1.09, R * 2.18 * sx, R * 2.18);
    }
  }
};

export const sparkle = (ctx, x, y, r) => {
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
