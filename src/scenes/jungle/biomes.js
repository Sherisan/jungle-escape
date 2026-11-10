/* The three places the run passes through, each a stack of pre-painted parallax layers:
   JUNGLE  sunlit rainforest with ruins (1.00x to the split)
   SERPENT drowned emerald cavern with a colossal stone snake (left route)
   SUN     gilded temple over rivers of lava (right route)
   A biome draws in two halves: `back` is everything behind the runner, `front` everything nearer the camera. */
import { U, TAU, clamp, lerp, sprite, strip, drawStrip, put, lin, rad, ramp16, glow, glowImg, foliage, trunk, vine, fern, bigLeaf, tuft, dab, rock, fire, texFill, stoneTex, earthTex, slateTex, sandTex } from './kit.js';
import { flower, FLOWERS, glyph, motifPath, guardianSprite, bannerSprite } from './relics.js';

const H0 = 540;

/* ---------- shared painters ---------- */
const ridge = (g, W, H, base, amp, seed, col) => {
  const r = U.rng(seed), fs = [2, 3, 5, 8, 13].map((f, i) => [f, r() * TAU, 1 / (1 + i * 0.7)]);
  g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) { let v = 0; for (const [f, p, a] of fs) v += Math.sin((x / W) * TAU * f + p) * a; g.lineTo(x, base - amp * v * 0.45); }
  g.lineTo(W, H); g.closePath(); g.fill();
};
const haze = (col, y0, a0, a1) => (g, W, H) => { g.fillStyle = lin(g, 0, y0, 0, H, [[0, U.rgba(col, a0)], [1, U.rgba(col, a1)]]); g.fillRect(0, 0, W, H); };
const TW = { deep: '#17100a', dark: '#2b1e14', mid: '#4a3525', light: '#7a5c3c', groove: '#120a05', hi: '#b89668', moss0: '#3f7f30', moss1: '#62a53a', moss2: '#2e6226' };
const NEAR = ramp16([[0, '#04261f'], [0.33, '#0d4a30'], [0.6, '#217a3a'], [0.84, '#5cb040'], [1, '#d2ef6e']]);
const MID = ramp16([[0, '#0c4a44'], [0.4, '#1c7158'], [0.74, '#3a9a62'], [1, '#93d074']]);
const FAR = ramp16([[0, '#2a7a74'], [0.5, '#48a088'], [1, '#93d6a8']]);

/* ---------- JUNGLE ---------- */
const jSky = () => sprite('j-sky', 8, 540, 1, (g, W, H) => { g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#0b4a63'], [0.34, '#2a93a0'], [0.6, '#a7dfb6'], [0.78, '#fff2bd'], [1, '#ffd98c']]); g.fillRect(0, 0, W, H); });

const pyramid = (g, x, base, w, col, lit, shade) => {
  const tiers = 9, th = 15;
  for (let i = 0; i < tiers; i++) { const ww = w * (1 - i * 0.094), y = base - (i + 1) * th; g.fillStyle = col; g.fillRect(x - ww / 2, y, ww, th + 1); g.fillStyle = lit; g.fillRect(x - ww / 2, y, ww * 0.62, 2.2); g.fillStyle = shade; g.fillRect(x + ww * 0.12, y + 2, ww * 0.38, th - 2); }
  g.fillStyle = shade; g.beginPath(); g.moveTo(x - 16, base); g.lineTo(x - 8, base - tiers * th); g.lineTo(x + 8, base - tiers * th); g.lineTo(x + 16, base); g.fill();
  const sw = w * 0.2, sy = base - tiers * th;
  g.fillStyle = col; g.fillRect(x - sw / 2, sy - 28, sw, 28); g.fillStyle = lit; g.fillRect(x - sw / 2 - 4, sy - 32, sw + 8, 5); g.fillStyle = shade; g.fillRect(x - 6, sy - 20, 12, 20);
};

const jHills = () => strip('j-hills', 1792, 360, 1, (g, W, H) => {
  const r = U.rng(9);
  ridge(g, W, H, 150, 90, 3, '#a8dcc8');
  pyramid(g, 420, 214, 340, '#8bc8b4', '#c6ecd2', '#74b4a2');
  pyramid(g, 1320, 236, 240, '#93cfba', '#ccefd6', '#7fbeab');
  ridge(g, W, H, 214, 64, 11, '#7fc3ae');
  for (let i = 0; i < 30; i++) foliage(g, r() * W, 232 + r() * 44, 44 + r() * 50, 30 + r() * 20, ramp16([[0, '#60ad9b'], [1, '#a9e0c6']]), r, 70, 1);
  // a far waterfall dropping out of the hills
  for (const x of [930, 1640]) { g.fillStyle = lin(g, x - 12, 0, x + 12, 0, [[0, 'rgba(235,250,245,0.3)'], [0.5, 'rgba(255,255,255,0.9)'], [1, 'rgba(235,250,245,0.3)']]); g.fillRect(x - 12, 108, 24, 172); }
}, haze('#fff0c4', 120, 0, 0.62));

const jFar = () => strip('j-far', 2048, 430, 1, (g, W, H) => {
  const r = U.rng(41);
  g.fillStyle = '#3f9384'; g.fillRect(0, 300, W, H - 300);
  for (let i = 0; i < 54; i++) { const x = r() * W, y = 196 + r() * 124, R = 48 + r() * 74; foliage(g, x, y, R, R * 0.82, FAR, r, 170, 1.05); }
}, haze('#d8f4d2', 90, 0, 0.62));

const jMid = () => strip('j-mid', 2304, 540, 1.1, (g, W, H) => {
  const r = U.rng(77), pal = { deep: '#0d3a33', dark: '#165146', mid: '#2a6e5a', light: '#57957a', groove: '#0a2a26', hi: '#a4d6b2', moss0: '#2f8058', moss1: '#4ea26a', moss2: '#256a4c' };
  for (let i = 0; i < 16; i++) {
    const x = (i + 0.2 + r() * 0.6) * (W / 16), w0 = 26 + r() * 40, top = -30;
    trunk(g, x, H - 62, top, w0, w0 * 0.72, (r() - 0.5) * 70, pal, r, 0.35, 2);
    for (let k = 0; k < 3; k++) vine(g, x + (r() - 0.5) * 90, 0, 150 + r() * 250, (r() - 0.5) * 34, '#1b5a4a', ['#2f8460', '#3f9a68'], r, 22, 0.9);
  }
  for (let i = 0; i < 24; i++) foliage(g, r() * W, 10 + r() * 90, 90 + r() * 110, 50 + r() * 50, MID, r, 240, 1.15);
  for (let i = 0; i < 40; i++) { const x = r() * W, R = 40 + r() * 54; foliage(g, x, H - 74 - r() * 30, R, R * 0.72, MID, r, 120, 1); }
  g.fillStyle = '#0f4a40'; g.fillRect(0, H - 64, W, 64);
}, haze('#c9edc4', 150, 0, 0.5));

/** Carved monolith, tilted and overgrown. */
const monolith = (g, x, base, w, h, tilt, r, kind) => {
  g.save(); g.translate(x, base); g.rotate(tilt);
  const top = -h, chip = (r() - 0.5) * 10;
  const path = () => { g.beginPath(); g.moveTo(-w / 2, 8); g.lineTo(-w * 0.46, top + 14); g.lineTo(-w * 0.2, top + chip); g.lineTo(w * 0.22, top + 3); g.lineTo(w * 0.47, top + 16); g.lineTo(w / 2, 8); g.closePath(); };
  path(); g.save(); g.clip(); texFill(g, stoneTex(), -w, top - 10, w * 2, h + 30);
  g.fillStyle = lin(g, -w / 2, 0, w / 2, 0, [[0, 'rgba(255,232,180,0.2)'], [0.5, 'rgba(70,60,40,0.1)'], [1, 'rgba(0,10,10,0.62)']]); g.fillRect(-w, top - 10, w * 2, h + 30);
  g.restore();
  g.save(); g.translate(-48 * (w / 130), top + h * 0.12); g.scale(w / 130, w / 130); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 7; g.save(); g.translate(1.5, 1.5); motifPath(g, kind); g.stroke(); g.restore();
  g.strokeStyle = '#c9b070'; g.lineWidth = 3.4; motifPath(g, kind); g.stroke(); g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-w * 0.42, top + h * (0.56 + k * 0.13)); g.lineTo(w * 0.42, top + h * (0.56 + k * 0.13)); g.stroke(); }
  for (let i = 0; i < 40; i++) dab(g, (r() - 0.6) * w, top + r() * r() * h * 0.7, 7 + r() * 10, 3 + r() * 3, r() * TAU, ['#4d8f34', '#6fae3f', '#37702a'][i % 3]);
  g.restore();
};
/** Broken stone arch swallowed by plants. */
const ruinArch = (g, x, base, w, h, r) => {
  const blk = (bx, by, bw, bh) => { g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip(); texFill(g, stoneTex(), bx, by, bw, bh); g.fillStyle = 'rgba(30,20,8,0.28)'; g.fillRect(bx, by, bw, bh); g.restore(); g.fillStyle = 'rgba(255,235,190,0.2)'; g.fillRect(bx, by, bw, 2); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(bx, by + bh - 2, bw, 2); g.fillRect(bx + bw - 2, by, 2, bh); };
  for (let y = 0; y < h * 0.72; y += 38) { blk(x - w / 2 - 28 + (y % 76 ? 4 : 0), base - y - 38, 62, 38); if (y < h * 0.46) blk(x + w / 2 - 34 + (y % 76 ? -4 : 0), base - y - 38, 62, 38); }
  for (let a = 0; a < 5; a++) { // voussoirs of the surviving half of the arch
    const t0 = Math.PI + (a / 8) * Math.PI, t1 = t0 + Math.PI / 8, cy = base - h * 0.72, R0 = w / 2 - 28, R1 = w / 2 + 28, c = x;
    g.beginPath(); g.arc(c, cy, R1, t0, t1); g.arc(c, cy, R0, t1, t0, true); g.closePath(); g.save(); g.clip(); texFill(g, stoneTex(), c - R1, cy - R1, R1 * 2, R1 * 2); g.fillStyle = 'rgba(30,20,8,0.2)'; g.fillRect(c - R1, cy - R1, R1 * 2, R1 * 2); g.restore(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2; g.stroke();
  }
  for (let i = 0; i < 90; i++) dab(g, x - w / 2 - 30 + r() * (w + 60), base - r() * h * 1.1, 8 + r() * 11, 3 + r() * 4, r() * TAU, ['#4d8f34', '#6fae3f', '#37702a', '#8ac34a'][i % 4]);
};

const jNear = () => strip('j-near', 2560, 540, 1.35, (g, W, H) => {
  const r = U.rng(123), base = H - 96;
  // one set-piece at a time: trunks with room between them so the depth behind shows through
  const xs = [150, 560, 830, 1290, 1640, 2080, 2430];
  ruinArch(g, 370, base + 8, 200, 330, r);
  monolith(g, 1060, base + 10, 110, 214, -0.1, r, 'eye');
  monolith(g, 1860, base + 10, 130, 262, 0.07, r, 'serpent');
  ruinArch(g, 2270, base + 8, 170, 280, r);
  xs.forEach((x, i) => {
    const w0 = 74 + r() * 74;
    trunk(g, x, base + 12, -40, w0, w0 * 0.66, (r() - 0.5) * 80, TW, r, 1, 5);
    // strangler vines wrapping the trunk
    g.strokeStyle = '#3a4a1e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); for (let y = base; y > 20; y -= 16) { const u = Math.sin(y * 0.03 + i) * w0 * 0.36; (y === base ? g.moveTo(x + u, y) : g.lineTo(x + u, y)); } g.stroke();
    for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (k - 1.5) * 0.9, y = 150 + r() * 170; bigLeaf(g, x + (k % 2 ? 1 : -1) * w0 * 0.42, y, 80 + r() * 60, 20 + r() * 12, a + (k % 2 ? 1.1 : -1.1), '#7ec850', '#3b9140', '#1a5a30'); }
  });
  for (let i = 0; i < 26; i++) { const x = r() * W; vine(g, x, -6, 170 + r() * 240, (r() - 0.5) * 50, '#27481c', ['#4f9a38', '#3a7f2e', '#6fb642'], r, 15, 1.1); }
  // undergrowth: broad leaves, ferns and bromeliads along the foot of the trees
  for (let i = 0; i < 44; i++) {
    const x = r() * W, R = 46 + r() * 64;
    foliage(g, x, base - 8 - r() * 40, R * 1.1, R * 0.62, NEAR, r, 130, 1.2);
  }
  for (let i = 0; i < 62; i++) {
    const x = r() * W, y = base + r() * 12, L = 70 + r() * 90, a = -Math.PI / 2 + (r() - 0.5) * 2.2;
    if (i % 2) bigLeaf(g, x, y, L, 18 + r() * 12, a, '#9ad858', '#3c9a44', '#14562e', (r() - 0.5) * 0.3); else fern(g, x, y, L, a, '#2a8040', '#55ae4a', r, 0.5, 1);
  }
  for (let i = 0; i < 34; i++) flower(g, r() * W, base - 12 - r() * 66, 5 + r() * 5, ['#ff5d8f', '#ff9a3c', '#ff4a4a', '#f7d14c', '#c77dff'][i % 5]);
  g.fillStyle = '#0a3a26'; g.fillRect(0, base + 8, W, H - base - 8);
}, (g, W, H) => {
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, 'rgba(0,30,26,0.5)'], [0.28, 'rgba(0,30,26,0)'], [0.7, 'rgba(0,30,26,0)'], [1, 'rgba(0,16,14,0.45)']]); g.fillRect(0, 0, W, H);
});

/** Leaves crowding the top of the frame, dark underneath. */
const jCanopy = () => strip('j-canopy', 1920, 190, 1.35, (g, W, H) => {
  const r = U.rng(301);
  for (let i = 0; i < 26; i++) foliage(g, r() * W, 26 + r() * 24, 110 + r() * 120, 44 + r() * 44, NEAR, r, 300, 1.2);
  for (let i = 0; i < 22; i++) { const x = r() * W, l = 40 + r() * 110; vine(g, x, 40, l, (r() - 0.5) * 20, '#1d3f18', ['#4f9a38', '#2f7a30'], r, 13, 1); if (i % 3 === 0) flower(g, x, 40 + l, 5.5, FLOWERS[i % 3]); }
}, (g, W, H) => { g.fillStyle = lin(g, 0, 0, 0, H, [[0, 'rgba(2,20,16,0.82)'], [0.7, 'rgba(2,20,16,0.12)'], [1, 'rgba(2,20,16,0)']]); g.fillRect(0, 0, W, H); });

const jGround = () => strip('j-ground', 1536, 150, 1.5, (g, W, H) => {
  const r = U.rng(5);
  texFill(g, earthTex(), 0, 0, W, H);
  g.fillStyle = lin(g, 0, 0, 0, 46, [[0, 'rgba(255,214,140,0.26)'], [1, 'rgba(255,214,140,0)']]); g.fillRect(0, 0, W, 46);
  for (let i = 0; i < 24; i++) { // half-buried paving from the old road
    const x = r() * W, y = 14 + r() * 60, rx = 34 + r() * 44, ry = 8 + r() * 7;
    g.save(); g.translate(x, y); g.fillStyle = 'rgba(0,0,0,0.42)'; g.beginPath(); g.ellipse(0, 3, rx + 2, ry + 2, 0, 0, TAU); g.fill();
    g.fillStyle = lin(g, 0, -ry, 0, ry, [[0, '#a3977a'], [1, '#5c5240']]); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-rx * 0.5, -ry * 0.2); g.lineTo(rx * 0.3, ry * 0.3); g.stroke(); g.restore();
  }
  for (let i = 0; i < 16; i++) { // roots crossing the path
    let x = r() * W, y = 2 + r() * 10; g.lineCap = 'round'; const w0 = 5 + r() * 6;
    for (let k = 0; k < 7; k++) { const nx = x + 16 + r() * 22, ny = y + 3 + r() * 10; g.strokeStyle = '#1e140b'; g.lineWidth = w0 * (1 - k * 0.1) + 2; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); g.strokeStyle = '#6e5235'; g.lineWidth = w0 * (1 - k * 0.1); g.beginPath(); g.moveTo(x, y - 0.8); g.lineTo(nx, ny - 0.8); g.stroke(); x = nx; y = ny; }
  }
  for (let i = 0; i < 150; i++) { const x = r() * W, y = r() * H * 0.86, L = 4 + r() * 6; dab(g, x, y, L, L * 0.42, r() * TAU, ['#7a5a2a', '#9a6e2c', '#5f6a2c', '#a4532a', '#3f5a28'][i % 5]); }
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; g.fillStyle = 'rgba(190,175,140,0.5)'; g.beginPath(); g.ellipse(x, y, 1.4 + r() * 2.6, 1 + r() * 1.5, 0, 0, TAU); g.fill(); }
}, (g, W, H) => { g.fillStyle = lin(g, 0, 20, 0, H, [[0, 'rgba(4,8,6,0)'], [1, 'rgba(4,8,6,0.72)']]); g.fillRect(0, 0, W, H); });

/** Grass, ferns and stones along the far edge of the path, behind the runner. */
const jEdge = () => strip('j-edge', 1536, 130, 1.5, (g, W, H) => {
  const r = U.rng(44), yb = H - 10;
  for (let i = 0; i < 26; i++) rock(g, r() * W, yb - 8, 18 + r() * 30, 12 + r() * 14, ['#2e2c22', '#615a44', '#9a9072'], r, 1);
  for (let i = 0; i < 52; i++) { const x = r() * W; fern(g, x, yb, 50 + r() * 54, -Math.PI / 2 + (r() - 0.5) * 2, '#2a8040', '#6abf52', r, 0.5, 1.05); }
  for (let i = 0; i < 180; i++) tuft(g, r() * W, yb + 4, 8, 34, ['#3f9a44', '#67ba4a', '#2a7a3c', '#9ad25a'], r);
  for (let i = 0; i < 16; i++) { const x = r() * W, y = yb - 4; g.fillStyle = '#efe3c2'; g.fillRect(x - 1.3, y - 8, 2.6, 9); g.fillStyle = ['#d8452c', '#e0a030', '#c0562c'][i % 3]; g.beginPath(); g.ellipse(x, y - 9, 6.2, 4, 0, Math.PI, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(x - 1.8, y - 11, 0.9, 0, TAU); g.fill(); }
  for (let i = 0; i < 26; i++) flower(g, r() * W, yb - 12 - r() * 34, 3.6 + r() * 3, FLOWERS[i % 3]);
});

const jRays = () => sprite('j-rays', 1400, 540, 0.5, (g, W, H) => {
  const r = U.rng(8); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const x = r() * W * 0.86, wd = 40 + r() * 120, reach = 130 + r() * 90, a = 0.08 + r() * 0.15;
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, 'rgba(255,240,180,' + a.toFixed(3) + ')'], [0.65, 'rgba(255,240,180,' + (a * 0.5).toFixed(3) + ')'], [1, 'rgba(255,240,180,0)']]);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + wd, 0); g.lineTo(x + wd * 1.6 + reach, H); g.lineTo(x + reach, H); g.closePath(); g.fill();
  }
});

/* drifting bands of mist, shared by every biome */
const fogImg = (key, tint) => strip('fog-' + key, 1400, 150, 0.5, (g, W, H) => {
  const r = U.rng(12), rgb = U.hex(tint).join(',');
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = H * (0.34 + r() * 0.34), R = 40 + r() * 60, a = 0.05 + r() * 0.1;
    g.save(); g.translate(x, y); g.scale(2, 0.5); g.fillStyle = rad(g, 0, 0, 0, R, [[0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'], [1, 'rgba(' + rgb + ',0)']]); g.fillRect(-R, -R, R * 2, R * 2); g.restore();
  }
});

/** Big soft shapes passing close to the camera. Painted at low resolution, which is what blurs them. */
const fgLeaves = (v) => sprite('fg-leaves-' + v, 520, 420, 0.42, (g, W, H) => {
  const r = U.rng(600 + v * 7);
  for (let i = 0; i < 9; i++) {
    const x = W * 0.5 + (r() - 0.5) * 220, L = 190 + r() * 150, a = -Math.PI / 2 + (r() - 0.5) * 1.5;
    if (v % 2) bigLeaf(g, x, H, L, 40 + r() * 26, a, '#0f4a2c', '#0a3421', '#051d14', (r() - 0.5) * 0.3); else fern(g, x, H, L * 1.1, a, '#0a3421', '#10502f', r, 0.6, 1.3);
  }
});

const JUNGLE = {
  id: 'jungle', tint: '#b89a58', rim: '#ffe9a8', shade: 'rgba(6,30,28,0.38)', dust: '#b49a70', leaves: true, dark: 0,
  warm() { return [jSky, jHills, jFar, jMid, jNear, jCanopy, jGround, jEdge, jRays, () => fogImg('j', '#e4f6dc'), () => fgLeaves(0), () => fgLeaves(1), () => fgLeaves(2)]; },
  back(ctx, L, wx, T, S) {
    const { w, h, ext, k, floorY } = L, top = -ext - 60;
    ctx.drawImage(jSky(), -60, top, w + 120, h - top + 80);
    // the sun, high behind the canopy
    const sx = w * 0.7 - wx * 0.004, sy = 92;
    glow(ctx, sx, sy, 420, '#fff2c4', 0.55); glow(ctx, sx, sy, 150, '#fffdf0', 0.9);
    const yk = (hh, b) => floorY + b * k - hh * k;
    drawStrip(ctx, jHills(), wx * 0.05 + T * 1.2, yk(360, 20), w, k);
    drawStrip(ctx, jFar(), wx * 0.11, yk(430, 40), w, k);
    ctx.globalAlpha = 0.85; drawStrip(ctx, fogImg('j', '#e4f6dc'), wx * 0.14 + T * 8, yk(150, 74), w, k * 1.15); ctx.globalAlpha = 1;
    drawStrip(ctx, jMid(), wx * 0.26, yk(540, 66), w, k);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.7 + Math.sin(T * 0.5) * 0.12) * L.lightK;
    drawStrip(ctx, jRays(), wx * 0.32 - T * 5, top, w, Math.max(k, (h - top) / 540)); ctx.restore();
    drawStrip(ctx, jNear(), wx * 0.56, yk(540, 96), w, k);
    ctx.globalAlpha = 0.7; drawStrip(ctx, fogImg('j', '#e4f6dc'), wx * 0.62 - T * 10, floorY - 112, w, 1); ctx.globalAlpha = 1;
    drawStrip(ctx, jGround(), wx, floorY - 6, w, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * L.lightK; // sun patches slide along the path
    for (let i = 0; i < 6; i++) { const x = U.wrap(i * 330 - wx * 0.98, w + 300) - 150; ctx.drawImage(glowImg('#ffe6a8'), x - 150, floorY + 8, 300, 34); }
    ctx.restore();
    drawStrip(ctx, jEdge(), wx, floorY - 122, w, 1);
  },
  front(ctx, L, wx, T, S) {
    const { w, h, ext } = L;
    drawStrip(ctx, jCanopy(), wx * 0.92, -ext - 16, w, 1);
    const fp = wx * 1.7;
    for (let i = Math.floor((fp - 400) / 900); i <= Math.floor((fp + w + 400) / 900); i++) {
      const rnd = U.hash(i, 3, 7), x = i * 900 - fp + U.hash(i, 4, 7) * 300;
      if (rnd < 0.9) { const s = 0.42 + rnd * 0.2, sw = Math.sin(T * 0.8 + i) * 0.03; ctx.save(); ctx.translate(x, h + 34); ctx.rotate(sw); put(ctx, fgLeaves(U.wrap(i, 3)), -260 * s, -420 * s, s); ctx.restore(); }
    }
  },
};

/* ---------- SERPENT HALL ---------- */
const sBack = () => sprite('s-back', 8, 540, 1, (g, W, H) => { g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#02090e'], [0.5, '#06262a'], [0.82, '#0b4340'], [1, '#062a2c']]); g.fillRect(0, 0, W, H); });
const CRYST = ['#7dffc8', '#32d39a', '#0f9a78', '#066050'];
const crystal = (g, x, y, h, w, a, r) => {
  g.save(); g.translate(x, y); g.rotate(a);
  const pts = [[-w / 2, 0], [-w * 0.42, -h * 0.72], [0, -h], [w * 0.42, -h * 0.74], [w / 2, 0]];
  g.fillStyle = lin(g, -w / 2, 0, w / 2, 0, [[0, CRYST[0]], [0.45, CRYST[1]], [1, CRYST[3]]]);
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
  g.fillStyle = 'rgba(235,255,245,0.55)'; g.beginPath(); g.moveTo(-w * 0.24, -h * 0.1); g.lineTo(-w * 0.24, -h * 0.72); g.lineTo(0, -h); g.lineTo(-w * 0.05, -h * 0.2); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,40,30,0.3)'; g.beginPath(); g.moveTo(w * 0.1, 0); g.lineTo(w * 0.14, -h * 0.76); g.lineTo(w * 0.42, -h * 0.74); g.lineTo(w / 2, 0); g.closePath(); g.fill();
  g.restore();
};
const crystals = (g, x, y, s, r) => { for (let i = 0; i < 7; i++) crystal(g, x + (r() - 0.5) * 46 * s, y + 4, (34 + r() * 66) * s, (10 + r() * 14) * s, (r() - 0.5) * 0.9, r); };
const stalactites = (g, W, base, n, len, wd, cols, r) => {
  for (let i = 0; i < n; i++) {
    const x = r() * W, L = len * (0.3 + r() * r() * 1.2), w = wd * (0.5 + r() * 0.9);
    g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, [[0, cols[1]], [0.4, cols[2]], [1, cols[0]]]);
    g.beginPath(); g.moveTo(x - w / 2, base - 4); g.quadraticCurveTo(x - w * 0.1, base + L * 0.6, x + (r() - 0.5) * 6, base + L); g.quadraticCurveTo(x + w * 0.16, base + L * 0.55, x + w / 2, base - 4); g.closePath(); g.fill();
  }
};
const stalagmites = (g, W, base, n, len, wd, cols, r) => {
  for (let i = 0; i < n; i++) {
    const x = r() * W, L = len * (0.3 + r() * r() * 1.2), w = wd * (0.5 + r() * 0.9);
    g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, [[0, cols[2]], [0.45, cols[1]], [1, cols[0]]]);
    g.beginPath(); g.moveTo(x - w / 2, base + 4); g.quadraticCurveTo(x - w * 0.12, base - L * 0.55, x + (r() - 0.5) * 8, base - L); g.quadraticCurveTo(x + w * 0.14, base - L * 0.5, x + w / 2, base + 4); g.closePath(); g.fill();
  }
};
const sFar = () => strip('s-far', 2048, 540, 1, (g, W, H) => {
  const r = U.rng(21);
  for (let i = 0; i < 10; i++) { const x = r() * W; g.fillStyle = rad(g, x, 300, 0, 260, [[0, 'rgba(70,240,190,0.2)'], [1, 'rgba(70,240,190,0)']]); g.fillRect(x - 260, 40, 520, 500); }
  const pal = ['#04181c', '#0a3036', '#124a4c'];
  for (let i = 0; i < 12; i++) { // stone columns joining floor to roof
    const x = (i + r() * 0.8) * (W / 12), w = 70 + r() * 80;
    g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, [[0, pal[2]], [0.5, pal[1]], [1, pal[0]]]);
    g.beginPath(); g.moveTo(x - w * 0.8, H); g.bezierCurveTo(x - w * 0.3, H * 0.65, x - w * 0.34, H * 0.34, x - w * 0.86, 0); g.lineTo(x + w * 0.86, 0); g.bezierCurveTo(x + w * 0.34, H * 0.34, x + w * 0.3, H * 0.65, x + w * 0.8, H); g.closePath(); g.fill();
  }
  stalactites(g, W, 40, 40, 160, 70, pal, r); stalagmites(g, W, H - 40, 34, 130, 70, pal, r);
  g.fillStyle = pal[0]; g.fillRect(0, 0, W, 44); g.fillRect(0, H - 44, W, 44);
  for (let i = 0; i < 14; i++) crystals(g, r() * W, H - 44, 0.8 + r() * 0.5, r);
}, haze('#0d6a60', 80, 0.12, 0.36));

/** The colossal stone serpent that coils through the whole hall: one continuous, tileable body. */
const sSerpent = () => strip('s-serpent', 2560, 540, 1.1, (g, W, H) => {
  const r = U.rng(99);
  const yAt = (x) => 300 + Math.sin((x / W) * TAU * 3) * 104 + Math.sin((x / W) * TAU * 7 + 1) * 26;
  const Rb = (x) => 50 + Math.sin((x / W) * TAU * 5) * 8;
  for (let x = 0; x < W; x += 9) {
    const y = yAt(x), R = Rb(x), a = Math.atan2(yAt(x + 4) - yAt(x - 4), 8);
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = lin(g, 0, -R, 0, R, [[0, '#3b8f7a'], [0.32, '#1d6a5a'], [0.72, '#0c3d3a'], [1, '#04191c']]); g.fillRect(-6, -R, 14, R * 2);
    const row = Math.round(x / 9);
    for (let i = -3; i <= 3; i++) { // scale rows
      const sy = (i + (row % 2) * 0.5) * (R * 0.3); g.strokeStyle = 'rgba(2,20,20,0.55)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, sy, R * 0.15, -1.2, 1.2); g.stroke();
      if (i < -1) { g.strokeStyle = 'rgba(180,255,220,0.2)'; g.lineWidth = 1; g.beginPath(); g.arc(-1, sy, R * 0.13, -1.1, 0.6); g.stroke(); }
    }
    if (row % 18 === 0) { g.fillStyle = 'rgba(214,176,84,0.85)'; g.fillRect(-2.5, -R, 5, R * 2); }
    g.restore();
  }
  for (let i = 0; i < 9; i++) { // carved pillars the serpent winds around
    const x = (i + 0.5) * (W / 9), w = 62;
    g.save(); g.beginPath(); g.rect(x - w / 2, 0, w, H); g.clip(); texFill(g, slateTex(), x - w / 2, 0, w, H);
    g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, [[0, 'rgba(120,255,210,0.24)'], [0.5, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.6)']]); g.fillRect(x - w / 2, 0, w, H); g.restore();
    for (let y = 60; y < H; y += 110) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - w / 2, y, w, 3); g.fillStyle = 'rgba(214,176,84,0.55)'; g.fillRect(x - w / 2, y + 4, w, 2); }
  }
  for (let i = 0; i < 16; i++) crystals(g, r() * W, H - 70, 0.9 + r() * 0.8, r);
  g.fillStyle = '#031014'; g.fillRect(0, H - 72, W, 72);
}, haze('#072a2c', 0, 0.38, 0.5));

const sNear = () => strip('s-near', 2304, 540, 1.3, (g, W, H) => {
  const r = U.rng(66), pal = ['#020a0e', '#071e24', '#123c3e'], base = H - 100;
  // rock shelves crowding the hall from above and below, leaving a tall gap in the middle
  for (let i = 0; i < 44; i++) { const x = r() * W; rock(g, x, 16 + r() * 34, 90 + r() * 110, 40 + r() * 34, pal, r, 0, 0.35); }
  stalactites(g, W, 60, 46, 150, 48, pal, r);
  for (let i = 0; i < 36; i++) { const x = r() * W; rock(g, x, base + 22, 60 + r() * 90, 34 + r() * 40, pal, r, 0.5); }
  stalagmites(g, W, base + 4, 26, 110, 42, pal, r);
  for (let i = 0; i < 16; i++) crystals(g, r() * W, base + 2, 0.8 + r() * 0.9, r);
  for (let i = 0; i < 26; i++) { // glowing cave mushrooms
    const x = r() * W, y = base + 4 - r() * 10, s = 0.7 + r() * 1.1;
    g.fillStyle = '#b8fff0'; g.fillRect(x - 1.6 * s, y - 16 * s, 3.2 * s, 16 * s);
    g.fillStyle = lin(g, 0, y - 26 * s, 0, y - 14 * s, [[0, '#9dffe0'], [1, '#1dbf9a']]); g.beginPath(); g.ellipse(x, y - 16 * s, 12 * s, 8 * s, 0, Math.PI, TAU); g.fill();
  }
  for (let i = 0; i < 22; i++) vine(g, r() * W, 40 + r() * 30, 80 + r() * 170, (r() - 0.5) * 24, '#0b3a30', ['#14604a', '#1e7a5c'], r, 18, 0.9);
});

const sGround = () => strip('s-ground', 1536, 150, 1.5, (g, W, H) => {
  const r = U.rng(11);
  texFill(g, slateTex(), 0, 0, W, H);
  g.fillStyle = 'rgba(0,14,18,0.35)'; g.fillRect(0, 0, W, H);
  for (let y = 0, row = 0; y < H; y += 42, row++) for (let x = -96 + (row % 2) * 72; x < W + 96; x += 144) { // wet flagstones
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.strokeRect(x, y, 144, 42);
    g.strokeStyle = 'rgba(95,255,200,0.1)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + 141, y + 3); g.stroke();
    if (r() < 0.35) { g.fillStyle = 'rgba(120,255,215,0.05)'; g.fillRect(x + 3, y + 3, 138, 36); }
  }
  for (let i = 0; i < 16; i++) { const x = r() * W, y = 8 + r() * 100, rx = 40 + r() * 80; g.fillStyle = 'rgba(70,230,190,0.13)'; g.beginPath(); g.ellipse(x, y, rx, 5 + r() * 6, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(210,255,240,0.14)'; g.beginPath(); g.ellipse(x - rx * 0.2, y - 1, rx * 0.5, 1.6, 0, 0, TAU); g.fill(); }
}, (g, W, H) => { g.fillStyle = lin(g, 0, 10, 0, H, [[0, 'rgba(0,6,8,0)'], [1, 'rgba(0,6,8,0.75)']]); g.fillRect(0, 0, W, H); });
const sEdge = () => strip('s-edge', 1536, 130, 1.5, (g, W, H) => {
  const r = U.rng(29), yb = H - 8, pal = ['#04141a', '#0e3036', '#1f5a58'];
  for (let i = 0; i < 40; i++) rock(g, r() * W, yb - 8, 16 + r() * 34, 10 + r() * 18, pal, r, 0.4);
  for (let i = 0; i < 18; i++) crystals(g, r() * W, yb, 0.42 + r() * 0.4, r);
  for (let i = 0; i < 26; i++) fern(g, r() * W, yb, 40 + r() * 40, -Math.PI / 2 + (r() - 0.5) * 1.8, '#0f5a48', '#1e8a6a', r, 0.5, 1);
});
const fgRock = (v) => sprite('fg-rock-' + v, 620, 300, 0.42, (g, W, H) => { const r = U.rng(800 + v); for (let i = 0; i < 9; i++) rock(g, 60 + r() * 500, H - 40 - r() * 120, 90 + r() * 110, 60 + r() * 70, ['#010405', '#040c0f', '#071418'], r, 0, 0); });
const fgCeil = (v) => sprite('fg-ceil-' + v, 620, 300, 0.42, (g, W, H) => { const r = U.rng(860 + v), pal = ['#010405', '#040c0f', '#071418']; g.fillStyle = pal[0]; g.fillRect(0, 0, W, 70); stalactites(g, W, 60, 18, 210, 90, pal, r); });

/* lights that repeat with a layer: [parallax, period, x, y, radius, colour] */
const SERP_LIGHTS = [[0.56, 640, 70, 390, 150, '#38f0b4'], [0.56, 640, 330, 372, 110, '#7dffc8'], [0.3, 1100, 300, 300, 240, '#1fc49a']];

const SERPENT = {
  id: 'serpent', tint: '#3fbf95', rim: '#a8ffdc', shade: 'rgba(0,30,40,0.5)', dust: '#6f9d90', dark: 0.72, darkCol: '2,12,16',
  warm() { return [sBack, sFar, sSerpent, sNear, sGround, sEdge, () => fogImg('s', '#7ae8c4'), () => fgRock(0), () => fgRock(1), () => fgCeil(0), () => fgCeil(1)]; },
  back(ctx, L, wx, T, S) {
    const { w, h, ext, k, floorY } = L, top = -ext - 60, yk = (hh, b) => floorY + b * k - hh * k;
    ctx.drawImage(sBack(), -60, top, w + 120, h - top + 80);
    drawStrip(ctx, sFar(), wx * 0.1, yk(540, 44), w, k);
    ctx.globalAlpha = 0.9; drawStrip(ctx, fogImg('s', '#7ae8c4'), wx * 0.16 + T * 6, yk(150, 86), w, k * 1.2); ctx.globalAlpha = 1;
    drawStrip(ctx, sSerpent(), wx * 0.3, yk(540, 72), w, k);
    drawStrip(ctx, sNear(), wx * 0.56, yk(540, 100), w, k);
    for (const [px, per, ox, oy, R, col] of SERP_LIGHTS) for (let x = -U.wrap(wx * px - ox, per); x < w + 200; x += per) glow(ctx, x, oy, R, col, 0.2 + 0.06 * Math.sin(T * 1.6 + x * 0.01));
    drawStrip(ctx, sGround(), wx, floorY - 6, w, 1);
    drawStrip(ctx, sEdge(), wx, floorY - 122, w, 1);
    ctx.globalAlpha = 0.65; drawStrip(ctx, fogImg('s', '#7ae8c4'), wx * 0.8 - T * 14, floorY - 96, w, 1); ctx.globalAlpha = 1;
  },
  front(ctx, L, wx, T, S) {
    const { w, h, ext } = L, fp = wx * 1.6;
    for (let i = Math.floor((fp - 400) / 760); i <= Math.floor((fp + w + 400) / 760); i++) {
      const x = i * 760 - fp + U.hash(i, 8, 3) * 240, v = U.hash(i, 9, 3);
      if (v > 0.22) ctx.drawImage(fgRock(i & 1), x - 310, h - 104, 620, 300);
      if (U.hash(i, 10, 3) > 0.3) ctx.drawImage(fgCeil(i & 1), x, -ext - 26, 620, 300);
    }
  },
};

/* ---------- SUN GATE ---------- */
const rBack = () => sprite('r-back', 8, 540, 1, (g, W, H) => { g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#1c0a06'], [0.45, '#4a1d0c'], [0.74, '#a84a12'], [1, '#ff9a2e']]); g.fillRect(0, 0, W, H); });
const SUNPAL = ['#2a1206', '#6a3a14', '#c98a34', '#ffd77e'];
/** Great disc of carved rays and a calm stone face. */
const sunDisc = (g, x, y, R, shade = 1) => {
  g.save(); g.translate(x, y);
  for (let i = 0; i < 24; i++) { g.save(); g.rotate((i / 24) * TAU); g.beginPath(); g.moveTo(-R * 0.13, -R * 0.82); g.lineTo(0, -R * (i % 2 ? 1.28 : 1.5)); g.lineTo(R * 0.13, -R * 0.82); g.closePath(); g.fillStyle = lin(g, 0, -R * 1.4, 0, -R * 0.8, [[0, SUNPAL[3]], [1, SUNPAL[1]]]); g.fill(); g.restore(); }
  g.beginPath(); g.arc(0, 0, R * 0.92, 0, TAU); g.fillStyle = rad(g, -R * 0.3, -R * 0.3, R * 0.1, R, [[0, '#ffe9a8'], [0.5, '#e0a13c'], [1, '#6a3a12']]); g.fill();
  g.strokeStyle = 'rgba(60,30,6,0.7)'; g.lineWidth = R * 0.05; g.beginPath(); g.arc(0, 0, R * 0.74, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(60,30,6,0.8)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * R * 0.28, -R * 0.12, R * 0.13, R * 0.06, 0, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(60,30,6,0.8)'; g.lineWidth = R * 0.05; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -R * 0.1); g.lineTo(-R * 0.05, R * 0.14); g.lineTo(R * 0.05, R * 0.14); g.moveTo(-R * 0.22, R * 0.34); g.quadraticCurveTo(0, R * 0.46, R * 0.22, R * 0.34); g.stroke();
  g.restore();
};
const rFar = () => strip('r-far', 2048, 540, 1, (g, W, H) => {
  const r = U.rng(31);
  for (let i = 0; i < 3; i++) { const x = (i + 0.5) * (W / 3); g.fillStyle = rad(g, x, 210, 0, 420, [[0, 'rgba(255,190,90,0.5)'], [1, 'rgba(255,190,90,0)']]); g.fillRect(x - 420, 0, 840, H); sunDisc(g, x, 212, 92); }
  const pal = ['#2a0f06', '#4f230e', '#7a3f18'];
  for (let i = 0; i < 16; i++) { const x = (i + 0.5) * (W / 16), wd = 54; g.fillStyle = lin(g, x - wd / 2, 0, x + wd / 2, 0, [[0, pal[2]], [0.5, pal[1]], [1, pal[0]]]); g.fillRect(x - wd / 2, 0, wd, H); g.fillStyle = pal[2]; g.fillRect(x - wd / 2 - 8, 56, wd + 16, 14); g.fillRect(x - wd / 2 - 8, H - 90, wd + 16, 14); }
  g.fillStyle = pal[0]; g.fillRect(0, 0, W, 60); g.fillRect(0, H - 60, W, 60);
  g.fillStyle = 'rgba(230,160,60,0.5)'; g.fillRect(0, 60, W, 3);
}, haze('#ff8a24', 90, 0.1, 0.42));

/** Stepped-gold wall of statues and reliefs. */
const rMid = () => strip('r-mid', 2304, 540, 1.1, (g, W, H) => {
  const r = U.rng(51), base = H - 78;
  g.save(); g.beginPath(); g.rect(0, 80, W, base - 80); g.clip(); texFill(g, sandTex(), 0, 80, W, base - 80); g.fillStyle = 'rgba(70,28,8,0.38)'; g.fillRect(0, 80, W, base - 80); g.restore();
  for (let y = 80; y < base; y += 50) { g.fillStyle = 'rgba(0,0,0,0.26)'; g.fillRect(0, y, W, 2); for (let x = (y % 100 ? 0 : 60); x < W; x += 120) g.fillRect(x, y, 2, 50); }
  for (let i = 0; i < 6; i++) { // arched niches holding a sun mask, opening onto fire
    const x = (i + 0.5) * (W / 6), aw = 170, atop = 130, ab = base;
    g.beginPath(); g.moveTo(x - aw / 2, ab); g.lineTo(x - aw / 2, atop + aw / 2); g.arc(x, atop + aw / 2, aw / 2, Math.PI, TAU); g.lineTo(x + aw / 2, ab); g.closePath();
    g.fillStyle = lin(g, 0, atop, 0, ab, [[0, '#2a0f06'], [0.6, '#7a2a0a'], [1, '#ffac3c']]); g.fill();
    g.strokeStyle = '#e0b04a'; g.lineWidth = 5; g.stroke(); g.strokeStyle = 'rgba(60,30,6,0.8)'; g.lineWidth = 1.5; g.stroke();
    sunDisc(g, x, atop + aw * 0.54, 44);
  }
  for (let i = 0; i < 6; i++) { // gold-capped piers between the niches
    const x = i * (W / 6), wd = 74;
    g.fillStyle = lin(g, x - wd / 2, 0, x + wd / 2, 0, [[0, '#d8a24a'], [0.45, '#8a5420'], [1, '#2e1408']]); g.fillRect(x - wd / 2, 60, wd, base - 60);
    g.fillStyle = lin(g, 0, 60, 0, 96, [[0, '#ffe08a'], [1, '#a06a18']]); g.fillRect(x - wd / 2 - 10, 60, wd + 20, 26);
  }
  g.fillStyle = '#1e0a04'; g.fillRect(0, base, W, H - base); g.fillStyle = '#1e0a04'; g.fillRect(0, 0, W, 64);
  g.fillStyle = '#e0b04a'; g.fillRect(0, 62, W, 3); g.fillRect(0, base - 4, W, 3);
}, haze('#3a1406', 0, 0.3, 0.32));

const rNear = () => strip('r-near', 2304, 540, 1.3, (g, W, H) => {
  const r = U.rng(71), base = H - 100;
  for (let i = 0; i < 5; i++) { // massive columns near the camera
    const x = (i + 0.4 + r() * 0.2) * (W / 5), wd = 110;
    g.save(); g.beginPath(); g.rect(x - wd / 2, 0, wd, base + 20); g.clip(); texFill(g, sandTex(), x - wd / 2, 0, wd, base + 20);
    g.fillStyle = lin(g, x - wd / 2, 0, x + wd / 2, 0, [[0, 'rgba(255,200,110,0.36)'], [0.35, 'rgba(0,0,0,0.05)'], [1, 'rgba(10,2,0,0.82)']]); g.fillRect(x - wd / 2, 0, wd, base + 20);
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x - wd / 2 + 9 + k * 17, 0, 4, base + 20); g.fillStyle = 'rgba(255,230,170,0.1)'; g.fillRect(x - wd / 2 + 13 + k * 17, 0, 2, base + 20); }
    g.restore();
    for (const y of [0, 96, base - 40]) { g.fillStyle = lin(g, 0, y, 0, y + 26, [[0, '#ffe08a'], [0.5, '#c98a2c'], [1, '#5a2e0c']]); g.fillRect(x - wd / 2 - 12, y, wd + 24, 22); }
  }
  for (let i = 0; i < 12; i++) rock(g, r() * W, base + 18, 40 + r() * 70, 18 + r() * 24, ['#1e0a04', '#55260e', '#a06a2c'], r, 0);
  for (let i = 0; i < 12; i++) { const x = r() * W, y = base + 6; // gold heaps along the wall
    for (let k = 0; k < 42; k++) { const cx = x + (r() - 0.5) * 80, cy = y - r() * r() * 28 + Math.abs(cx - x) * 0.3 - 8; g.fillStyle = rad(g, cx - 1.5, cy - 1.5, 0, 6, [[0, '#fff6c8'], [0.4, '#ffd24d'], [1, '#8a5a0e']]); g.beginPath(); g.ellipse(cx, cy, 5.5, 3.6, r(), 0, TAU); g.fill(); } }
});

const rGround = () => strip('r-ground', 1536, 150, 1.5, (g, W, H) => {
  const r = U.rng(23);
  texFill(g, sandTex(), 0, 0, W, H); g.fillStyle = 'rgba(40,14,4,0.45)'; g.fillRect(0, 0, W, H);
  for (let y = 0, row = 0; y < H; y += 44, row++) for (let x = -64 + (row % 2) * 96; x < W + 96; x += 192) {
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3; g.strokeRect(x, y, 192, 44);
    g.strokeStyle = 'rgba(255,220,150,0.16)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + 189, y + 3); g.stroke();
  }
  g.fillStyle = 'rgba(232,184,74,0.75)'; g.fillRect(0, 43, W, 2.4);
  g.strokeStyle = 'rgba(232,184,74,0.65)'; g.lineWidth = 2; g.beginPath();
  for (let x = 0; x < W; x += 48) { g.moveTo(x, 20); g.lineTo(x + 34, 20); g.lineTo(x + 34, 8); g.lineTo(x + 10, 8); g.lineTo(x + 10, 15); g.lineTo(x + 24, 15); }
  g.stroke();
}, (g, W, H) => { g.fillStyle = lin(g, 0, 10, 0, H, [[0, 'rgba(10,3,0,0)'], [1, 'rgba(10,3,0,0.72)']]); g.fillRect(0, 0, W, H); });
/** Molten channels: drawn additively over the floor so they can pulse. */
const rLava = () => strip('r-lava', 1536, 150, 1, (g, W, H) => {
  const r = U.rng(37); g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 14; i++) {
    let x = r() * W, y = 56 + r() * 90; const pts = [[x, y]];
    for (let k = 0; k < 10; k++) { x += 18 + r() * 30; y += (r() - 0.5) * 14; pts.push([x, y]); }
    for (const [col, lw] of [['rgba(255,70,10,0.5)', 12], ['rgba(255,130,20,0.85)', 5], ['rgba(255,235,150,1)', 1.8]]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
  }
});
const rEdge = () => strip('r-edge', 1536, 130, 1.5, (g, W, H) => {
  const r = U.rng(47), yb = H - 8;
  for (let i = 0; i < 26; i++) rock(g, r() * W, yb - 6, 16 + r() * 30, 9 + r() * 15, ['#2a1206', '#6a3a14', '#c98a34'], r, 0);
  for (let i = 0; i < 12; i++) { const x = r() * W; for (let k = 0; k < 16; k++) { const cx = x + (r() - 0.5) * 44, cy = yb - r() * 14; g.fillStyle = rad(g, cx - 1, cy - 1, 0, 5, [[0, '#fff6c8'], [0.4, '#ffd24d'], [1, '#8a5a0e']]); g.beginPath(); g.ellipse(cx, cy, 4.4, 2.8, r(), 0, TAU); g.fill(); } }
});
const SUN_BRAZIERS = { per: 620, oy: 372 };

const SUN = {
  id: 'sun', tint: '#ffb84d', rim: '#ffd9a0', shade: 'rgba(70,16,0,0.42)', dust: '#c79a60', dark: 0.42, darkCol: '24,6,2',
  warm() { return [rBack, rFar, rMid, rNear, rGround, rLava, rEdge, () => fogImg('r', '#ffb070'), () => fgRock(0)]; },
  back(ctx, L, wx, T, S) {
    const { w, h, ext, k, floorY } = L, top = -ext - 60, yk = (hh, b) => floorY + b * k - hh * k;
    ctx.drawImage(rBack(), -60, top, w + 120, h - top + 80);
    drawStrip(ctx, rFar(), wx * 0.1, yk(540, 60), w, k);
    ctx.globalAlpha = 0.8; drawStrip(ctx, fogImg('r', '#ffb070'), wx * 0.16 + T * 10, yk(150, 92), w, k * 1.2); ctx.globalAlpha = 1;
    drawStrip(ctx, rMid(), wx * 0.3, yk(540, 78), w, k);
    drawStrip(ctx, rNear(), wx * 0.56, yk(540, 100), w, k);
    for (let x = -U.wrap(wx * 0.56 - 200, SUN_BRAZIERS.per); x < w + 200; x += SUN_BRAZIERS.per) { // braziers on the columns
      const f = 0.9 + 0.1 * Math.sin(T * 13 + x); glow(ctx, x, SUN_BRAZIERS.oy - 24, 190 * f, '#ff9a3c', 0.34);
      ctx.fillStyle = '#2a1206'; ctx.beginPath(); ctx.moveTo(x - 26, SUN_BRAZIERS.oy - 8); ctx.lineTo(x + 26, SUN_BRAZIERS.oy - 8); ctx.lineTo(x + 12, SUN_BRAZIERS.oy + 18); ctx.lineTo(x - 12, SUN_BRAZIERS.oy + 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd24d'; ctx.fillRect(x - 27, SUN_BRAZIERS.oy - 10, 54, 3); ctx.fillStyle = '#2a1206'; ctx.fillRect(x - 3, SUN_BRAZIERS.oy + 18, 6, 44);
      fire(ctx, x, SUN_BRAZIERS.oy - 8, 19, 62, T, x * 0.01, '#ffb43a', '#ff4a12');
    }
    drawStrip(ctx, rGround(), wx, floorY - 6, w, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.68 + 0.26 * Math.sin(T * 2.3); drawStrip(ctx, rLava(), wx, floorY - 6, w, 1); ctx.restore();
    drawStrip(ctx, rEdge(), wx, floorY - 122, w, 1);
    ctx.globalAlpha = 0.5; drawStrip(ctx, fogImg('r', '#ffb070'), wx * 0.8 - T * 22, floorY - 90, w, 1); ctx.globalAlpha = 1;
  },
  front(ctx, L, wx, T, S) {
    const { w, h, ext } = L, fp = wx * 1.6;
    for (let i = Math.floor((fp - 400) / 980); i <= Math.floor((fp + w + 400) / 980); i++) {
      const x = i * 980 - fp + U.hash(i, 8, 5) * 300, v = U.hash(i, 9, 5);
      if (v > 0.2) ctx.drawImage(fgRock(i & 1), x - 310, h - 96, 620, 300);
    }
  },
};

export const BIOMES = { jungle: JUNGLE, serpent: SERPENT, sun: SUN };
export { fgRock };
