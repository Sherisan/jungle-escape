/* The crash, staged as a short sequence instead of a pile of rectangles:
   flash and shake, the wheel catches him and throws him, the place comes down around him in stone that lands
   with dust and weight, one huge thing topples across the path, a wall of dust rolls over, the light goes,
   and his hat comes to rest on the rubble. Runs off crashAge, so it lasts the 4s between rounds. */
import { U, TAU, clamp, lerp, smooth, sprite, put, lin, rad, glow, fire, addPuff, rock, foliage, trunk, ramp16, texFill, stoneTex, slateTex, sandTex, puffImg } from './kit.js';
import { drawHat } from './hero.js';

const PAL = {
  jungle: { pal: ['#2e2a20', '#6a6248', '#a39a78'], moss: 0.9, dust: '#b49a70', hot: '#ffcf8a' },
  serpent: { pal: ['#04141a', '#1a4a4c', '#3f8078'], moss: 0.15, dust: '#7fae9c', hot: '#5cffc0' },
  sun: { pal: ['#2a1206', '#7a4a1a', '#d09a48'], moss: 0, dust: '#c79a60', hot: '#ff7a1a' },
};
const rockImg = (zone, v) => sprite('rk-' + zone + v, 170, 170, 1, (g, W) => { const r = U.rng(v * 17 + 3), P = PAL[zone]; rock(g, W / 2, W / 2, 66, 56, P.pal, r, P.moss); });

const LEAF = ramp16([[0, '#0d4a30'], [0.6, '#2a7a3a'], [1, '#9ad858']]);
const TRK = { deep: '#17100a', dark: '#2b1e14', mid: '#4a3525', light: '#7a5c3c', groove: '#120a05', hi: '#b89668', moss0: '#3f7f30', moss1: '#62a53a', moss2: '#2e6226' };
/** The thing that topples: a giant tree outdoors, a carved column underground. Base at the bottom centre. */
const toppleImg = (zone) => sprite('topple-' + zone, 340, 760, 1, (g, W, H) => {
  const c = W / 2, r = U.rng(5);
  if (zone === 'jungle') {
    trunk(g, c, H - 6, 150, 112, 70, 0, TRK, r, 1.2, 0);
    for (let i = 0; i < 12; i++) foliage(g, c + (r() - 0.5) * 220, 90 + r() * 150, 80 + r() * 50, 56 + r() * 34, LEAF, r, 220, 1.2);
  } else {
    const wd = 104, tex = zone === 'sun' ? sandTex() : slateTex(), lit = zone === 'sun' ? 'rgba(255,200,110,0.34)' : 'rgba(120,255,210,0.24)';
    g.save(); g.beginPath(); g.rect(c - wd / 2, 0, wd, H); g.clip(); texFill(g, tex, c - wd / 2, 0, wd, H);
    g.fillStyle = lin(g, c - wd / 2, 0, c + wd / 2, 0, [[0, lit], [0.4, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.78)']]); g.fillRect(c - wd / 2, 0, wd, H);
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(c - wd / 2 + 10 + k * 16, 0, 4, H); }
    g.restore();
    for (let y = 120; y < H - 40; y += 150) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(c - wd / 2, y, wd, 3); }
    g.fillStyle = zone === 'sun' ? '#e0b04a' : '#7fae96'; g.fillRect(c - wd / 2 - 12, 0, wd + 24, 24); g.fillRect(c - wd / 2 - 12, H - 30, wd + 24, 24);
  }
});

/** Painted ahead of time so the first crash does not hitch. */
export const warmCollapse = () => {
  const out = [];
  for (const z of ['jungle', 'serpent', 'sun']) { out.push(() => toppleImg(z)); for (let v = 0; v < 6; v++) out.push(() => rockImg(z, v)); for (let v = 0; v < 3; v++) out.push(() => puffImg(v, PAL[z].dust)); }
  return out;
};

export const newCollapse = (zone, hero, L) => {
  const { w, floorY, ext } = L, rocks = [];
  // stone falling behind the runner, then in front of him, thickest in the first second
  for (let i = 0; i < 46; i++) {
    const front = i % 3 === 0, at = 0.05 + Math.pow(Math.random(), 1.5) * 2.1, size = (front ? 0.4 : 0.26) + Math.random() * (front ? 0.5 : 0.4);
    rocks.push({ at, x: Math.random() * (w + 200) - 100, y: -ext - 120 - Math.random() * 200, vx: (Math.random() - 0.5) * 90, vy: 240 + Math.random() * 220, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 6, s: size, v: i % 6, front, floor: floorY + (front ? 20 + Math.random() * 90 : -2 - Math.random() * 12), on: false, rest: false, bounces: 0 });
  }
  const cracks = [];
  for (let n = 0; n < 6; n++) {
    let x = Math.random() * w, y = -ext + Math.random() * 40; const pts = [[x, y]], c = 4 + Math.floor(Math.random() * 4);
    for (let j = 0; j < c; j++) { x += (Math.random() - 0.5) * 70; y += 22 + Math.random() * 40; pts.push([x, y]); }
    cracks.push(pts);
  }
  return {
    zone, rocks, cracks: zone === 'jungle' ? [] : cracks, hit: false, topple: { base: Math.min(w + 60, hero.x + 500), a: -1.42, va: 0, on: false, done: false }, flash: 1,
    hero: { x: hero.x, y: hero.y, vx: 0, vy: 0, rot: 0, vr: 0, s: hero.s, down: false }, hat: null, torch: null, wave: 0,
  };
};

/** Advances one frame. `api`: floorY, parts (dust), fx (additive sparks), shake(n), sfx(name), bx (wheel's front edge). */
export const stepCollapse = (C, ca, dt, api) => {
  const P = PAL[C.zone], { floorY, parts, fx } = api;
  C.flash = Math.max(0, C.flash - dt * 6);
  const landed = (x, y, big) => {
    addPuff(parts, x, y, big ? 66 : 34, P.dust, { vx: (Math.random() - 0.5) * 80, vy: -18, grow: 1.5, alpha: 0.6, life: 1.5 });
    if (big) { api.shake(5); for (let i = 0; i < 4; i++) addPuff(parts, x + (Math.random() - 0.5) * 120, y, 38, P.dust, { vx: (Math.random() - 0.5) * 240, vy: -30 - Math.random() * 30, grow: 1.4, alpha: 0.5, life: 1.3 }); }
  };
  for (const r of C.rocks) {
    if (r.rest || ca < r.at) continue;
    r.on = true; r.vy += 1900 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt;
    if (r.y > r.floor) {
      r.y = r.floor;
      if (r.bounces === 0) landed(r.x, r.floor + 6, r.s > 0.55);
      if (r.bounces < 1 && r.vy > 400) { r.vy *= -0.26; r.vx *= 0.6; r.vr *= 0.5; r.bounces++; }
      else { r.rest = true; r.vr = 0; }
    }
  }

  /* the wheel catches him */
  const H = C.hero;
  if (!C.hit && api.bx > H.x - 30) {
    C.hit = true; H.vx = 460 + Math.random() * 120; H.vy = -640; H.vr = 7.5; api.shake(22);
    C.hat = { x: H.x + 8, y: H.y - 170 * H.s, vx: 190, vy: -640, rot: 0, vr: 9, rest: false };
    C.torch = { x: H.x + 30, y: H.y - 130 * H.s, vx: -120, vy: -360, rot: 0, vr: -10, rest: false };
    for (let i = 0; i < 12; i++) addPuff(parts, H.x + (Math.random() - 0.5) * 80, H.y - 40 - Math.random() * 60, 48, P.dust, { vx: 140 + Math.random() * 280, vy: (Math.random() - 0.5) * 160, grow: 1.5, alpha: 0.55, life: 1.2 });
    for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, v = 120 + Math.random() * 380; fx.add({ x: H.x, y: H.y - 70, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 700, life: 0.5 + Math.random() * 0.4, size: 1.6 + Math.random(), color: Math.random() < 0.5 ? '#ffb347' : '#ffe08a' }); }
  }
  if (C.hit && !H.down) {
    H.vy += 1900 * dt; H.x += H.vx * dt; H.y += H.vy * dt; H.rot += H.vr * dt;
    if (H.y > floorY && H.vy > 0) {
      H.y = floorY;
      if (Math.abs(H.vy) > 420) { H.vy *= -0.34; H.vx *= 0.6; H.vr *= 0.55; landed(H.x, floorY + 4, true); api.sfx('land'); }
      else { H.down = true; H.rot = Math.PI / 2 - 0.05; H.vx = 0; H.vy = 0; landed(H.x, floorY + 4, false); }
    }
  }
  const fly = (o, floor, bounce) => { if (!o || o.rest) return; o.vy += 1500 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; if (o.y > floor) { o.y = floor; if (Math.abs(o.vy) > 240) { o.vy *= -bounce; o.vx *= 0.55; o.vr *= 0.5; } else { o.rest = true; } } };
  fly(C.hat, floorY - 10, 0.4); fly(C.torch, floorY - 4, 0.3);

  /* one huge thing comes down across the path */
  const T = C.topple;
  if (ca > 0.28 && !T.done) {
    T.on = true; T.va += (2 + Math.cos(T.a) * 9) * dt; T.a += T.va * dt;
    if (T.a >= 0) { // the far end has come to rest
      T.a = 0; T.done = true; api.shake(26); api.sfx('topple');
      const len = 710;
      for (let i = 0; i < 26; i++) addPuff(parts, T.base - Math.random() * len, floorY - Math.random() * 30, 70 + Math.random() * 40, P.dust, { vx: (Math.random() - 0.5) * 180, vy: -30 - Math.random() * 60, grow: 1.5, alpha: 0.6, life: 2.2 });
      if (C.zone === 'jungle') for (let i = 0; i < 70; i++) parts.add({ x: T.base - len + Math.random() * 300, y: floorY - 60 - Math.random() * 120, vx: (Math.random() - 0.5) * 300, vy: -220 - Math.random() * 240, g: 300, drag: 1.2, life: 2.4, size: 5 + Math.random() * 5, color: ['#4f9a38', '#6fb642', '#2f7a30', '#9ad858'][i % 4], shape: 'leaf', vr: (Math.random() - 0.5) * 8, rot: Math.random() * TAU });
    }
  }
  /* a wall of dust rolls through */
  if (ca < 1.7 && Math.random() < dt * 34) { const k = clamp(ca / 1.2, 0, 1); addPuff(parts, -100 + k * (api.w + 200) + (Math.random() - 0.5) * 200, floorY - Math.random() * 180, 90 + Math.random() * 60, P.dust, { vx: 180 + Math.random() * 160, vy: -18 - Math.random() * 30, grow: 1.0, alpha: 0.42, life: 2.4 }); }
  /* hot fissures throw sparks underground */
  if (C.zone !== 'jungle' && ca < 2.4 && Math.random() < dt * 40) fx.add({ x: Math.random() * api.w, y: floorY + 8, vx: (Math.random() - 0.5) * 90, vy: -150 - Math.random() * 320, g: 460, life: 0.8 + Math.random() * 0.7, size: 1.8 + Math.random() * 1.6, color: P.hot });
};

const drawRocks = (ctx, C, front) => {
  for (const r of C.rocks) {
    if (!r.on || r.front !== front) continue;
    const W = 170 * r.s;
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot); ctx.drawImage(rockImg(C.zone, r.v), -W / 2, -W / 2, W, W); ctx.restore();
  }
};

/** Cracks behind everything. */
export const drawCollapseWall = (ctx, C, ca) => {
  const k = clamp(ca * 3, 0, 1), P = PAL[C.zone];
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const pts of C.cracks) {
    const n = Math.max(2, Math.ceil(pts.length * k));
    ctx.beginPath(); for (let j = 0; j < n; j++) (j ? ctx.lineTo(pts[j][0], pts[j][1]) : ctx.moveTo(pts[j][0], pts[j][1]));
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = U.rgba(P.hot, 0.5 * Math.max(0, 1 - ca * 0.3)); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
};

/** Stone behind the runner and the toppling column or tree. */
export const drawCollapseBack = (ctx, C, ca, floorY) => {
  drawRocks(ctx, C, false);
  const T = C.topple;
  if (T.on) {
    // the sprite stands along -y from its base; a = -1.42 is nearly upright, 0 lies along the floor to the left
    ctx.save(); ctx.translate(T.base, floorY + 18); ctx.rotate(-(Math.PI / 2 + T.a)); put(ctx, toppleImg(C.zone), -170, -760); ctx.restore();
  }
  if (C.torch) { // the torch keeps burning where it fell
    const t = C.torch, life = clamp(1 - (ca - 2.6) / 1.2, 0, 1);
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.rot); ctx.fillStyle = '#5a3a1c'; ctx.fillRect(-3, -2, 6, 34); ctx.fillStyle = '#8e6b3c'; ctx.fillRect(-5, -10, 10, 12); ctx.restore();
    if (life > 0) { fire(ctx, t.x, t.y - 4, 10, 40 * life, ca * 2, 3, '#ffb43a', '#ff4a12'); glow(ctx, t.x, t.y - 18, 150, '#ffa43a', 0.4 * life); }
  }
};

/** Stone in front of the runner, the hat, and the debris passing right by the camera. */
export const drawCollapseFront = (ctx, C, ca) => {
  drawRocks(ctx, C, true);
  if (C.hat) { ctx.save(); ctx.translate(C.hat.x, C.hat.y); ctx.rotate(C.hat.rot); ctx.scale(0.95, 0.95); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; drawHat(ctx, 0, ca, 0); ctx.restore(); }
};

/** Light going out, the first white flash, and the fade before the next round. */
export const drawCollapseGrade = (ctx, C, ca, L) => {
  const { w, h, ext } = L, Y0 = -ext - 40, H0 = h + ext + 80, P = PAL[C.zone];
  ctx.fillStyle = 'rgba(8,5,3,' + Math.min(0.62, smooth(ca / 2.2) * 0.62).toFixed(3) + ')'; ctx.fillRect(-40, Y0, w + 80, H0);
  if (C.zone !== 'jungle') {
    const p = (0.55 + 0.45 * Math.sin(ca * 7)) * Math.max(0.15, 1 - ca * 0.3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = lin(ctx, 0, h * 0.5, 0, h, [[0, 'rgba(0,0,0,0)'], [1, U.rgba(P.hot, 0.34 * p)]]); ctx.fillRect(-40, Y0, w + 80, H0); ctx.restore();
  }
  if (C.flash > 0) { ctx.fillStyle = 'rgba(255,240,215,' + (C.flash * C.flash * 0.85).toFixed(3) + ')'; ctx.fillRect(-40, Y0, w + 80, H0); }
  if (ca > 3.5) { ctx.fillStyle = 'rgba(0,0,0,' + smooth((ca - 3.5) / 0.46).toFixed(3) + ')'; ctx.fillRect(-40, Y0, w + 80, H0); }
};
