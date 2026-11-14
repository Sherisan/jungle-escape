/* The explorer: a broad-shouldered, bearded adventurer on a 2D skeleton, with a treasure sack on his back
   that swells as he collects gold.
   Poses are sets of joint angles, so running, jumping, sliding and being thrown can blend into each other.
   He is drawn to his own layer and lit as one figure: torch-warm on the near side, cool on the far side,
   with a thin rim of the surrounding light separating him from the scene. */
import { U, TAU, clamp, lerp, INK, capsule, solid, across, lin, rad, glow, fire } from './kit.js';

const C = {
  skin: '#d6976a', skinD: '#a0623a', skinHi: '#f0bd92', beard: '#3b2315', beardHi: '#5e3a22', hair: '#2a1910',
  shirt: '#ece0c3', shirtD: '#b0a07c', shirtHi: '#fff8e6', vest: '#5d3b20', vestD: '#37210f', vestHi: '#8a5c3a',
  pants: '#3b5470', pantsD: '#25364a', pantsHi: '#5f7f9d', boot: '#5e3c20', bootD: '#2f1c0e', bootHi: '#8f6539', sole: '#17100a',
  hat: '#c7a469', hatD: '#866538', hatHi: '#eed59c', band: '#7c2a1b', scarf: '#d9402a', scarfD: '#8c2415', scarfHi: '#ff7d58',
  pack: '#6c774a', packD: '#434b2b', packHi: '#98a36a', strap: '#3f2914', brass: '#e6ba56', roll: '#a23e28', rollD: '#6c2518',
};

/* ---------- animation data ---------- */
/** Periodic Catmull-Rom through [phase, value] keys. */
const cyc = (keys) => {
  const n = keys.length;
  return (q) => {
    q -= Math.floor(q);
    let i = 0; while (i < n - 1 && keys[i + 1][0] <= q) i++;
    const p0 = keys[(i - 1 + n) % n][1], p1 = keys[i][1], p2 = keys[(i + 1) % n][1], p3 = keys[(i + 2) % n][1];
    const t0 = keys[i][0], t1 = i + 1 < n ? keys[i + 1][0] : keys[0][0] + 1, u = (q - t0) / (t1 - t0);
    return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
  };
};
/* one leg across a stride: contact, loading, mid-stance, toe-off, heel kick, swing, reach */
const TH_C = cyc([[0, 0.62], [0.12, 0.38], [0.28, 0.02], [0.45, -0.44], [0.6, -0.48], [0.75, 0.12], [0.9, 0.82]]);
const KN_C = cyc([[0, 0.22], [0.12, 0.55], [0.28, 0.35], [0.45, 0.3], [0.6, 1.6], [0.75, 2.1], [0.9, 0.98]]);
const FT_C = cyc([[0, -0.38], [0.12, 0], [0.3, 0.02], [0.45, 0.82], [0.6, 1.2], [0.75, 0.7], [0.9, -0.12]]);
const legAt = (q, amp) => ({ th: TH_C(q) * amp, kn: KN_C(q), ft: FT_C(q) });

export const poseRun = (q, hard = 0) => {
  const amp = 0.94 + hard * 0.14;
  return {
    F: legAt(q, amp), B: legAt(q + 0.5, amp),
    lean: 0.25 + hard * 0.13 + Math.sin(TAU * 2 * q) * 0.03,
    near: { sh: 0.08 + 0.98 * Math.cos(TAU * (q + 0.55)), el: 1.42 + 0.34 * Math.sin(TAU * (q + 0.3)) },
    far: { sh: 1.02 + 0.08 * Math.sin(TAU * 2 * q), el: 1.42 + 0.05 * Math.sin(TAU * 2 * q) },
    head: Math.sin(TAU * 2 * q) * 0.035, pack: Math.sin(TAU * 2 * q + 1) * 1.6,
  };
};
export const poseIdle = (T, ready = 0) => {
  const b = Math.sin(T * 1.9), look = Math.sin(T * 0.7) * 0.5 + 0.5;
  return {
    F: { th: 0.2 + ready * 0.34, kn: 0.2 + ready * 0.9, ft: 0 }, B: { th: -0.24 - ready * 0.12, kn: 0.16 + ready * 0.58, ft: ready * 0.4 },
    lean: 0.03 + ready * 0.34 + b * 0.008,
    near: { sh: -0.2 + ready * 0.1 + b * 0.02, el: 0.36 + ready * 1 }, far: { sh: 0.98, el: 1.5 + b * 0.02 },
    head: 0.02 - look * 0.05 + ready * -0.1, pack: b * 0.5,
  };
};
export const poseJump = (u) => ({
  F: { th: 1.36, kn: 1.7, ft: 0.4 }, B: { th: -0.66 + u * 0.9, kn: 0.9 + u * 0.6, ft: 0.9 },
  lean: 0.14, near: { sh: -0.95 + u * 0.7, el: 1.1 }, far: { sh: 1.34, el: 1.2 }, head: -0.1, pack: 3 - u * 7,
});
export const poseVault = (u) => ({
  F: { th: 1.5, kn: 2.0, ft: 0.3 }, B: { th: 1.15 - u * 0.5, kn: 2.1, ft: 0.5 },
  lean: 0.6, near: { sh: 0.5, el: 0.12 }, far: { sh: 1.5, el: 1.05 }, head: -0.5, pack: 2,
});
export const poseSlide = () => ({
  F: { th: 1.45, kn: 0.18, ft: -0.5 }, B: { th: 0.55, kn: 2.32, ft: 0.4 },
  lean: -1.02, near: { sh: -1.4, el: 0.28 }, far: { sh: 1.4, el: 0.7 }, head: 0.82, pack: 0,
});
export const poseFlung = (T) => ({
  F: { th: 0.9 + Math.sin(T * 17) * 0.5, kn: 0.7 + Math.sin(T * 13) * 0.4, ft: 0.8 }, B: { th: -0.7 + Math.cos(T * 15) * 0.5, kn: 1.2, ft: 0.8 },
  lean: -0.3, near: { sh: 2.4 + Math.sin(T * 19) * 0.6, el: 0.5 }, far: { sh: -2.2 + Math.cos(T * 16) * 0.6, el: 0.8 }, head: 0.3, pack: 0,
});
export const poseDown = () => ({
  F: { th: 0.3, kn: 0.36, ft: 1.0 }, B: { th: -0.14, kn: 0.2, ft: 1.2 },
  lean: 0.02, near: { sh: 2.7, el: 0.3 }, far: { sh: 2.2, el: 0.4 }, head: -0.2, pack: 0,
});
const mix = (a, b, t) => a + (b - a) * t;
export const mixPose = (A, B, t) => {
  if (t <= 0) return A; if (t >= 1) return B;
  const L = (x, y) => ({ th: mix(x.th, y.th, t), kn: mix(x.kn, y.kn, t), ft: mix(x.ft, y.ft, t) }), R = (x, y) => ({ sh: mix(x.sh, y.sh, t), el: mix(x.el, y.el, t) });
  return { F: L(A.F, B.F), B: L(A.B, B.B), lean: mix(A.lean, B.lean, t), near: R(A.near, B.near), far: R(A.far, B.far), head: mix(A.head, B.head, t), pack: mix(A.pack, B.pack, t) };
};

/* ---------- body geometry ---------- */
const TH = 40, SH = 40, FOOT = 8.5, SJ = { x: 3, y: -49 }, UA = 29, FA = 27;
const legFK = (L) => { const kx = Math.sin(L.th) * TH, ky = Math.cos(L.th) * TH, sa = L.th - L.kn; return { ...L, kx, ky, ax: kx + Math.sin(sa) * SH, ay: ky + Math.cos(sa) * SH, sa }; };
const armFK = (A) => { const ex = SJ.x + Math.sin(A.sh) * UA, ey = SJ.y + Math.cos(A.sh) * UA, fa = A.sh + A.el; return { ex, ey, fa, hx: ex + Math.sin(fa) * FA, hy: ey + Math.cos(fa) * FA }; };

/* ---------- parts ---------- */
const drawBoot = (g, L, far) => {
  g.save(); g.translate(L.ax, L.ay); g.rotate(L.ft);
  const body = () => { g.beginPath(); g.moveTo(-8.5, -13); g.lineTo(7, -14); g.quadraticCurveTo(8, -7, 12.5, -4.6); g.quadraticCurveTo(23, -3, 23.5, 3); g.lineTo(23.5, 5.6); g.lineTo(-9.5, 5.6); g.quadraticCurveTo(-11, -4, -8.5, -13); g.closePath(); };
  body(); g.fillStyle = far ? C.bootD : lin(g, 0, -14, 0, 6, [[0, C.bootHi], [0.5, C.boot], [1, C.bootD]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.1; g.stroke();
  U.rr(g, -10.5, 5, 35, 4, 1.6); g.fillStyle = C.sole; g.fill();
  g.fillRect(-10.5, 8, 11, 2);
  if (!far) {
    g.strokeStyle = '#e0cda1'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 4; i++) { const y = -12 + i * 3.1; g.moveTo(2.5 + i * 0.8, y); g.lineTo(7.5 + i * 1.6, y + 1.4); } g.stroke();
    g.fillStyle = 'rgba(255,230,190,0.28)'; g.beginPath(); g.ellipse(17, -0.7, 5, 1.7, 0.25, 0, TAU); g.fill();
    g.fillStyle = C.pantsD; g.fillRect(-9, -15, 17.5, 3.4);
  }
  g.restore();
};

const drawLeg = (g, L, far) => {
  const mx = L.kx + (L.ax - L.kx) * 0.42, my = L.ky + (L.ay - L.ky) * 0.42;
  // shin and boot shaft under the trouser
  solid(g, () => { capsule(g, 0, 0, 12.4, L.kx, L.ky, 8.6); capsule(g, L.kx, L.ky, 8.6, L.ax, L.ay - 8, 6.6); }, far ? C.pantsD : across(g, 0, 0, L.kx, L.ky, 12, C.pantsD, C.pants, C.pantsHi), 1.3);
  if (!far) {
    g.save(); g.translate(L.kx * 0.55, L.ky * 0.55); g.rotate(-L.th); U.rr(g, -6.5, -6, 11, 12, 1.8); g.fillStyle = C.pantsD; g.fill(); g.strokeStyle = 'rgba(160,190,215,0.35)'; g.lineWidth = 0.8; g.stroke(); g.fillStyle = C.brass; g.fillRect(-1.6, -5, 2.4, 2.4); g.restore();
    g.save(); g.translate(L.kx, L.ky); g.rotate(-L.th); U.rr(g, -5.6, -6.4, 11, 11, 3); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fill(); g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(mx + 3, my - 4); g.lineTo(mx - 4, my + 1); g.moveTo(mx + 3, my + 3); g.lineTo(mx - 4, my + 7); g.stroke();
  }
  drawBoot(g, L, far);
};

/** Bush hat with a pinned-up side and a feather. `lift` raises the brim in the wind. */
export const drawHat = (g, lift = 0, T = 0, wind = 0) => {
  // feather tucked in the band, streaming back
  g.save(); g.translate(-9, -17); g.rotate(-2.55 + Math.sin(T * 14) * wind * 0.14);
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(13, -7, 30, -1); g.quadraticCurveTo(14, 4, 0, 0); g.fillStyle = lin(g, 0, -5, 0, 5, [[0, '#ff8a5a'], [1, '#b02a18']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.1; g.stroke();
  g.strokeStyle = 'rgba(255,240,210,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(1, 0); g.lineTo(28, -1); g.stroke(); g.restore();
  // crown with a pinch in the top
  g.beginPath(); g.moveTo(-14.5, -10); g.bezierCurveTo(-17, -30, -4, -33, 1, -28.5); g.bezierCurveTo(7, -33, 18, -30, 15.5, -10); g.closePath();
  g.fillStyle = lin(g, -16, -24, 18, -8, [[0, C.hatD], [0.55, C.hat], [1, C.hatHi]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
  g.strokeStyle = 'rgba(100,72,36,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(1, -28); g.quadraticCurveTo(-1, -20, 1, -13); g.stroke();
  g.fillStyle = 'rgba(255,250,225,0.6)'; g.beginPath(); g.ellipse(7, -23, 5.4, 2.4, -0.3, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-15, -17); g.lineTo(16, -17); g.lineTo(15.7, -10.5); g.lineTo(-14.7, -10.5); g.closePath(); g.fillStyle = C.band; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  U.rr(g, 7, -16.4, 5.4, 5, 1); g.fillStyle = C.brass; g.fill(); g.strokeStyle = 'rgba(60,34,10,0.9)'; g.lineWidth = 0.7; g.stroke();
  // wide brim, front edge lifting in the wind
  const f = -7.5 - lift * 4;
  g.beginPath(); g.moveTo(-31, -9); g.quadraticCurveTo(-22, -15, -6, -13.4); g.quadraticCurveTo(18, -14, 34, f); g.quadraticCurveTo(22, f + 6.4, 4, -6.4); g.quadraticCurveTo(-18, -5.6, -31, -9); g.closePath();
  g.fillStyle = lin(g, -30, 0, 34, 0, [[0, C.hatD], [0.6, C.hat], [1, C.hatHi]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.1; g.stroke();
  g.strokeStyle = 'rgba(70,44,18,0.5)'; g.lineWidth = 0.9; g.setLineDash([2.4, 2.2]); g.beginPath(); g.moveTo(-27, -9.4); g.quadraticCurveTo(0, -11, 30, f + 0.8); g.stroke(); g.setLineDash([]);
};

/** Head in profile, facing right, centred on the skull. */
const drawHead = (g, o) => {
  const face = o.face, T = o.time, run = face !== 'idle';
  // short hair at the nape
  g.beginPath(); g.moveTo(-11, -6); g.quadraticCurveTo(-15, 4, -10, 10); g.quadraticCurveTo(-5, 8, -3, -5); g.closePath(); g.fillStyle = C.hair; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
  // face: square brow, straight strong nose, heavy jaw
  g.beginPath(); g.moveTo(-11, -4); g.bezierCurveTo(-12, -15, 9, -16, 11.6, -6.5); g.lineTo(12.2, -3.4); g.quadraticCurveTo(11.8, -1, 16.2, 3.8); g.quadraticCurveTo(16.7, 6, 12.8, 6.4); g.lineTo(12.4, 8.8); g.lineTo(12.7, 11); g.quadraticCurveTo(13.2, 15.4, 8.6, 17); g.quadraticCurveTo(2, 18.8, -3.6, 14); g.quadraticCurveTo(-11.5, 9, -11, -4); g.closePath();
  g.fillStyle = lin(g, -12, 0, 15, 0, [[0, C.skinD], [0.5, C.skin], [1, C.skinHi]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  // cheek shadow, then a short full beard that follows the jaw
  g.beginPath(); g.moveTo(-5.8, 0.6); g.quadraticCurveTo(-3, 6.6, 3, 7.4); g.quadraticCurveTo(8.6, 5.8, 12.4, 7.4); g.lineTo(12.7, 11); g.quadraticCurveTo(13.2, 15.4, 8.6, 17); g.quadraticCurveTo(2, 18.8, -3.6, 14); g.quadraticCurveTo(-7, 11, -8, 6.4); g.closePath();
  g.fillStyle = lin(g, -8, 0, 13, 18, [[0, C.beard], [1, C.beardHi]]); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.3)'; for (const [x, y] of [[-3, 10], [1, 12], [5, 14], [8, 11], [2, 15.6], [-1, 7.4], [6, 9]]) { g.beginPath(); g.arc(x, y, 0.55, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(255,220,170,0.22)'; g.lineWidth = 0.7; g.beginPath(); for (const [x, y] of [[-1, 9], [3, 11], [7, 13], [10, 10], [4, 15]]) { g.moveTo(x, y); g.lineTo(x + 1.2, y + 1.6); } g.stroke();
  // a little scar across the cheek, and light on the nose
  g.strokeStyle = 'rgba(150,70,46,0.7)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(1.5, 2.5); g.lineTo(5, 5); g.stroke();
  g.fillStyle = 'rgba(255,230,200,0.45)'; g.beginPath(); g.ellipse(13.4, 1.6, 1.4, 2.6, -0.5, 0, TAU); g.fill();
  // moustache and mouth
  g.beginPath(); g.moveTo(5.4, 7.1); g.quadraticCurveTo(10.5, 5, 13.2, 7.4); g.quadraticCurveTo(9.4, 8.8, 5.4, 8.4); g.closePath(); g.fillStyle = C.beard; g.fill();
  if (face === 'panic') { g.fillStyle = '#3a120c'; g.beginPath(); g.ellipse(9.4, 11, 3.2, 2.8, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(7.2, 8.8, 4.2, 1.1); }
  else if (face === 'grin') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(5.6, 9.4); g.quadraticCurveTo(9.2, 13.4, 12.8, 9.2); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.9; g.stroke(); }
  else if (run) { g.fillStyle = '#fff'; U.rr(g, 7, 9.2, 5.6, 2.6, 0.8); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.9; g.stroke(); g.beginPath(); g.moveTo(9.8, 9.2); g.lineTo(9.8, 11.8); g.stroke(); }
  else { g.strokeStyle = '#2a140a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(7, 10.6); g.quadraticCurveTo(9.8, 11.6, 12.4, 10); g.stroke(); }
  // eye under a heavy, angled brow
  const blink = face === 'idle' && U.wrap(T, 3.6) < 0.13;
  if (blink) { g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.moveTo(3.4, -1.2); g.quadraticCurveTo(6, 0.4, 8.8, -1.2); g.stroke(); }
  else {
    const open = face === 'panic' ? 3.2 : 2.3;
    g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(6.1, -1.2, 3.4, open, 0, 0, TAU); g.fill();
    g.fillStyle = '#3b6a7a'; g.beginPath(); g.arc(7.2, -1.1, 1.9, 0, TAU); g.fill();
    g.fillStyle = '#0c0805'; g.beginPath(); g.arc(7.5, -1.1, 1.05, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(8, -1.9, 0.6, 0, TAU); g.fill();
    g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(2.8, -2.4); g.quadraticCurveTo(6, -4.4, 9.4, -2.6); g.stroke();
  }
  const by = face === 'panic' ? -7.6 : -5.2;
  g.strokeStyle = C.beard; g.lineWidth = 2.6; g.beginPath(); g.moveTo(1.4, by - 0.8); g.quadraticCurveTo(6, by - 2.2, 10.8, by + (face === 'panic' ? -0.4 : 1.4)); g.stroke();
  // ear and a tuft of sideburn
  g.beginPath(); g.ellipse(-2.8, 1, 2.7, 3.7, 0, 0, TAU); g.fillStyle = C.skinD; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = C.hair; g.beginPath(); g.moveTo(-7, -6); g.quadraticCurveTo(-3, 0, -5, 3.6); g.quadraticCurveTo(-1, -0.4, 0.6, -6); g.closePath(); g.fill();
  g.fillStyle = 'rgba(60,28,8,0.3)'; g.beginPath(); g.ellipse(4, -7.8, 11, 2.3, 0, 0, TAU); g.fill();
  // chin strap dangling from the hat
  g.strokeStyle = C.strap; g.lineWidth = 1; g.beginPath(); g.moveTo(-5, -9); g.quadraticCurveTo(-8, 6, -3, 15); g.stroke();
  if (!o.noHat) drawHat(g, o.wind, T, o.wind);
};

const drawTorso = (g, o) => {
  // shirt: deep chest, narrower waist
  g.beginPath(); g.moveTo(-12.5, -55); g.bezierCurveTo(-23, -40, -20, -15, -15, 2); g.lineTo(15, 2); g.bezierCurveTo(21, -14, 25, -36, 14, -55); g.quadraticCurveTo(0, -61, -12.5, -55); g.closePath();
  g.fillStyle = lin(g, -21, 0, 24, 0, [[0, C.shirtD], [0.58, C.shirt], [1, C.shirtHi]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
  g.strokeStyle = 'rgba(120,100,70,0.55)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(13, -42); g.quadraticCurveTo(10, -36, 13, -30); g.moveTo(16, -26); g.quadraticCurveTo(11, -21, 13, -14); g.stroke();
  // chest pocket with a buttoned flap
  U.rr(g, 9, -47, 9, 10, 1.4); g.fillStyle = 'rgba(120,100,70,0.22)'; g.fill(); g.strokeStyle = 'rgba(90,72,44,0.7)'; g.lineWidth = 0.9; g.stroke();
  g.beginPath(); g.moveTo(8.6, -47.5); g.lineTo(18.4, -47.5); g.lineTo(17.6, -43.4); g.lineTo(13.5, -42); g.lineTo(9.4, -43.4); g.closePath(); g.fillStyle = C.shirtD; g.fill(); g.strokeStyle = 'rgba(70,56,34,0.8)'; g.stroke();
  g.fillStyle = '#6f5b3a'; g.beginPath(); g.arc(13.5, -43.6, 0.9, 0, TAU); g.fill();
  // open leather vest
  g.beginPath(); g.moveTo(-13, -55); g.lineTo(6.5, -57); g.quadraticCurveTo(12, -40, 9, -22); g.lineTo(12, 1); g.lineTo(-15, 1); g.bezierCurveTo(-20, -15, -23, -40, -13, -55); g.closePath();
  g.fillStyle = lin(g, -20, 0, 11, 0, [[0, C.vestD], [0.7, C.vest], [1, C.vestHi]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  g.setLineDash([2.4, 2.2]); g.strokeStyle = 'rgba(240,205,140,0.55)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(3.6, -53); g.quadraticCurveTo(8, -40, 5.6, -22); g.lineTo(8, -1.5); g.stroke(); g.setLineDash([]);
  U.rr(g, -9, -30, 12.5, 11, 2); g.fillStyle = 'rgba(0,0,0,0.24)'; g.fill(); g.strokeStyle = 'rgba(240,205,140,0.32)'; g.lineWidth = 0.9; g.stroke();
  g.fillStyle = C.brass; g.beginPath(); g.arc(-2.8, -25, 1.2, 0, TAU); g.fill();
  // cross-body strap with a brass compass on it
  g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(11, -53); g.lineTo(-11, -1); g.stroke();
  g.strokeStyle = lin(g, 11, -53, -11, 0, [[0, '#7a5230'], [1, C.strap]]); g.lineWidth = 4.2; g.stroke();
  g.beginPath(); g.arc(4.4, -35, 3.6, 0, TAU); g.fillStyle = C.brass; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#f4efe0'; g.beginPath(); g.arc(4.4, -35, 2, 0, TAU); g.fill();
  // belt, buckle, knife sheath and a coil of rope
  U.rr(g, -15.5, -4.5, 31, 7.5, 1.8); g.fillStyle = lin(g, 0, -5, 0, 3, [[0, '#553519'], [1, '#2c1a0b']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
  U.rr(g, 8.6, -6, 7.4, 9.5, 1.5); g.fillStyle = lin(g, 8, 0, 16, 0, [[0, '#a87c22'], [0.5, '#ffe08a'], [1, '#8a6012']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke();
  g.strokeStyle = '#2c1a0b'; g.lineWidth = 4.2; g.beginPath(); g.arc(-13, 8, 6.4, 0, TAU); g.stroke(); g.strokeStyle = '#c9ad78'; g.lineWidth = 2.5; g.stroke();
  g.strokeStyle = 'rgba(90,60,30,0.6)'; g.lineWidth = 1; g.beginPath(); g.arc(-13, 8, 4, 0, TAU); g.stroke();
  // scarf knotted at the throat
  U.rr(g, -7, -60, 24, 9.5, 4.6); g.fillStyle = lin(g, 0, -60, 0, -50, [[0, C.scarfHi], [1, C.scarfD]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.9; g.stroke();
  g.beginPath(); g.moveTo(11, -54); g.lineTo(18.5, -46); g.lineTo(10, -47.5); g.closePath(); g.fillStyle = C.scarf; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
};

const SACK = { cloth: '#c79d60', clothD: '#7a5630', clothHi: '#efd6a2', rope: '#e0c890', ropeD: '#7a6034', patch: '#5e3a1e' };

/** The treasure sack slung on his back. f: how full (0..1); bump: the squash when a coin drops in.
    Returns its mouth in torso space, where collected coins fly in. */
const drawSack = (g, P, f, bump, T) => {
  const sw = P.pack;
  g.save(); g.translate(-3, sw * 0.8); g.rotate(sw * 0.025);
  const k = 1 + bump * 0.12, rx = (13 + f * 12) * k, ry = (17 + f * 11) * (1 + bump * 0.06), cx = -25 - f * 5, cy = -30 + f * 4;
  const nx = -19, ny = -56; // the neck, where the rope is tied
  // the sling running from the neck over his shoulder
  g.strokeStyle = INK; g.lineWidth = 6.4; g.beginPath(); g.moveTo(nx + 3, ny + 2); g.quadraticCurveTo(-8, -68, 7, -57); g.stroke();
  g.strokeStyle = C.strap; g.lineWidth = 3.8; g.stroke();
  const body = () => {
    g.beginPath();
    g.moveTo(nx - 5, ny + 3);
    g.bezierCurveTo(cx - rx * 0.7, cy - ry * 0.9, cx - rx * 1.12, cy + ry * 0.2, cx - rx * 0.62, cy + ry * 0.86);
    g.quadraticCurveTo(cx, cy + ry * 1.2, cx + rx * 0.7, cy + ry * 0.8);
    g.bezierCurveTo(cx + rx * 1.06, cy + ry * 0.3, nx + 10, ny + 16, nx + 5, ny + 3);
    g.closePath();
  };
  body(); g.fillStyle = lin(g, cx - rx, cy - ry, cx + rx, cy + ry, [[0, SACK.clothD], [0.55, SACK.cloth], [1, SACK.clothHi]]); g.fill();
  g.save(); body(); g.clip();
  // woven burlap
  g.lineWidth = 0.9; g.strokeStyle = 'rgba(60,36,12,0.17)'; g.beginPath();
  for (let i = -70; i < 70; i += 3.2) { g.moveTo(cx - 45, cy + i); g.lineTo(cx + 45, cy + i + 45); }
  g.stroke();
  g.strokeStyle = 'rgba(255,244,210,0.11)'; g.beginPath();
  for (let i = -70; i < 70; i += 3.2) { g.moveTo(cx - 45, cy + i); g.lineTo(cx + 45, cy + i - 45); }
  g.stroke();
  // folds gathering into the neck
  g.strokeStyle = 'rgba(70,44,16,0.55)'; g.lineWidth = 1.5;
  for (const dx of [-8, -2, 5]) { g.beginPath(); g.moveTo(nx + dx * 0.35, ny + 5); g.quadraticCurveTo(cx + dx, cy - ry * 0.2, cx + dx * 1.5, cy + ry * 0.55); g.stroke(); }
  // the weight of the gold rounds out the bottom
  g.fillStyle = rad(g, cx - rx * 0.3, cy - ry * 0.35, 2, Math.max(rx, ry) * 1.6, [[0, 'rgba(0,0,0,0)'], [0.68, 'rgba(0,0,0,0)'], [1, 'rgba(36,18,4,0.5)']]); g.fillRect(cx - 70, cy - 70, 140, 140);
  g.restore();
  body(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
  // a stitched leather patch with a gold coin painted on it
  g.save(); g.translate(cx - rx * 0.1, cy + ry * 0.22); g.rotate(-0.12);
  U.rr(g, -8, -7.5, 16, 15, 2.6); g.fillStyle = SACK.patch; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1; g.stroke();
  g.setLineDash([1.6, 1.6]); g.strokeStyle = 'rgba(240,210,150,0.75)'; g.lineWidth = 0.8; U.rr(g, -6.4, -6, 12.8, 12, 2); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.arc(0, 0, 4.2, 0, TAU); g.fillStyle = lin(g, -4, -4, 4, 4, [[0, '#fff1a8'], [0.5, '#f0b432'], [1, '#8a5a0c']]); g.fill(); g.strokeStyle = '#5a3505'; g.lineWidth = 0.9; g.stroke();
  g.strokeStyle = '#8a5a0c'; g.lineWidth = 0.9; g.beginPath(); g.arc(0, 0, 2.4, 0, TAU); g.stroke();
  g.restore();
  // the rope tie and its swinging ends
  for (const s2 of [0, 1]) {
    const a2 = 1.9 + s2 * 0.5 + Math.sin(T * 9 + s2 * 2) * 0.25 + sw * 0.08, ex = nx - 7 + Math.cos(a2) * 9, ey = ny + 4 + Math.sin(a2) * 12;
    g.strokeStyle = SACK.ropeD; g.lineWidth = 2.6; g.beginPath(); g.moveTo(nx - 5, ny + 4); g.quadraticCurveTo(nx - 9, ny + 9, ex, ey); g.stroke();
    g.strokeStyle = SACK.rope; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = SACK.rope; g.beginPath(); g.arc(ex, ey, 1.8, 0, TAU); g.fill();
  }
  g.strokeStyle = SACK.ropeD; g.lineWidth = 3.8; g.beginPath(); g.ellipse(nx, ny + 3, 7.2, 2.7, -0.1, 0, TAU); g.stroke();
  g.strokeStyle = SACK.rope; g.lineWidth = 2.2; g.stroke();
  g.strokeStyle = 'rgba(90,60,20,0.8)'; g.lineWidth = 0.8; g.beginPath(); for (let i = -6; i <= 6; i += 2.4) { g.moveTo(nx + i, ny + 1); g.lineTo(nx + i + 1.4, ny + 5); } g.stroke();
  // the flared mouth, heaped with treasure
  const mx = nx - 1, my = ny - 4;
  g.beginPath(); g.moveTo(mx - 9, my + 4); g.quadraticCurveTo(mx - 12, my - 2, mx - 7, my - 3); g.lineTo(mx + 7, my - 4); g.quadraticCurveTo(mx + 11, my - 1, mx + 7, my + 4); g.closePath();
  g.fillStyle = lin(g, mx - 10, 0, mx + 10, 0, [[0, SACK.clothD], [0.6, SACK.cloth], [1, SACK.clothHi]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
  g.beginPath(); g.ellipse(mx, my - 2.4, 7.6, 2.6, -0.06, 0, TAU); g.fillStyle = '#2e1c0a'; g.fill();
  const n = 2 + Math.round(f * 7);
  for (let i = 0; i < n; i++) {
    const ax = mx - 6 + ((i * 5.3) % 12), ay = my - 3 - (i % 3) * 2 - f * 3 + (i > 5 ? -2.4 : 0);
    g.beginPath(); g.ellipse(ax, ay, 3.8, 1.8, i % 2 ? 0.3 : -0.2, 0, TAU);
    g.fillStyle = lin(g, ax - 3, ay - 2, ax + 3, ay + 2, [[0, '#fff3b4'], [0.5, '#ffc93e'], [1, '#a0640c']]); g.fill(); g.strokeStyle = '#5a3505'; g.lineWidth = 0.8; g.stroke();
  }
  if (f > 0.3) { const gx = mx + 3, gy = my - 7 - f * 3; g.beginPath(); g.moveTo(gx, gy - 4); g.lineTo(gx + 3.2, gy); g.lineTo(gx, gy + 3.6); g.lineTo(gx - 3.2, gy); g.closePath(); g.fillStyle = '#e8283c'; g.fill(); g.strokeStyle = '#4a0610'; g.lineWidth = 0.8; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(gx - 1.4, gy - 2, 1.3, 1.6); }
  if (f > 0.6) { const gx = mx - 5, gy = my - 8 - f * 2; g.beginPath(); g.moveTo(gx, gy - 3.4); g.lineTo(gx + 2.8, gy); g.lineTo(gx, gy + 3); g.lineTo(gx - 2.8, gy); g.closePath(); g.fillStyle = '#25c47e'; g.fill(); g.strokeStyle = '#04301c'; g.lineWidth = 0.8; g.stroke(); }
  g.restore();
  return [mx - 3, my - 4 - f * 3 + sw * 0.8];
};

const drawArm = (g, A, far) => {
  const mx = A.ex + (A.hx - A.ex) * 0.25, my = A.ey + (A.hy - A.ey) * 0.25;
  solid(g, () => capsule(g, A.ex, A.ey, 5.4, A.hx, A.hy, 4.2), far ? C.skinD : across(g, A.ex, A.ey, A.hx, A.hy, 5.4, C.skinD, C.skin, C.skinHi), 1.3);
  if (!far) { // forearm muscle and a leather bracer
    const t0 = 0.6, t1 = 0.9, bx0 = A.ex + (A.hx - A.ex) * t0, by0 = A.ey + (A.hy - A.ey) * t0, bx1 = A.ex + (A.hx - A.ex) * t1, by1 = A.ey + (A.hy - A.ey) * t1;
    g.strokeStyle = INK; g.lineWidth = 11; g.lineCap = 'butt'; g.beginPath(); g.moveTo(bx0, by0); g.lineTo(bx1, by1); g.stroke();
    g.strokeStyle = C.vest; g.lineWidth = 8.6; g.stroke(); g.lineCap = 'round';
  }
  solid(g, () => capsule(g, SJ.x, SJ.y, 8.6, A.ex, A.ey, 6.6), far ? C.shirtD : across(g, SJ.x, SJ.y, A.ex, A.ey, 8, C.shirtD, C.shirt, C.shirtHi), 1.4);
  // sleeve rolled above the elbow
  const nx = -(A.ey - SJ.y) / UA, ny = (A.ex - SJ.x) / UA, cx = A.ex + (mx - A.ex) * -0.8, cy = A.ey + (my - A.ey) * -0.8;
  g.strokeStyle = far ? C.shirtD : '#d8c9a2'; g.lineWidth = 5.2; g.beginPath(); g.moveTo(cx - nx * 6.2, cy - ny * 6.2); g.lineTo(cx + nx * 6.2, cy + ny * 6.2); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - nx * 6.2 + 1.5, cy - ny * 6.2 + 2); g.lineTo(cx + nx * 6.2 + 1.5, cy + ny * 6.2 + 2); g.stroke();
  // leather glove with a cuff
  const ux = Math.sin(A.fa), uy = Math.cos(A.fa), wx = A.hx - ux * 5.6, wy = A.hy - uy * 5.6;
  g.lineCap = 'butt'; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.moveTo(wx - ux * 1.6, wy - uy * 1.6); g.lineTo(wx + ux * 2.4, wy + uy * 2.4); g.stroke();
  g.strokeStyle = far ? '#3a2410' : '#8a5e34'; g.lineWidth = 7.6; g.stroke(); g.lineCap = 'round';
  g.beginPath(); g.arc(A.hx, A.hy, 5.5, 0, TAU); g.fillStyle = far ? '#3a2412' : lin(g, A.hx - 5, A.hy - 5, A.hx + 5, A.hy + 5, [[0, '#b07c46'], [0.5, '#7a4e26'], [1, '#43260e']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
  if (!far) { g.strokeStyle = 'rgba(255,224,176,0.45)'; g.lineWidth = 1.1; g.beginPath(); g.arc(A.hx, A.hy, 3.3, -2.5, -0.9); g.stroke(); g.strokeStyle = 'rgba(30,14,4,0.6)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(A.hx + ux * 1.5 - uy * 3, A.hy + uy * 1.5 + ux * 3); g.lineTo(A.hx + ux * 1.5 + uy * 3, A.hy + uy * 1.5 - ux * 3); g.stroke(); }
};

/** Scarf tail: a chain that really flies, integrated once per frame. */
const stepScarf = (H, ax, ay, dt, wind, T) => {
  const n = 9, seg = 7.6;
  if (!H.scarf) { H.scarf = []; for (let i = 0; i < n; i++) H.scarf.push({ x: ax - i * seg, y: ay, px: ax - i * seg, py: ay }); }
  const P = H.scarf, d = Math.min(1 / 30, dt);
  P[0].x = ax; P[0].y = ay; P[0].px = ax; P[0].py = ay;
  for (let i = 1; i < n; i++) {
    const p = P[i], vx = (p.x - p.px) * 0.93, vy = (p.y - p.py) * 0.93;
    p.px = p.x; p.py = p.y;
    p.x += vx - (500 + wind * 2600) * d * d; p.y += vy + (520 + Math.sin(T * 17 - i * 0.9) * (500 + wind * 3200)) * d * d;
  }
  for (let it = 0; it < 4; it++) for (let i = 1; i < n; i++) { const a = P[i - 1], b = P[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.max(0.001, Math.hypot(dx, dy)), k = (l - seg) / l; if (i > 1) { a.x += dx * k * 0.5; a.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; } else { b.x -= dx * k; b.y -= dy * k; } }
};
const drawScarf = (g, H) => {
  const P = H.scarf, n = P.length, L = [], R = [];
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.max(0.001, Math.hypot(dx, dy)), w = lerp(5, 2.2, i / (n - 1));
    L.push([p.x - (dy / l) * w, p.y + (dx / l) * w]); R.push([p.x + (dy / l) * w, p.y - (dx / l) * w]);
  });
  g.beginPath(); L.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath();
  g.fillStyle = lin(g, P[0].x, P[0].y - 6, P[0].x, P[0].y + 6, [[0, C.scarfHi], [0.5, C.scarf], [1, C.scarfD]]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.7; g.stroke();
};

/** Paints him with feet at the origin, facing right. Returns the torch tip in layer units. */
const paintHero = (g, H, o) => {
  const P = o.pose, s = o.s;
  g.save(); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
  if (o.rot) { g.translate(0, -72); g.rotate(o.rot); g.translate(0, 72); }
  const FL = legFK(P.F), BL = legFK(P.B), hipH = Math.max(FL.ay, BL.ay) + FOOT;
  g.translate(0, -hipH);
  const inTorso = (fn) => { g.save(); g.rotate(P.lean); fn(); g.restore(); };
  const cl = Math.cos(P.lean), sl = Math.sin(P.lean);
  // the scarf is simulated in body space, anchored at the back of the neck
  stepScarf(H, -5 * cl + 58 * sl, -5 * sl - 58 * cl, o.dt, o.wind, o.time);
  drawScarf(g, H);
  const NA = armFK(P.near), FA2 = armFK(P.far);
  let tip = null;
  inTorso(() => {
    // far arm and the torch it carries, held upright whatever the body is doing
    const td = [0.22 * Math.cos(-P.lean) + 0.975 * Math.sin(-P.lean), 0.22 * Math.sin(-P.lean) - 0.975 * Math.cos(-P.lean)];
    if (!o.noTorch) {
      g.save(); g.translate(FA2.hx, FA2.hy);
      solid(g, () => capsule(g, -td[0] * 9, -td[1] * 9, 2.7, td[0] * 20, td[1] * 20, 3.3), lin(g, -3, 0, 3, 0, [[0, '#3e2410'], [0.6, '#7a4c24'], [1, '#a57242']]), 1.3);
      solid(g, () => capsule(g, td[0] * 18, td[1] * 18, 4.4, td[0] * 28, td[1] * 28, 5.2), '#8e6b3c', 1.3);
      g.strokeStyle = '#3a3a40'; g.lineWidth = 1.8; g.beginPath();
      for (const t of [19.5, 23, 26.5]) { const nx = -td[1] * 5, ny = td[0] * 5; g.moveTo(td[0] * t - nx, td[1] * t - ny); g.lineTo(td[0] * t + nx, td[1] * t + ny); }
      g.stroke(); g.restore();
      tip = [FA2.hx + td[0] * 29, FA2.hy + td[1] * 29];
    }
    drawArm(g, FA2, true);
  });
  drawLeg(g, BL, true);
  let bag = [0, 0];
  inTorso(() => { bag = drawSack(g, P, o.bag || 0, H.bump || 0, o.time); });
  drawLeg(g, FL, false);
  inTorso(() => {
    drawTorso(g, o);
    solid(g, () => capsule(g, 3, -58, 5.8, 6, -66, 5.2), C.skinD, 1.1);
    g.save(); g.translate(8, -77); g.rotate(-P.lean * 0.72 + P.head); g.scale(1.1, 1.1);
    if (o.look) g.scale(-1, 1);
    drawHead(g, o); g.restore();
    drawArm(g, NA, false);
  });
  g.restore();
  // torso space to layer space: lean, hip height, the whole-body roll, then scale
  const out = (p) => {
    const tx = p[0] * cl - p[1] * sl, ty = p[0] * sl + p[1] * cl - hipH;
    if (o.rot) { const c = Math.cos(o.rot), sn = Math.sin(o.rot), yy = ty + 72; return [(tx * c - yy * sn) * s, (tx * sn + yy * c - 72) * s]; }
    return [tx * s, ty * s];
  };
  H.bagAt = out(bag);
  return tip ? out(tip) : null;
};

const heroLayer = document.createElement('canvas'), rimLayer = document.createElement('canvas');
const BOX = { left: 200, right: 220, up: 300, down: 60 };

/** Draws the explorer. Returns the world position of his torch tip (or null when he has dropped it). */
export const drawHero = (ctx, H, o) => {
  const M = ctx.getTransform(), k = Math.min(3, Math.hypot(M.a, M.b)), LW = BOX.left + BOX.right, LH = BOX.up + BOX.down;
  const pw = Math.ceil(LW * k), ph = Math.ceil(LH * k);
  if (heroLayer.width !== pw || heroLayer.height !== ph) { heroLayer.width = rimLayer.width = pw; heroLayer.height = rimLayer.height = ph; }
  const g = heroLayer.getContext('2d'), r = rimLayer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, pw, ph);
  g.setTransform(k, 0, 0, k, BOX.left * k, BOX.up * k);
  H.bump = Math.max(0, (H.bump || 0) - (o.dt || 0) * 5);
  const tip = paintHero(g, H, o);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
  if (tip) {
    const lx = (BOX.left + tip[0]) * k, ly = (BOX.up + tip[1]) * k;
    g.globalAlpha = o.glow; g.fillStyle = rad(g, lx, ly, 0, 200 * k, [[0, 'rgba(255,190,100,0.42)'], [0.5, 'rgba(255,150,60,0.15)'], [1, 'rgba(255,150,60,0)']]); g.fillRect(0, 0, pw, ph); g.globalAlpha = 1;
  }
  // the side away from the light falls into the colour of the surrounding shadow
  g.fillStyle = lin(g, (BOX.left - 90 * o.s) * k, 0, (BOX.left + 44 * o.s) * k, 0, [[0, o.shade], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, pw, ph);
  g.restore();
  r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'copy'; r.drawImage(heroLayer, 0, 0);
  r.globalCompositeOperation = 'source-in'; r.fillStyle = o.rim; r.fillRect(0, 0, pw, ph); r.globalCompositeOperation = 'source-over';
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * 0.9; ctx.drawImage(rimLayer, o.x - BOX.left - 2, o.y - BOX.up - 0.8, LW, LH); ctx.globalAlpha = ga;
  ctx.drawImage(heroLayer, o.x - BOX.left, o.y - BOX.up, LW, LH);
  // the gold in the sack shines
  const bx = o.x + H.bagAt[0], by = o.y + H.bagAt[1], f = o.bag || 0;
  H.bagWorld = [bx, by];
  glow(ctx, bx, by, (26 + f * 34 + (H.bump || 0) * 20) * (o.s + 0.1), '#ffd34d', (0.18 + f * 0.36 + (H.bump || 0) * 0.3) * ga);
  if (Math.sin(o.time * 3.1) > 0.75) { const k2 = (Math.sin(o.time * 3.1) - 0.75) * 4, op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,248,210,' + (0.9 * ga).toFixed(3) + ')'; const r = 7 * k2 * o.s, sx = bx - 3, sy = by - 3; ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.18, sy - r * 0.18); ctx.lineTo(sx + r, sy); ctx.lineTo(sx + r * 0.18, sy + r * 0.18); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.18, sy + r * 0.18); ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * 0.18, sy - r * 0.18); ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = op; }
  if (!tip) return null;
  const tipX = o.x + tip[0], tipY = o.y + tip[1];
  glow(ctx, tipX, tipY - 14, 230 * o.s + 70, '#ffa43a', 0.34 * ga * o.glow);
  fire(ctx, tipX, tipY, 11 * (o.s + 0.2), 56 * (o.s + 0.2), o.time, 3, '#ffb43a', '#ff5a14', -o.wind * 0.9);
  glow(ctx, tipX, tipY - 16, 50, '#ffe0a0', 0.42 * ga * o.glow);
  return [tipX, tipY];
};

/** Mirror image on a polished floor: the finished layer, flipped and faded. */
export const drawHeroReflection = (ctx, o, floorY, a) => {
  const LW = BOX.left + BOX.right, LH = BOX.up + BOX.down;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, 2 * floorY); ctx.scale(1, -1);
  ctx.drawImage(heroLayer, o.x - BOX.left, o.y - BOX.up, LW, LH); ctx.restore();
};
