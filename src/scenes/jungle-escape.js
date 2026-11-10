/* JUNGLE ESCAPE. The run is a journey through three places:
   a sunlit jungle trail (1.00x to the split), then either the stairs up to the Sun Gate or the ramp down into
   the Serpent Hall. This file directs the show; the art lives in ./jungle/.
   Nothing here can influence a result: the scene only ever sees the current multiplier. */
import { CG } from '../engine/core.js';
import { U, TAU, clamp, lerp, smooth, setQuality, glow, addPuff, rad } from './jungle/kit.js';
import { BIOMES } from './jungle/biomes.js';
import { drawHero, drawHeroReflection, poseRun, poseIdle, poseJump, poseVault, poseSlide, poseFlung, poseDown, mixPose } from './jungle/hero.js';
import { TRAPS, TRAP_SETS, WINDOW, trapEvents, drawTrapBack, drawTrapFront, drawDart } from './jungle/traps.js';
import { planItems, drawItems, drawRelics, GEM_GLOW } from './jungle/items.js';
import { drawFacade, forkPath, forkFocus, forkScale, facadeImg } from './jungle/portal.js';
import { newCollapse, stepCollapse, drawCollapseWall, drawCollapseBack, drawCollapseFront, drawCollapseGrade, warmCollapse } from './jungle/collapse.js';
import { drawBoulder } from './jungle/relics.js';

/* ---------- world layout ---------- */
// Scroll speed rises with the multiplier: dX/dt = A + B*p with p = ln(m) = K*t, so distance has a closed form.
const SPD_A = 380, SPD_B = 170, FORK = 1.8, K = CG.K;
const worldX = (p) => (SPD_A * p + SPD_B * p * p * 0.5) / K;
const speedAt = (p) => SPD_A + SPD_B * p;
const wAt = (t) => worldX(K * t);
const T_FORK = Math.log(FORK) / K, W_FORK = worldX(Math.log(FORK));
const TX = 0.72;        // seconds from the parting of the ways to going through the door
const STRIDE = 235;     // world units per full running cycle
const BOULDER_R = 124;
const windowFor = (def) => def.win || WINDOW[def.act];

/** Traps and treasure for one round, placed by time so they stay evenly paced at any speed. */
const planRun = () => {
  const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
  const J = shuffle(TRAP_SETS.jungle), S1 = shuffle(TRAP_SETS.serpent), S2 = shuffle(TRAP_SETS.sun), plan = [];
  let j = 0;
  for (let t = 1.5; t < T_FORK - 1.05; t += 1.26 + Math.random() * 0.16, j++) plan.push({ j, t, x: wAt(t), speed: speedAt(K * t), kinds: { J: J[j % J.length] } });
  let n = 0;
  for (let t = T_FORK + TX + 1.35; n < 90; t += 1.3 + Math.random() * 0.25, n++, j++) plan.push({ j, t, x: wAt(t), speed: speedAt(K * t), kinds: { L: S1[n % S1.length], R: S2[n % S2.length] } });
  const dead0 = W_FORK - 700, dead1 = wAt(T_FORK + TX + 0.9);
  return { plan, items: planItems(plan, TRAPS, speedAt, windowFor, (x) => x < dead0 || x > dead1) };
};

/* art is painted a little at a time while bets are open, so the first split and crash never hitch */
let warmQueue = null;
const buildWarmQueue = () => [...BIOMES.jungle.warm(), facadeImg, ...BIOMES.serpent.warm(), ...BIOMES.sun.warm(), ...warmCollapse()];

/* ---------- small living things ---------- */
const drawButterflies = (ctx, w, floorY, wx, T) => {
  for (let i = 0; i < 7; i++) {
    const x = U.wrap(i * 310 + 90 - wx * 0.9 + Math.sin(T * 0.5 + i) * 50, w + 160) - 80, y = floorY - 110 - (i % 3) * 56 + Math.sin(T * 1.3 + i * 2) * 22;
    const flap = 0.25 + 0.75 * Math.abs(Math.sin(T * 13 + i)), col = ['#6fe7ff', '#ffb04d', '#ff7ad1'][i % 3];
    glow(ctx, x, y, 16, col, 0.3);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(T * 2 + i) * 0.4);
    for (const sd of [-1, 1]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(sd * 4.4 * flap, -2, 4.6 * flap, 5.4, sd * 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = U.mixHex(col, '#000000', 0.25); ctx.beginPath(); ctx.ellipse(sd * 3.2 * flap, 3, 3 * flap, 3.4, sd * -0.3, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#1a120a'; ctx.fillRect(-0.7, -4.5, 1.4, 9);
    ctx.restore();
  }
};
const drawBats = (ctx, w, ext, T, panic, col) => {
  ctx.fillStyle = col;
  for (let i = 0; i < 8; i++) {
    const x = w + 120 - U.wrap(T * (panic ? 520 : 300 + i * 34) + i * 330, w + 360), y = 90 - ext * 0.5 + i * 24 + Math.sin(T * 5 + i * 1.7) * 14, f = Math.sin(T * 26 + i), s = 0.9 + (i % 3) * 0.3;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 6 * s, y - 7 * f * s - 2, x + 14 * s, y - 5 * f * s); ctx.quadraticCurveTo(x + 9 * s, y + 1, x + 2 * s, y + 3);
    ctx.quadraticCurveTo(x, y + 5, x - 2 * s, y + 3);
    ctx.quadraticCurveTo(x - 9 * s, y + 1, x - 14 * s, y - 5 * f * s); ctx.quadraticCurveTo(x - 6 * s, y - 7 * f * s - 2, x, y); ctx.fill();
  }
};
const MOTE = { jungle: '#fff1b8', serpent: '#7dffc8', sun: '#ffb860' };

/* ============================================================ */
CG.register({
  id: 'jungle-escape', name: 'Jungle Escape', sub: 'Temple Crash', accent: '#8fd14f', bg: '#07140f', tags: ['split'], graph: false,
  blurb: 'Outrun a carved stone wheel through a trapped jungle. At 1.80× the road parts: climb the stairs to the Sun Gate, or take the ramp down into the Serpent Hall.',
  mech: 'Split path at 1.80×', fork: FORK,
  routes: { L: { name: 'Serpent Hall', color: '#5fd38a', glyph: 'serpent', hint: 'Down the ramp', tag: 'Into the dark' }, R: { name: 'Sun Gate', color: '#ffcc4d', glyph: 'sun', hint: 'Up the stairs', tag: 'Into the fire' } },
  crashWord: 'Temple collapsed', cashWord: 'Escaped', coin: '#ffcc4d',
  crashLabel: (forked, route) => (!forked ? 'Caught on the trail' : route === 'L' ? 'The Serpent Hall fell' : 'The Sun Gate fell'),
  sound: { wave: 'triangle', base: 73, color: 0.6 },
  gauge: (m) => (m < FORK ? 'Jungle trail' : 'Chamber ' + (1 + Math.floor(Math.log(m / FORK) * 6))),

  init(w, h) {
    const W = w || 960, H = h || 540, motes = [];
    setQuality(W < 760 ? 0.8 : 1);
    if (!warmQueue) warmQueue = buildWarmQueue();
    for (let i = 0; i < 70; i++) motes.push({ x: Math.random() * W, y: 50 + Math.random() * H * 0.72, z: 0.3 + Math.random() * 0.7, ph: Math.random() * TAU });
    const { plan, items } = planRun();
    return { parts: new U.Particles(), fx: new U.Particles(), motes, rings: [], col: null, cashSeen: null, run: 0, step: 0, landed: false, bAng: 0, shake: 0, plan, items, fired: {}, darts: [], hero: {}, coinAt: 0, cheer: 0 };
  },

  draw(ctx, w, h, S, st) {
    const dt = S.dt, T = S.time, ca = S.crashAge;
    const betting = S.phase === 'betting', running = S.phase === 'running', crashing = S.phase === 'crashed';
    const ext = S.ext || 0, k = (h + ext) / h, floorY = Math.round(h * 0.8), exX = Math.round(w * 0.4);
    const Y0 = -ext - 40, H0 = h + ext + 80;
    if (warmQueue.length && (betting || running)) warmQueue.shift()();

    /* ---- where are we? ---- */
    const pp = betting ? 0 : S.p, wxReal = worldX(pp), sp = running ? speedAt(pp) : 0, dng = clamp(pp / 3.2, 0, 1);
    const e = S.forkPassed ? clamp((S.t - T_FORK) / TX, 0, 1) : 0, inside = S.forkPassed && e >= 1;
    const wx = inside ? wxReal : Math.min(wxReal, W_FORK);            // the jungle camera stops at the fork and he runs on ahead
    const biome = inside ? (S.route === 'L' ? BIOMES.serpent : BIOMES.sun) : BIOMES.jungle;
    const zone = inside ? S.route : 'J', tint = biome.tint;
    const lightK = (1 - dng * 0.3) * (crashing ? Math.max(0.2, 1 - ca * 0.5) : 1);
    const L = { w, h, ext, k, floorY, lightK };
    const fk = forkScale(w, exX), x0 = exX + (W_FORK - wx);           // the split set-piece: x0 is where the roads part
    const facadeOn = !inside && x0 < w + 60;

    /* ---- what is on screen, and what the explorer has to do about it ---- */
    const vis = [], tNow = betting ? 0 : S.t;
    for (const p of st.plan) {
      if (p.x < wx - 1200) continue;
      if (p.x > wx + w + 320) break;
      const kind = p.kinds[zone]; if (!kind) continue;
      vis.push({ j: p.j, kind, x: exX + p.x - wx, tau: p.t - tNow });
    }
    const once = (j, key) => { const id = j + key; if (st.fired[id] != null) return false; st.fired[id] = T; return true; };
    const sfx = (n) => { if (CG.sfx) CG.sfx(n); };
    const puff = (x, n, sz) => { for (let i = 0; i < n; i++) addPuff(st.parts, x + (Math.random() - 0.5) * 70, floorY - 8, sz, biome.dust, { vx: (Math.random() - 0.5) * 260, vy: -20 - Math.random() * 80, grow: 1.2, alpha: 0.45, life: 0.9 }); };
    const api = {
      once, sfx, puff, mark: (j, key) => { st.fired[j + key] = T; }, since: (j, key) => (st.fired[j + key] == null ? -1 : T - st.fired[j + key]),
      shake: (n) => { st.shake = Math.max(st.shake || 0, n); },
      dart: (x, y, spd) => st.darts.push({ x, y: floorY + y, vx: -(spd + 720) }),
      leaves: (x, n) => { for (let i = 0; i < n; i++) st.parts.add({ x: x + (Math.random() - 0.5) * 80, y: floorY - 4, vx: (Math.random() - 0.5) * 240, vy: -180 - Math.random() * 120, g: 480, drag: 1, life: 1, size: 5 + Math.random() * 4, color: ['#4f9a38', '#7a5a2a', '#6fb642'][i % 3], shape: 'leaf', vr: (Math.random() - 0.5) * 9, rot: Math.random() * TAU }); },
      shards: (x) => { for (let i = 0; i < 16; i++) st.parts.add({ x: x + (Math.random() - 0.5) * 50, y: floorY - 8, vx: (Math.random() - 0.5) * 420, vy: -160 - Math.random() * 300, g: 1300, life: 0.9, size: 4 + Math.random() * 6, h: 0.7, color: '#3f7a70', shape: 'stone', vr: (Math.random() - 0.5) * 12, rot: Math.random() * TAU, floor: floorY + 8 }); },
    };
    let jumpH = 0, jumpK = 0, jumpU = 0, slideK = 0, vaultK = 0, dashK = 0;
    if (running) for (const t of vis) {
      const def = TRAPS[t.kind], win = windowFor(def), u = (win[0] - t.tau) / (win[0] + win[1]);
      if (u > 0 && u < 1) {
        const env = Math.min(1, u / 0.18, (1 - u) / 0.18);
        if (def.act === 'jump') { jumpK = env; jumpU = u; jumpH = def.h * 4 * u * (1 - u); }
        else if (def.act === 'vault') { vaultK = env; jumpU = u; jumpH = def.h * Math.sin(Math.PI * u); }
        else if (def.act === 'slide') slideK = env; else dashK = env;
        if (once(t.j, 'act')) { sfx(def.act === 'slide' ? 'slide' : def.act === 'dash' ? 'step' : 'jump'); if (def.act !== 'dash') puff(exX, 5, 18); }
      }
      if (u >= 1 && def.h && once(t.j, 'land')) { sfx('land'); puff(exX, 7, 22); }
      trapEvents(t, t.tau, api, sp);
    }

    /* ---- camera ---- */
    ctx.save();
    U.shake(ctx, st, dt);
    if (running && dng > 0) ctx.translate(Math.sin(T * 41) * dng * 1.3, Math.cos(T * 33) * dng);
    if (running) ctx.translate(0, jumpK * 5 - slideK * 3); // the world dips a touch as he clears something
    const ze = e * (crashing ? 1 - smooth(ca / 0.3) : 1);
    ctx.save();
    if (ze > 0 && !inside) {
      const [fx, fy] = forkFocus(S.route), fX = x0 + fx * fk, fY = floorY + fy * fk, z = Math.exp(Math.log(3.4) * ze * ze * ze), se = smooth(ze);
      ctx.translate(lerp(fX, w / 2, se), lerp(fY, h * 0.46, se)); ctx.scale(z, z); ctx.translate(-fX, -fY);
    }

    /* ---- the world behind the runner ---- */
    biome.back(ctx, L, wx, T, S);
    if (st.col) drawCollapseWall(ctx, st.col, ca);
    drawRelics(ctx, wx, exX, w, floorY, T, dng, (x) => facadeOn && x > x0 - 180);
    if (facadeOn) drawFacade(ctx, x0, floorY, fk, S, T, ext);
    const firedAt = (j, key) => st.fired[j + key];
    for (const t of vis) if (t.x > -300 && t.x < w + 300) drawTrapBack(ctx, t, { floorY, T, betting, tint, ext, pitWall: biome.id === 'sun' ? '#6a2008' : '#0d4a40', firedAt });
    drawItems(ctx, st.items, zone, exX, wx, w, floorY, T, (it, x, y) => {
      for (let i = 0; i < (it.gem ? 16 : 6); i++) { const a = Math.random() * TAU, v = 50 + Math.random() * (it.gem ? 240 : 130); st.fx.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 240, life: 0.4 + Math.random() * 0.3, size: 1.4 + Math.random() * 1.4, color: it.gem ? GEM_GLOW[it.gem] : '#ffe08a' }); }
      if (T - st.coinAt > 0.06) { st.coinAt = T; sfx(it.gem ? 'gem' : 'coin'); }
    });

    /* ---- where the runner is ---- */
    let heroX = exX, heroY = floorY - jumpH, heroS = 0.9, heroA = 1, roadTilt = 0;
    if (e > 0 && !inside) { const fp = forkPath(S.route, e); heroX = x0 + fp.x * fk; heroY = floorY + fp.y * fk; heroS = 0.9 * fp.depth * lerp(1, fk, 0.5); heroA = fp.fade; roadTilt = fp.slope; }

    /* ---- the crash begins ---- */
    if (crashing && !st.col) {
      st.col = newCollapse(biome.id, { x: heroX, y: heroY, s: heroS }, L);
      st.shake = 34;
      for (let i = 0; i < 40; i++) st.parts.add({ x: Math.random() * w, y: Math.random() * floorY - ext, vx: (Math.random() - 0.5) * 80, vy: 40 + Math.random() * 120, g: 240, drag: 0.8, life: 2.2, size: 4 + Math.random() * 5, color: biome.id === 'jungle' ? ['#4f9a38', '#6fb642', '#2f7a30'][i % 3] : '#9a8a64', shape: biome.id === 'jungle' ? 'leaf' : 'stone', h: 0.7, vr: (Math.random() - 0.5) * 7, rot: Math.random() * TAU });
    }

    /* ---- the stone wheel ---- */
    let bx = 0;
    if (!betting) {
      const R = BOULDER_R, drop = clamp(S.t / 0.6, 0, 1);
      bx = exX - 300 + Math.sin(T * 0.9) * 24 + Math.sin(T * 2.3) * 9 - (running ? (1 - dng) * 20 : 0) + (e > 0 && !inside ? e * e * 170 * fk : 0);
      let by = floorY - R;
      if (running && drop < 1) by = lerp(-R * 2.2 - ext, floorY - R, drop * drop);
      if (!st.landed && (drop >= 1 || crashing)) {
        st.landed = true; st.shake = Math.max(st.shake || 0, 14);
        for (let i = 0; i < 18; i++) addPuff(st.parts, bx + (Math.random() - 0.5) * R * 1.8, floorY - 8, 42, biome.dust, { vx: (Math.random() - 0.5) * 300, vy: -30 - Math.random() * 90, grow: 1.5, alpha: 0.5, life: 1.3 });
        if (biome.leaves) api.leaves(bx, 30);
      }
      if (crashing) bx += ca * ca * 1050 + ca * 620;
      st.bAng += (dt * ((running ? sp : 0) + (crashing ? 620 + ca * 1100 : 0))) / R;
      if (running && Math.random() < dt * (14 + dng * 24)) addPuff(st.parts, bx - R * 0.3 + Math.random() * R * 0.6, floorY - 4, 26 + Math.random() * 18, biome.dust, { vx: -90 - sp * 0.4 - Math.random() * 80, vy: -20 - Math.random() * 40, grow: 1.5, alpha: 0.4, life: 1 });
      if ((running || (crashing && ca < 1.5)) && drop >= 1 && Math.random() < dt * (16 + dng * 46)) st.fx.add({ x: bx + 6 + Math.random() * 30, y: floorY - 2, vx: -60 - Math.random() * 260, vy: -70 - Math.random() * 190, g: 650, life: 0.45 + Math.random() * 0.4, size: 1.6 + Math.random(), color: Math.random() < 0.5 ? '#ffb347' : '#ffe08a' });
      const heat = crashing ? 1 : running ? 0.3 + dng * 0.7 + 0.08 * Math.sin(T * 7) : 0.25;
      if (bx - R < w + 40) drawBoulder(ctx, bx, by, R, st.bAng, floorY, heat);
    }

    /* ---- collapse behind him, then the runner himself ---- */
    if (st.col) { stepCollapse(st.col, ca, dt, { floorY, parts: st.parts, fx: st.fx, w, bx: bx + BOULDER_R, shake: api.shake, sfx }); drawCollapseBack(ctx, st.col, ca, floorY); }

    const rim = crashing ? '#ffb08a' : biome.rim;
    let tip = null;
    if (!st.col || !st.col.hit) {
      const ready = betting ? smooth((1.1 - S.countdown) / 1.1) : 1;
      let P = betting ? poseIdle(T, ready) : poseRun(st.run, dng);
      if (running) {
        if (S.t < 0.38) P = mixPose(poseIdle(T, 1), P, smooth(S.t / 0.38));
        if (jumpK) P = mixPose(P, poseJump(jumpU), jumpK);
        if (vaultK) P = mixPose(P, poseVault(jumpU), vaultK);
        if (slideK) P = mixPose(P, poseSlide(), slideK);
      }
      st.cheer = Math.max(0, st.cheer - dt * 1.4);
      if (st.cheer > 0 && !slideK && !vaultK) { const c = Math.min(1, st.cheer * 3); P = { ...P, near: { sh: lerp(P.near.sh, 2.9, c), el: lerp(P.near.el, 0.32, c) } }; }
      const shH = 1 - Math.min(0.6, jumpH / 190), ground = e > 0 && !inside ? heroY : floorY, sk = heroS / 0.9;
      if (heroA > 0.05) { ctx.fillStyle = 'rgba(0,0,0,' + (0.5 * shH * heroA).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(heroX + 4 + slideK * 26, ground + 3, (56 + slideK * 34) * shH * sk, 9 * shH * sk, 0, 0, TAU); ctx.fill(); }
      const look = running && dng > 0.1 && !jumpK && !slideK && !vaultK && U.wrap(T, 3.1) < 0.4;
      const o = { x: heroX, y: heroY, s: heroS, pose: P, dt, wind: running ? 0.55 + dng * 0.45 : crashing ? 0.3 : 0.1, time: T, face: st.cheer > 0.3 ? 'grin' : betting ? 'idle' : look || crashing ? 'panic' : 'run', look, rim, shade: biome.shade, glow: biome.dark ? 0.62 : 0.34, rot: e > 0 && !inside ? roadTilt * 0.28 : 0 };
      ctx.globalAlpha = heroA;
      tip = drawHero(ctx, st.hero, o);
      if (biome.dark && inside) drawHeroReflection(ctx, o, floorY, 0.16);
      ctx.globalAlpha = 1;
    } else {
      const H = st.col.hero;
      drawHero(ctx, st.hero, { x: H.x, y: H.y, s: H.s, pose: H.down ? poseDown() : poseFlung(T), dt, wind: 0.3, time: T, face: 'panic', rim, shade: biome.shade, glow: 0.3, rot: H.rot, noHat: true, noTorch: true });
    }
    if (running) {
      st.run += dt * Math.min(4.6, sp / STRIDE) * (1 + dashK * 0.35);
      const stp = Math.floor(st.run * 2);
      if (stp !== st.step) {
        st.step = stp;
        if (!jumpK && !slideK && !vaultK) { sfx('step'); for (let i = 0; i < 2; i++) addPuff(st.parts, exX + (Math.random() - 0.5) * 16, floorY - 4, 12 + Math.random() * 8, biome.dust, { vx: -sp * 0.32 - Math.random() * 50, vy: -14 - Math.random() * 30, grow: 1.8, alpha: 0.42, life: 0.65 }); }
      }
      if (slideK > 0.5) {
        if (Math.random() < dt * 90) st.fx.add({ x: exX + 44, y: floorY - 2, vx: -sp * 0.3 - Math.random() * 240, vy: -30 - Math.random() * 130, g: 700, life: 0.3 + Math.random() * 0.3, size: 1.5 + Math.random(), color: '#ffcf7a' });
        if (Math.random() < dt * 40) addPuff(st.parts, exX + 30, floorY - 4, 18, biome.dust, { vx: -sp * 0.4, vy: -20, grow: 1.6, alpha: 0.45, life: 0.6 });
      }
      if (tip && Math.random() < dt * 30) st.fx.add({ x: tip[0], y: tip[1] - 22, vx: -sp * 0.35 - Math.random() * 60, vy: -30 - Math.random() * 60, life: 0.5 + Math.random() * 0.5, size: 1.3 + Math.random() * 0.8, color: '#ffc46a' });
    }

    /* ---- things nearer than him ---- */
    for (const t of vis) if (t.x > -300 && t.x < w + 300) drawTrapFront(ctx, t, { floorY, T, ext, firedAt });
    st.darts = st.darts.filter((d) => (d.x += d.vx * dt) > -160);
    for (const d of st.darts) drawDart(ctx, d);
    if (st.col) drawCollapseFront(ctx, st.col, ca);

    /* ---- caves are dark: only the torch holds it back ---- */
    if (biome.dark) {
      const lx = tip ? tip[0] : heroX, ly = tip ? tip[1] : heroY - 120, rIn = crashing ? Math.max(40, 150 - ca * 60) : 150;
      ctx.fillStyle = rad(ctx, lx, ly, rIn, rIn + 640, [[0, 'rgba(' + biome.darkCol + ',0)'], [0.45, 'rgba(' + biome.darkCol + ',' + (biome.dark * 0.55).toFixed(3) + ')'], [1, 'rgba(' + biome.darkCol + ',' + Math.min(0.92, biome.dark + dng * 0.1).toFixed(3) + ')']]);
      ctx.fillRect(-40, Y0, w + 80, H0);
    }

    /* ---- particles, then the near layers ---- */
    st.parts.update(dt); st.parts.draw(ctx);
    if (biome.id === 'jungle' && !crashing) drawButterflies(ctx, w, floorY, wx, T);
    if (crashing || (running && dng > 0.25)) drawBats(ctx, w, ext, T, crashing, biome.id === 'jungle' ? '#0a1a10' : '#05080a');
    // the canopy belongs to the jungle: the cliff stands clear of it
    if (facadeOn) { ctx.save(); ctx.beginPath(); ctx.rect(-200, -ext - 200, x0 + 150 * fk + 200, h + ext + 500); ctx.clip(); biome.front(ctx, L, wx, T, S); ctx.restore(); }
    else biome.front(ctx, L, wx, T, S);
    ctx.restore(); // end of the split's zoom

    /* ---- cashing out: a fountain of coins and a golden ring ---- */
    if (S.cashAt && S.cashAt !== st.cashSeen) {
      st.cashSeen = S.cashAt; st.cheer = 1;
      U.burst(st.parts, exX, floorY - 150, ['#ffcc4d', '#fff1b0', '#e0a830'], 60, { speed: 520, shape: 'coin', size: 8, g: 900, life: 1.9 });
      U.burst(st.fx, exX, floorY - 130, ['rgba(255,241,176,0.9)'], 30, { speed: 620, shape: 'line', size: 2.2, g: 0, life: 0.45, spread: TAU });
      st.rings.push({ x: exX, y: floorY - 120, age: 0 });
    }

    /* ---- air: motes, speed streaks, rings ---- */
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const moteCol = MOTE[biome.id], rising = biome.id === 'sun';
    for (const m of st.motes) {
      m.x -= (sp * 0.55 * m.z + 6) * dt; m.y += Math.sin(T * 0.6 + m.ph) * 7 * dt + (crashing ? 30 * dt : 0) - (rising ? 26 * m.z * dt : 0);
      if (m.x < -10) { m.x = w + 10; m.y = 50 - ext + Math.random() * (floorY - 50 + ext); }
      if (m.y > floorY) m.y = 50 - ext; if (m.y < -ext) m.y = floorY - 4;
      const a = (0.18 + 0.3 * m.z) * (0.6 + 0.4 * Math.sin(T * 2 + m.ph)) * lightK, s = 1 + m.z * 1.8;
      if (m.z > 0.84 && biome.id !== 'sun') { const fa = Math.max(0, Math.sin(T * 1.7 + m.ph * 3)) * (crashing ? 0.3 : 1); if (fa > 0.05) glow(ctx, m.x, m.y, 8 + m.z * 5, biome.id === 'jungle' ? '#d8ff7a' : '#7dffc8', 0.6 * fa); }
      else { ctx.fillStyle = U.rgba(moteCol, a); ctx.fillRect(m.x, m.y, s, s); }
    }
    if (running && dng > 0.08 && Math.random() < dt * 40 * dng) st.fx.add({ x: w + 30, y: 70 + Math.random() * (floorY - 50), vx: -1800 - Math.random() * 900, life: 0.9, size: 1 + Math.random() * 1.4, color: 'rgba(255,240,205,0.34)', shape: 'line' });
    if (crashing && ca < 3.4 && Math.random() < dt * 40) st.fx.add({ x: Math.random() * w, y: -10 - ext, vx: (Math.random() - 0.5) * 50, vy: 60 + Math.random() * 120, g: 30, life: 2.4 + Math.random() * 1.6, size: 1.2 + Math.random() * 1.8, color: Math.random() < 0.5 ? '#ff9a3c' : '#ffd27a' });
    st.fx.update(dt); st.fx.draw(ctx);
    st.rings = st.rings.filter((r) => (r.age += dt) < 0.85);
    for (const r of st.rings) { const q = r.age / 0.85; ctx.strokeStyle = U.rgba('#ffd34d', (1 - q) * 0.9); ctx.lineWidth = 11 * (1 - q) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, 26 + q * 440, 0, TAU); ctx.stroke(); }
    ctx.restore();

    /* ---- grade: the edges of the frame burn hotter the higher it climbs ---- */
    if (running && dng > 0.05) {
      ctx.fillStyle = rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.42, Math.max(w, h) * 0.75, [[0, 'rgba(0,0,0,0)'], [1, U.rgba('#ff3a1a', 0.26 * dng * (0.8 + 0.2 * Math.sin(T * 5)))]]);
      ctx.fillRect(-40, Y0, w + 80, H0);
    }
    if (st.col) drawCollapseGrade(ctx, st.col, ca, L);
    ctx.restore();

    /* ---- passing through the door, the frame's vignette, and the fade up on a new round ---- */
    if (S.forkPassed && running) {
      const a = e < 1 ? smooth((e - 0.6) / 0.4) : Math.max(0, 1 - (S.t - T_FORK - TX) / 0.42);
      if (a > 0.003) { ctx.fillStyle = U.rgba(U.mixHex(S.routes[S.route].color, '#ffffff', 0.45), a); ctx.fillRect(-40, Y0, w + 80, H0); }
    }
    ctx.save(); ctx.translate(0, -ext); U.vignette(ctx, w, h + ext, biome.dark ? 0.3 : 0.45); ctx.restore();
    if (betting && S.countdown > 5.4) { ctx.fillStyle = 'rgba(0,0,0,' + smooth((S.countdown - 5.4) / 0.6).toFixed(3) + ')'; ctx.fillRect(-40, Y0, w + 80, H0); }
  },
});
