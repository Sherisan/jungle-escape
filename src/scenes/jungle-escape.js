/* JUNGLE ESCAPE: temple run, split at 1.80x */
import { CG } from '../engine/core.js';
import '../engine/art.js';

const U = CG.U;
const TAU = Math.PI * 2;

/* ============================================================
   9. JUNGLE ESCAPE: temple run, split at 1.80x
   ============================================================ */
const PX9 = 1600;
const templeTex = () => U.rockTile('je-stone', 256, '#2a2a1e', '#6a6a50', { scale: 0.04, seed: 77 });
const glyphSprite = () => U.sprite('je-glyph', 84, 84, (g) => {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(6, 6, 72, 72);
  g.strokeStyle = 'rgba(220,190,110,0.5)'; g.lineWidth = 3; g.strokeRect(10, 10, 64, 64);
  g.beginPath(); g.arc(42, 34, 12, 0, TAU); g.moveTo(30, 58); g.lineTo(54, 58); g.moveTo(42, 46); g.lineTo(42, 66); g.moveTo(22, 22); g.lineTo(30, 30); g.moveTo(62, 22); g.lineTo(54, 30); g.stroke();
});
CG.register({
  id: 'jungle-escape', name: 'Jungle Escape', sub: 'Temple Crash', accent: '#8fd14f', bg: '#0b120a', tags: ['split'],
  blurb: 'Sprint deeper into a trapped temple past torches and golden idols. At 1.80× choose the Serpent Hall or the Sun Gate.',
  mech: 'Split path at 1.80×', fork: 1.8,
  routes: { L: { name: 'Serpent Hall', color: '#5fd38a' }, R: { name: 'Sun Gate', color: '#ffcc4d' } },
  crashWord: 'Temple collapsed', cashWord: 'Escaped the temple', coin: '#ffcc4d',
  sound: { wave: 'triangle', base: 73, color: 0.6 },
  gauge: (m) => 'Chamber ' + (1 + Math.floor(Math.log(m) * 6)),
  init() { return { parts: new U.Particles(), crashed: false, cashed: false, run: 0, branch: 0 }; },
  draw(ctx, w, h, S, st) {
    const dt = S.dt, p = S.p, T = S.time, run = S.phase !== 'betting', pp = run ? p : 0;
    const wx = pp * PX9;
    st.branch += ((S.forkPassed ? 1 : 0) - st.branch) * Math.min(1, dt * 1.2);
    const b = st.branch, rc = S.forkPassed ? S.routes[S.route].color : '#d9a441', dark = U.clamp(pp / 4, 0, 1);
    const floorY = h * 0.78, exX = w * 0.34, crashing = S.phase === 'crashed';
    ctx.save(); U.shake(ctx, st, dt);
    // back wall
    const bp = wx * 0.6;
    ctx.fillStyle = U.pattern(ctx, templeTex(), -bp, 0); ctx.fillRect(-40, -40, w + 80, floorY + 40);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
    for (let row = 0; row * 44 < floorY; row++) { const o = (row % 2) * 44; ctx.beginPath(); ctx.moveTo(-40, row * 44); ctx.lineTo(w + 40, row * 44); ctx.stroke(); for (let x = -U.wrap(bp - o, 88); x < w + 88; x += 88) { ctx.beginPath(); ctx.moveTo(x, row * 44); ctx.lineTo(x, row * 44 + 44); ctx.stroke(); } }
    for (let i = Math.floor(bp / 264) - 1; i < Math.floor(bp / 264) + Math.ceil(w / 264) + 2; i++) if (U.hash(i, 2, 5) < 0.6) ctx.drawImage(glyphSprite(), i * 264 - bp + 90, 120 + (i % 2) * 88);
    ctx.fillStyle = U.lin(ctx, 0, 0, 0, floorY, [[0, 'rgba(4,6,2,0.85)'], [0.5, U.rgba('#060802', 0.35 + dark * 0.35)], [1, 'rgba(4,6,2,0.6)']]); ctx.fillRect(-40, -40, w + 80, floorY + 40);
    if (b > 0.01) { ctx.fillStyle = U.rgba(S.route === 'L' ? '#0a3a1a' : '#4a3a08', 0.35 * b); ctx.fillRect(-40, -40, w + 80, floorY + 40); }
    // light shafts
    U.rays(ctx, w, floorY, -U.wrap(wx * 0.6, 300), S.forkPassed && S.route === 'R' ? '#ffe7a0' : '#d8f0b0', 0.07 * (1 - dark * 0.6), T, 4);
    // torches
    for (let i = Math.floor(bp / 300) - 1; i < Math.floor(bp / 300) + 4; i++) {
      const x = i * 300 - bp + 150, y = h * 0.4, f = 0.8 + 0.2 * Math.sin(T * 14 + i * 3) * Math.sin(T * 9 + i);
      const fc = crashing ? '#ff5a1f' : '#ffa43a';
      U.light(ctx, x, y - 14, 170 * f, fc, 0.42);
      ctx.fillStyle = '#2a1a0c'; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.lineTo(x + 4, y + 30); ctx.lineTo(x - 4, y + 30); ctx.fill();
      ctx.fillStyle = U.lin(ctx, 0, y - 36, 0, y, [[0, 'rgba(255,240,180,0)'], [0.3, '#ffe08a'], [1, '#ff6a1f']]);
      ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.quadraticCurveTo(x - 10 + Math.sin(T * 9 + i) * 3, y - 18, x + Math.sin(T * 7 + i) * 4, y - 36 * f); ctx.quadraticCurveTo(x + 10, y - 16, x + 9, y); ctx.fill();
    }
    // fork doors
    const fx = exX + 140 + (Math.log(1.8) - pp) * PX9;
    if (S.fork && !S.forkPassed && fx < w + 260 && fx > -260 && !crashing) {
      ctx.fillStyle = U.pattern(ctx, templeTex(), 0, 0); ctx.fillRect(fx - 30, 0, 90, floorY);
      ['L', 'R'].forEach((k, j) => {
        const dx = fx - 30 + (j ? 90 : -150), col = S.routes[k].color, sel = S.route === k;
        ctx.fillStyle = '#030402'; ctx.beginPath(); ctx.moveTo(dx, floorY); ctx.lineTo(dx, floorY - 170); ctx.arc(dx + 60, floorY - 170, 60, Math.PI, TAU); ctx.lineTo(dx + 120, floorY); ctx.fill();
        ctx.strokeStyle = U.rgba(col, sel ? 0.9 : 0.4); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(dx - 6, floorY); ctx.lineTo(dx - 6, floorY - 170); ctx.arc(dx + 60, floorY - 170, 66, Math.PI, TAU); ctx.lineTo(dx + 126, floorY); ctx.stroke();
        U.light(ctx, dx + 60, floorY - 100, 120, col, sel ? 0.45 : 0.12);
        ctx.fillStyle = sel ? col : 'rgba(10,10,6,0.9)'; U.rr(ctx, dx - 4, floorY - 268, 128, 26, 4); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
        U.label(ctx, (j ? '▶ ' : '◀ ') + S.routes[k].name.toUpperCase(), dx + 60, floorY - 250, '800 14px "Big Shoulders Display", sans-serif', sel ? '#0b120a' : col, 'center');
      });
    }
    // ceiling + vines
    ctx.fillStyle = '#0c1208'; ctx.fillRect(-40, -40, w + 80, 70);
    for (let i = Math.floor((wx * 0.8) / 110) - 1; i < Math.floor((wx * 0.8) / 110) + Math.ceil(w / 110) + 2; i++) {
      const x = i * 110 - wx * 0.8, r = U.rng(i * 3 + 1), len = 50 + r() * 110;
      ctx.strokeStyle = '#2f5a22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 26);
      const ex2 = x + 6 + Math.sin(T + i) * 8; ctx.quadraticCurveTo(x + Math.sin(T + i) * 12, 26 + len / 2, ex2, 26 + len); ctx.stroke();
      for (let k = 1; k < 5; k++) { const t = k / 5, lx = U.lerp(x, ex2, t) + Math.sin(T + i) * 6 * t, ly = 26 + len * t; ctx.fillStyle = k % 2 ? '#4a8a2e' : '#3a6e24'; ctx.beginPath(); ctx.ellipse(lx + (k % 2 ? 7 : -7), ly, 9, 4, k % 2 ? 0.6 : -0.6, 0, TAU); ctx.fill(); }
    }
    // floor
    ctx.fillStyle = U.pattern(ctx, templeTex(), -wx, 0); ctx.fillRect(-40, floorY, w + 80, h);
    ctx.fillStyle = U.lin(ctx, 0, floorY, 0, h, [[0, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0.85)']]); ctx.fillRect(-40, floorY, w + 80, h);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let x = -U.wrap(wx, 130); x < w + 130; x += 130) ctx.fillRect(x, floorY, 3, h);
    ctx.fillStyle = 'rgba(255,230,160,0.12)'; ctx.fillRect(-40, floorY, w + 80, 3);
    // pillars + idols
    for (let i = Math.floor(wx / 400) - 1; i < Math.floor(wx / 400) + Math.ceil(w / 400) + 2; i++) {
      const x = i * 400 - wx + 40, r = U.rng(i * 13 + 2);
      if (S.fork && !S.forkPassed && Math.abs(x + 34 - fx) < 240) continue;
      const tilt = crashing ? Math.min(0.35, S.crashAge * 0.4) * (i % 2 ? 1 : -1) : 0;
      ctx.save(); ctx.translate(x + 34, floorY); ctx.rotate(tilt);
      ctx.fillStyle = U.lin(ctx, -34, 0, 34, 0, [[0, '#2a2a1e'], [0.3, '#7a7458'], [0.6, '#5a5640'], [1, '#22221a']]); ctx.fillRect(-34, -floorY + 50, 68, floorY - 50);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let k = 0; k < 4; k++) ctx.fillRect(-24 + k * 14, -floorY + 70, 4, floorY - 90);
      ctx.fillStyle = U.lin(ctx, 0, -floorY + 36, 0, -floorY + 58, [[0, '#8a8466'], [1, '#4a4636']]); ctx.fillRect(-44, -floorY + 36, 88, 22); ctx.fillRect(-44, -22, 88, 22);
      ctx.fillStyle = 'rgba(70,120,40,0.6)'; for (let k = 0; k < 5; k++) ctx.fillRect(-44 + k * 18, -floorY + 58, 8, 12 + (k % 3) * 10);
      ctx.restore();
      if (r() < 0.3 + pp * 0.18) {
        const ix = x + 210;
        ctx.fillStyle = U.lin(ctx, 0, floorY - 44, 0, floorY, [[0, '#6a6450'], [1, '#2a2820']]); ctx.fillRect(ix - 24, floorY - 44, 48, 44);
        U.light(ctx, ix, floorY - 70, 50, '#ffcc4d', 0.5 + 0.3 * Math.sin(T * 3 + i));
        ctx.fillStyle = U.lin(ctx, ix - 10, 0, ix + 10, 0, [[0, '#a8761a'], [0.5, '#ffe08a'], [1, '#a8761a']]);
        ctx.beginPath(); ctx.arc(ix, floorY - 82, 9, 0, TAU); ctx.fill(); ctx.fillRect(ix - 8, floorY - 74, 16, 30); ctx.fillRect(ix - 13, floorY - 68, 26, 6);
        ctx.fillStyle = '#3a2a08'; ctx.fillRect(ix - 4, floorY - 85, 2, 2); ctx.fillRect(ix + 2, floorY - 85, 2, 2);
      }
    }
    // explorer
    st.run += dt * (S.phase === 'running' ? 14 : S.phase === 'betting' ? 2 : 0);
    if (!(crashing && S.crashAge > 0.7)) U.person(ctx, { x: exX, y: floorY, s: 1.05, phase: st.run, mode: S.phase === 'betting' ? 'idle' : 'run', lean: S.phase === 'running' ? 0.12 : 0, coat: '#b89462', coatDark: '#6e5232', pants: '#4a3a26', hat: '#6a4a26', torch: true });
    // foreground foliage
    const fp = wx * 1.7;
    for (let i = Math.floor(fp / 520) - 1; i < Math.floor(fp / 520) + 3; i++) {
      const x = i * 520 - fp + 260, r = U.rng(i * 9);
      ctx.fillStyle = '#040703';
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.35, L = 90 + r() * 70; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * L * 0.5, h + 10 + Math.sin(a) * L * 0.5, L * 0.55, 16, a, 0, TAU); ctx.fill(); }
    }
    if (S.phase === 'running' && pp > 1 && Math.random() < dt * pp * 3) st.parts.add({ x: Math.random() * w, y: 60, vx: 0, vy: 40, g: 300, life: 1.6, size: 2, color: '#8a8260' });
    if (crashing && !st.crashed) {
      st.crashed = true; st.shake = 28;
      for (let k = 0; k < 44; k++) st.parts.add({ x: Math.random() * w, y: -40 - Math.random() * 320, vx: (Math.random() - 0.5) * 40, vy: 100 + Math.random() * 120, g: 900, life: 2.8, size: 20 + Math.random() * 28, h: 0.6, color: ['#6a634a', '#4a4434', '#7a7256'][k % 3], shape: 'rect', vr: (Math.random() - 0.5) * 4, fade: false });
      for (let k = 0; k < 34; k++) st.parts.add({ x: Math.random() * w, y: floorY - Math.random() * 120, vx: (Math.random() - 0.5) * 50, vy: -20, life: 3.2, size: 24, grow: 1.4, color: '#8a8260', alpha: 0.22 });
    }
    if (S.cashAt && !st.cashed) { st.cashed = true; U.burst(st.parts, exX, floorY - 90, ['#ffcc4d', '#fff1b0', '#d9a441'], 50, { speed: 340, shape: 'rect', size: 6, h: 0.5 }); }
    st.parts.update(dt); st.parts.draw(ctx);
    if (crashing) { ctx.fillStyle = 'rgba(8,8,4,' + Math.min(0.6, S.crashAge * 0.35) + ')'; ctx.fillRect(-40, -40, w + 80, h + 80); }
    U.vignette(ctx, w, h, 0.8);
    ctx.restore();
  },
});
