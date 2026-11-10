/* Round controller: one instance per open game.
   The GameEngineAPI runs the rounds. It draws each crash point (provably fair RNG), runs the clock,
   takes the bets, pays cash-outs and keeps the wallet. This class only follows it over SignalR,
   turns its state into a snapshot for React, and draws the scene every frame.
   Picking a route and the other players on screen are only for show: the API has one crash point per round. */
import { CG } from '../engine/core.js';
import type { Phase, RouteKey, Scene, SceneState } from '../engine/core.js';
import { LiveCrashClient, type LiveRound, type LiveSnapshot, type MyBet as ServerBet } from '../api/liveCrash';
import { r2, type Wallet } from './wallet';

export const BET_TIME = 6;
export const VH = 540;
/** Narrower than this and the camera pulls back, showing more temple above instead of cropping the sides. */
const MIN_VW = 560;

export const x2 = (m: number) => m.toFixed(2) + '×';
export const money = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type SlotStatus = 'none' | 'placed' | 'active' | 'cashed' | 'lost';
export interface Slot { status: SlotStatus; amount: number; at?: number; pay?: number; queued: boolean; busy?: boolean; }
export interface SlotSettings { bet: number; autoOn: boolean; autoAt: number; autoBet: boolean; }
export interface Bot { name: string; bet: number; target: number; route: RouteKey; status: 'in' | 'cashed' | 'lost'; at: number; when?: number; }
export interface TopWin { name: string; bet: number; at: number; win: number; round: number; you: boolean; }
export interface HistoryEntry { v: number; dot: string | null; detail: string; }
export interface MyBet { id: number; game: string; round: number; slot: number; amount: number; at: number | null; pay: number; result: number; time: number; }
export type Conn = 'connecting' | 'online' | 'reconnecting' | 'offline';
export interface Fairness { roundId: number; nonce: number; hash: string; prevSeed: string | null; prevHash: string | null; }

export type GameEvent =
  | { type: 'tick'; last: boolean }
  | { type: 'bet'; slot: number }
  | { type: 'launch' }
  | { type: 'cashout'; slot: number; at: number; pay: number }
  | { type: 'crash'; m: number }
  | { type: 'milestone'; m: number }
  | { type: 'autostop'; slot: number };

export interface Snapshot {
  phase: Phase;
  m: number;
  countdown: number;
  betTime: number;
  route: RouteKey;
  routeLocked: boolean;
  forkPassed: boolean;
  slots: [Slot, Slot];
  bots: Bot[];
  history: HistoryEntry[];
  round: { nonce: number; hash: string | null };
  fair: Fairness | null;
  myBets: MyBet[];
  topWins: TopWin[];
  hud: { label: string; mult: string; sub: string };
  players: number;
  wagered: number;
  conn: Conn;
  connMsg: string;
  minBet: number;
  maxBet: number;
}

const NAMES = ['Thabo', 'Lerato', 'Sipho', 'Naledi', 'Mpho', 'Ayanda', 'Zola', 'Kagiso', 'Lindiwe', 'Tumi', 'Bongani', 'Nomsa', 'Jabu', 'Refilwe', 'Kabelo', 'Zanele', 'Dineo', 'Themba', 'Pieter', 'Annika', 'Ravi', 'Priya', 'Marco', 'Chen', 'Yusuf', 'Amara', 'Kofi', 'Elena', 'Tariq', 'Mei', 'Lwazi', 'Karabo', 'Nandi', 'Sizwe'];
const MILESTONES = [2, 5, 10, 25, 50, 100];

/* session state shared across games */
const histories: Record<string, HistoryEntry[]> = {};
const topWins: Record<string, TopWin[]> = {};
let myBets: MyBet[] = [];
let betId = 0;

export function getHistory(id: string) { return histories[id] || []; }
let showGraph = (() => { try { return localStorage.getItem('cg.graph') !== '0'; } catch { return true; } })();
export function getGraph() { return showGraph; }
export function setGraph(v: boolean) { showGraph = v; try { localStorage.setItem('cg.graph', v ? '1' : '0'); } catch { /* ignore */ } }

const emptySlot = (queued = false): Slot => ({ status: 'none', amount: 0, queued });
const now = () => performance.now() / 1000;

export class GameController {
  readonly scene: Scene;
  private wallet: Wallet;
  private settings: () => [SlotSettings, SlotSettings];
  private toast: (msg: string) => void;
  private onEvent: (e: GameEvent) => void;
  private client: LiveCrashClient;

  /* server state */
  private round: LiveRound | null = null;
  private conn: Conn = 'connecting';
  private connMsg = 'Connecting to the game server…';
  private minBet = 1;
  private maxBet = 10000;
  private minAuto = 1.01;
  private growth = CG.K;
  private betTime = BET_TIME;
  private fair: Fairness | null = null;

  /* clock, in performance.now() seconds */
  private startLocal = 0;
  private phaseEndLocal = 0;
  private crashTime = 0;
  private lastTickM = 1;

  private phase: Phase = 'betting';
  private m = 1;
  private t = 0;
  private countdown = 0;
  private lastTick = -1;
  private nextMilestone = 0;
  private route: RouteKey = 'L';
  private forkPassed = false;
  private slots: [Slot, Slot] = [emptySlot(), emptySlot()];
  private bots: Bot[] = [];
  private cashAt: number | null = null;
  private st: unknown = null;
  private punch = 0;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private VW = 960;
  private scale = 1;
  private ext = 0;
  private raf = 0;
  private last = 0;
  private snap!: Snapshot;
  private listeners = new Set<() => void>();
  private disposed = false;

  constructor(scene: Scene, wallet: Wallet, settings: () => [SlotSettings, SlotSettings], toast: (msg: string) => void, onEvent: (e: GameEvent) => void) {
    this.scene = scene; this.wallet = wallet; this.settings = settings; this.toast = toast; this.onEvent = onEvent;
    histories[scene.id] = histories[scene.id] || [];
    topWins[scene.id] = topWins[scene.id] || [];
    this.st = scene.init(this.VW, VH);
    this.client = new LiveCrashClient(scene.id);
    this.client.handlers = {
      round: (r) => this.onRound(r, false),
      tick: (m) => { if (this.phase === 'running') this.lastTickM = Math.max(this.lastTickM, m); },
      myBet: (b, balance) => { this.wallet.set(balance); this.onServerBet(b); },
      resync: (s) => this.applySnapshot(s),
      status: (s, msg) => { this.conn = s; this.connMsg = msg || ''; if (s === 'offline' && msg) this.toast(msg); },
    };
    this.emit();
    void this.connect();
  }

  private async connect() {
    try {
      const s = await this.client.connect();
      if (this.disposed) { void this.client.close(); return; }
      this.applySnapshot(s);
    } catch (e) {
      this.conn = 'offline';
      this.connMsg = e instanceof Error && e.message ? e.message : "Can't reach the game server.";
      this.toast(this.connMsg);
    }
  }

  /* ---------- React store ---------- */
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snap;

  /* ---------- canvas lifecycle ---------- */
  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.resize();
    this.last = now();
    const loop = () => { if (this.disposed) return; this.frame(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  /** Pixel density cap; drops a step when frames run slow so a weaker machine stays smooth. */
  private dprCap = 2;
  private slowFor = 0;
  private watchSpeed(dt: number) {
    this.slowFor = dt > 1 / 42 ? this.slowFor + dt : Math.max(0, this.slowFor - dt * 0.5);
    if (this.slowFor > 2.5 && this.dprCap > 1) { this.dprCap = Math.max(1, this.dprCap - 0.5); this.slowFor = 0; this.resize(); }
  }
  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(this.dprCap, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.scale = this.canvas.height / VH; this.VW = this.canvas.width / this.scale; this.ext = 0;
    if (this.VW < MIN_VW) { this.scale = this.canvas.width / MIN_VW; this.VW = MIN_VW; this.ext = this.canvas.height / this.scale - VH; }
    if (this.phase === 'betting') this.st = this.scene.init(this.VW, VH);
  }
  /** Leaving the game. Bets stay with the server: an auto cash-out you set still pays. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true; cancelAnimationFrame(this.raf); this.listeners.clear();
    void this.client.close();
  }

  /* ---------- server state ---------- */
  private applySnapshot(s: LiveSnapshot) {
    const c = s.config;
    this.minBet = c.minBet; this.maxBet = c.maxBet; this.minAuto = c.minAutoCashOut; this.growth = c.growthRate; this.betTime = c.bettingMs / 1000;
    this.wallet.set(s.balance, s.player.currency);
    const fork = this.scene.fork;
    histories[this.scene.id] = s.state.history.map((h) => ({
      v: h.crashPoint, dot: null,
      detail: 'Round #' + h.roundId + (fork && h.crashPoint < fork ? ' · collapsed before the split' : '') + ' · ' + x2(h.crashPoint),
    }));
    const prev = s.state.fairness.previousServerSeed;
    this.fair = { roundId: s.state.round.id, nonce: s.state.round.nonce, hash: s.state.fairness.currentServerSeedHash, prevSeed: prev?.serverSeed ?? null, prevHash: prev?.hash ?? null };
    this.onRound(s.state.round, true);
    for (const b of s.state.myBets) this.onServerBet(b, true);
    this.emit();
  }

  /** silent: joining or resyncing, so no sounds or popups for what already happened. */
  private onRound(r: LiveRound, silent: boolean) {
    const prev = this.round, fresh = !prev || prev.id !== r.id;
    this.round = r;
    this.startLocal = this.client.toLocal(r.startedAt) / 1000;
    this.phaseEndLocal = this.client.toLocal(r.phaseEndsAt) / 1000;
    if (this.fair) { this.fair.roundId = r.id; this.fair.nonce = r.nonce; this.fair.hash = r.serverSeedHash; }
    if (r.status === 'BETTING') {
      if (fresh || this.phase !== 'betting') this.newRound(silent);
    } else if (r.status === 'FLYING') {
      if (this.phase !== 'running') this.startRun(silent, fresh);
    } else if (this.phase !== 'crashed') {
      if (this.phase === 'betting' || fresh) { this.t = 0; }
      this.crashTime = r.crashedAt != null ? this.client.toLocal(r.crashedAt) / 1000 : now();
      if (silent) this.crashTime = Math.min(this.crashTime, now() - 3.5); // joined after the crash: skip straight to its end
      this.finishRound(r.crashPoint ?? this.m, silent);
    }
    this.emit();
  }

  private newRound(silent: boolean) {
    this.phase = 'betting'; this.st = this.scene.init(this.VW, VH);
    this.cashAt = null; this.forkPassed = false; this.m = 1; this.t = 0; this.lastTickM = 1; this.lastTick = -1; this.nextMilestone = 0;
    const queued = this.slots.map((s) => s.queued);
    this.slots = [emptySlot(), emptySlot()];
    this.bots = this.makeBots();
    if (silent) return;
    const set = this.settings();
    queued.forEach((q, i) => { if (q || set[i].autoBet) void this.placeBet(i, set[i].autoBet && !q); });
  }

  private startRun(silent: boolean, fresh: boolean) {
    if (fresh) this.newRound(true);
    this.phase = 'running'; this.lastTickM = 1;
    this.slots = this.slots.map((s) => (s.status === 'placed' ? { ...s, status: 'active' as const } : s)) as [Slot, Slot];
    if (!silent) this.onEvent({ type: 'launch' });
  }

  private finishRound(end: number, silent: boolean) {
    const sc = this.scene, fork = sc.fork, id = this.round ? this.round.id : 0;
    this.phase = 'crashed'; this.m = end; this.punch = silent ? 0 : 1;
    if (fork && end >= fork) this.forkPassed = true;
    this.slots.forEach((s, i) => { if (s.status === 'active' || s.status === 'placed') this.applySlot(i, { ...s, status: 'lost' }); });
    myBets = myBets.map((b) => (b.round === id && b.result === 0 ? { ...b, result: end } : b));
    this.bots = this.bots.map((b) => (b.status === 'in' ? { ...b, status: 'lost' } : b));
    if (silent) return;
    const forked = !!fork && end >= fork, routeName = sc.routes ? sc.routes[this.route].name : '';
    const h = histories[sc.id];
    if (!h.length || !h[0].detail.startsWith('Round #' + id + ' ')) {
      h.unshift({ v: end, dot: forked && sc.routes ? sc.routes[this.route].color : null, detail: 'Round #' + id + (forked ? ' · on the ' + routeName : ' · collapsed before the split') + ' · ' + x2(end) });
      if (h.length > 40) h.pop();
      histories[sc.id] = h.slice();
    }
    this.onEvent({ type: 'crash', m: end });
  }

  private makeBots(): Bot[] {
    const n = 9 + Math.floor(Math.random() * 10), pool = NAMES.slice().sort(() => Math.random() - 0.5), bets = [5, 10, 10, 20, 25, 50, 50, 100, 200, 250, 500, 1000];
    return pool.slice(0, n).map((name) => {
      let target = 1.05 - Math.log(1 - Math.random()) * 1.5;
      if (Math.random() < 0.12) target *= 3;
      return { name, bet: bets[Math.floor(Math.random() * bets.length)], target: Math.max(1.01, r2(target)), route: (Math.random() < 0.5 ? 'L' : 'R') as RouteKey, status: 'in' as const, at: 0 };
    });
  }

  /* ---------- bets ---------- */
  private slotFrom(b: ServerBet, queued: boolean): Slot {
    const base = { amount: b.amount, queued };
    switch (b.status) {
      case 'Pending': case 'Active': return { ...base, status: this.phase === 'betting' ? 'placed' : 'active' };
      case 'CashedOut': return { ...base, status: 'cashed', at: b.cashedOutAt ?? undefined, pay: b.win ?? undefined };
      case 'Lost': return { ...base, status: 'lost' };
      default: return emptySlot(queued);
    }
  }
  private onServerBet(b: ServerBet, silent = false) {
    if (!this.round || b.roundId !== this.round.id || b.slot < 0 || b.slot > 1) return;
    this.applySlot(b.slot, this.slotFrom(b, this.slots[b.slot].queued), silent);
  }
  /** Changes a slot; settles it the first time it is cashed out or lost. */
  private applySlot(i: number, next: Slot, silent = false) {
    const prev = this.slots[i], id = this.round ? this.round.id : 0;
    this.slots[i] = { ...next, busy: prev.busy };
    if (next.status === 'cashed' && prev.status !== 'cashed' && next.at && next.pay != null) {
      this.wallet.settle(next.amount, next.pay);
      this.logBet(i, next.amount, next.at, next.pay);
      this.addTop({ name: 'You', bet: next.amount, at: next.at, win: next.pay, round: id, you: true });
      if (!silent) { this.cashAt = next.at; this.onEvent({ type: 'cashout', slot: i, at: next.at, pay: next.pay }); }
    } else if (next.status === 'lost' && prev.status !== 'lost') {
      this.wallet.settle(next.amount, 0);
      this.logBet(i, next.amount, null, 0);
    }
    this.emit();
  }

  private addTop(w: TopWin) {
    const list = topWins[this.scene.id];
    list.push(w); list.sort((a, b) => b.win - a.win);
    topWins[this.scene.id] = list.slice(0, 12);
  }
  private logBet(i: number, amount: number, at: number | null, pay: number) {
    myBets = [{ id: ++betId, game: this.scene.name, round: this.round ? this.round.id : 0, slot: i + 1, amount, at, pay, result: 0, time: Date.now() }, ...myBets].slice(0, 60);
  }

  private setBusy(i: number, busy: boolean) { this.slots[i] = { ...this.slots[i], busy }; this.emit(); }

  private async placeBet(i: number, auto = false) {
    const set = this.settings()[i], a = r2(set.bet), bal = this.wallet.getSnapshot().balance;
    if (this.conn !== 'online') { this.toast("Can't reach the game server."); return; }
    if (!(a >= this.minBet)) { this.toast('The minimum bet is ' + money(this.minBet) + '.'); return; }
    if (a > this.maxBet) { this.toast('The maximum bet is ' + money(this.maxBet) + '.'); return; }
    if (bal != null && a > bal) {
      this.toast(auto ? 'Auto bet ' + (i + 1) + ' stopped: not enough balance.' : 'Not enough balance for that bet.');
      if (auto) this.onEvent({ type: 'autostop', slot: i });
      return;
    }
    const autoAt = set.autoOn && set.autoAt >= this.minAuto ? r2(set.autoAt) : null;
    this.setBusy(i, true);
    try {
      const res = await this.client.placeBet(i, a, autoAt);
      this.wallet.set(res.balance);
      if (!res.ok || !res.bet) { this.toast(res.error || "The bet didn't go through."); if (auto) this.onEvent({ type: 'autostop', slot: i }); }
      else { this.applySlot(i, this.slotFrom(res.bet, false)); this.onEvent({ type: 'bet', slot: i }); }
    } catch (e) { this.toast(e instanceof Error ? e.message : "The bet didn't go through."); }
    finally { this.setBusy(i, false); }
  }
  private async cancelBet(i: number) {
    this.setBusy(i, true);
    try {
      const res = await this.client.cancelBet(i);
      this.wallet.set(res.balance);
      if (!res.ok) this.toast(res.error || "Couldn't cancel that bet.");
      else this.slots[i] = emptySlot();
    } catch (e) { this.toast(e instanceof Error ? e.message : "Couldn't cancel that bet."); }
    finally { this.setBusy(i, false); }
  }
  private async cashOut(i: number) {
    this.setBusy(i, true);
    try {
      const res = await this.client.cashOut(i);
      this.wallet.set(res.balance);
      if (!res.ok || res.multiplier == null || res.win == null) this.toast(res.error || 'Too late to cash out.');
      else this.applySlot(i, { ...this.slots[i], status: 'cashed', at: res.multiplier, pay: res.win });
    } catch (e) { this.toast(e instanceof Error ? e.message : 'Too late to cash out.'); }
    finally { this.setBusy(i, false); }
  }

  /* ---------- player actions ---------- */
  isRouteLocked(): boolean { return !this.scene.routes || this.phase === 'crashed' || this.forkPassed; }
  /** For show only: the round has one crash point whichever road you take. */
  setRoute(k: RouteKey) { if (!this.isRouteLocked()) { this.route = k; this.emit(); } }

  /** The main button of a slot: place, cancel, cash out, or queue for the next round. */
  action(i: number) {
    const s = this.slots[i];
    if (s.busy) return;
    if (this.phase === 'betting' && this.round && this.round.status === 'BETTING') {
      if (s.status === 'none') void this.placeBet(i);
      else if (s.status === 'placed') void this.cancelBet(i);
    } else if (this.phase === 'running' && s.status === 'active') void this.cashOut(i);
    else { this.slots[i] = { ...s, queued: !s.queued }; this.emit(); }
  }

  /* ---------- frame ---------- */
  private frame() {
    const t = now(), raw = t - this.last, dt = Math.min(0.05, raw); this.last = t;
    if (raw < 0.25 && !document.hidden) this.watchSpeed(raw); // ignore stalls from a hidden tab
    if (this.phase === 'betting') {
      this.countdown = this.round ? Math.max(0, this.phaseEndLocal - t) : 0;
      const sec = Math.ceil(this.countdown);
      if (this.round && sec !== this.lastTick && sec <= 3 && sec >= 1) this.onEvent({ type: 'tick', last: sec === 1 });
      this.lastTick = sec;
    } else if (this.phase === 'running') {
      // between server ticks the multiplier follows the same curve the server uses
      this.t = Math.max(0, t - this.startLocal);
      const m = Math.max(this.lastTickM, Math.exp(this.growth * this.t));
      this.m = m;
      const fork = this.scene.fork;
      if (fork && !this.forkPassed && m >= fork) this.forkPassed = true;
      this.bots.forEach((b, i) => {
        if (b.status === 'in' && m >= b.target) { this.addTop({ name: b.name, bet: b.bet, at: b.target, win: r2(b.bet * b.target), round: this.round ? this.round.id : 0, you: false }); this.bots[i] = { ...b, status: 'cashed', at: b.target, when: t }; }
      });
      if (this.nextMilestone < MILESTONES.length && m >= MILESTONES[this.nextMilestone]) { this.onEvent({ type: 'milestone', m: MILESTONES[this.nextMilestone] }); this.nextMilestone++; }
    }
    this.draw(dt, t);
    this.emit();
  }

  private draw(dt: number, t: number) {
    const ctx = this.ctx; if (!ctx) return;
    const W = this.VW;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, this.ext * this.scale);
    ctx.clearRect(0, -this.ext, W, VH + this.ext);
    // camera: slow push-in while the multiplier climbs, punch on the crash
    const push = this.phase === 'betting' ? 0 : Math.min(0.05, Math.log(this.m) * 0.018);
    this.punch = Math.max(0, this.punch - dt * 2.2);
    const z = 1 + push + this.punch * 0.035;
    ctx.translate(W / 2, VH / 2); ctx.scale(z, z); ctx.translate(-W / 2, -VH / 2);
    const S: SceneState = {
      phase: this.phase, m: this.m, p: Math.log(this.m), t: this.t, dt, time: t, countdown: this.countdown,
      crashAge: this.phase === 'crashed' ? Math.max(0, t - this.crashTime) : 0, cashAt: this.cashAt, route: this.route,
      routes: this.scene.routes, fork: this.scene.fork, forkPassed: this.forkPassed, dual: null, ext: this.ext,
    };
    try { this.scene.draw(ctx, W, VH, S, this.st); } catch (e) { console.error(e); }
    // post: film grain and the crash flash
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    CG.U.grain(ctx, W, VH + this.ext, 0.06);
    if (this.punch > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,60,40,' + (this.punch * 0.35).toFixed(3) + ')'; ctx.fillRect(0, 0, W, VH + this.ext);
      ctx.restore();
    }
  }

  /* ---------- HUD text ---------- */
  private emit() {
    const sc = this.scene, fork = sc.fork;
    const routeName = sc.routes ? sc.routes[this.route].name : '';
    let label: string, mult: string, sub: string;
    if (this.conn === 'offline' && !this.round) { label = 'Offline'; mult = '—'; sub = this.connMsg; }
    else if (!this.round) { label = 'Connecting'; mult = '…'; sub = this.connMsg; }
    else if (this.phase === 'betting') {
      label = 'Next round in'; mult = this.countdown.toFixed(1) + 's';
      sub = fork ? 'Split at ' + x2(fork) + ' · Taking the ' + routeName : 'Place your bets';
    } else if (this.phase === 'running') {
      label = sc.gauge(this.m); mult = x2(this.m);
      sub = fork ? (this.forkPassed ? 'On the ' + routeName : 'Split at ' + x2(fork) + ' · Taking the ' + routeName) : 'Cash out before it crashes';
    } else {
      label = sc.crashLabel ? sc.crashLabel(this.forkPassed, this.route) : sc.crashWord; mult = x2(this.m);
      sub = fork && this.m < fork ? 'Collapsed at ' + x2(this.m) + ', before the split at ' + x2(fork) : 'Round #' + this.round.id + ' ended at ' + x2(this.m);
    }
    if (this.conn === 'reconnecting') sub = this.connMsg || 'Reconnecting…';
    const mine = this.slots.reduce((s, x) => s + x.amount, 0);
    this.snap = {
      phase: this.phase, m: this.m, countdown: this.countdown, betTime: this.betTime, route: this.route, routeLocked: this.isRouteLocked(), forkPassed: this.forkPassed,
      slots: [this.slots[0], this.slots[1]], bots: this.bots, history: histories[sc.id],
      round: { nonce: this.round ? this.round.id : 0, hash: this.round ? this.round.serverSeedHash : null }, fair: this.fair ? { ...this.fair } : null,
      myBets, topWins: topWins[sc.id], hud: { label, mult, sub },
      players: this.bots.length + this.slots.filter((s) => s.status !== 'none').length,
      wagered: this.bots.reduce((s, b) => s + b.bet, 0) + mine,
      conn: this.conn, connMsg: this.connMsg, minBet: this.minBet, maxBet: this.maxBet,
    };
    this.listeners.forEach((l) => l());
  }
}

/** Checks a revealed server seed against the hash the server published for it. */
export async function seedMatchesHash(seed: string, hash: string): Promise<boolean> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hex = Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, '0')).join('');
  return hex === hash.toLowerCase();
}
