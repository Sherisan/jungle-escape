import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { CG } from '../engine/core.js';
import type { RouteKey, Scene } from '../engine/core.js';
import { BET_TIME, GameController, getClientSeed, money, setClientSeed, verifyRound, x2 } from '../game/controller';
import type { GameEvent, HistoryEntry, Round, Slot, SlotSettings, Snapshot } from '../game/controller';
import { r2, wallet } from '../game/wallet';
import { sound } from '../game/audio';

const noSub = () => () => {};
const noSnap = (): Snapshot | null => null;
const tier = (v: number) => (v >= 10 ? 'hi' : v >= 2 ? 'mid' : 'lo');

interface Props { scene: Scene; toast: (m: string) => void; }
interface Pop { id: number; text: string; sub: string; big: boolean; }
interface Banner { id: number; title: string; sub: string; col: string; }

const defaultSlot = (bet: number): SlotSettings => ({ bet, autoOn: false, autoAt: 2, autoBet: false });

export function GameView({ scene, toast }: Props) {
  const [slotSet, setSlotSet] = useState<[SlotSettings, SlotSettings]>(() => [defaultSlot(10), defaultSlot(5)]);
  const settings = useRef(slotSet); settings.current = slotSet;
  const [ctrl, setCtrl] = useState<GameController | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const bannerId = useRef(0);
  const announce = useCallback((title: string, sub: string, col: string, ms: number) => {
    const id = ++bannerId.current;
    setBanner({ id, title, sub, col });
    window.setTimeout(() => setBanner((b) => (b && b.id === id ? null : b)), ms);
  }, []);
  const [modal, setModal] = useState<null | 'how' | 'fair'>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toastRef = useRef(toast); toastRef.current = toast;
  const popId = useRef(0);

  const updateSlot = useCallback((i: number, patch: Partial<SlotSettings>) => setSlotSet((s) => { const n = [...s] as [SlotSettings, SlotSettings]; n[i] = { ...n[i], ...patch }; return n; }), []);

  const onEvent = useCallback((e: GameEvent) => {
    if (e.type === 'tick') sound.tick(e.last);
    else if (e.type === 'bet') sound.bet();
    else if (e.type === 'launch') { sound.launch(); sound.startRun(scene.sound); announce('Run!', 'The wheel is loose', '#ffcf6a', 1250); }
    else if (e.type === 'milestone') sound.milestone();
    else if (e.type === 'crash') { sound.stopRun(); sound.crash(); }
    else if (e.type === 'autostop') updateSlot(e.slot, { autoBet: false });
    else if (e.type === 'cashout') {
      const big = e.at >= 10;
      sound.cashout(big);
      const id = ++popId.current;
      setPops((p) => [...p, { id, text: '+' + money(e.pay), sub: (big ? 'Big win · ' : scene.cashWord + ' · ') + x2(e.at), big }]);
      window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), big ? 3200 : 2200);
    }
  }, [scene, updateSlot, announce]);

  /* one controller per mounted game; created in an effect so StrictMode remounts stay clean */
  useEffect(() => {
    const c = new GameController(scene, wallet, () => settings.current, (m) => toastRef.current(m), onEvent);
    const cv = canvasRef.current as HTMLCanvasElement;
    c.attach(cv);
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(cv);
    setCtrl(c);
    return () => { ro.disconnect(); c.dispose(); sound.stopRun(); setCtrl(null); };
  }, [scene, onEvent]);

  const snap = useSyncExternalStore(ctrl ? ctrl.subscribe : noSub, ctrl ? ctrl.getSnapshot : noSnap);
  const { balance } = useSyncExternalStore(wallet.subscribe, wallet.getSnapshot);
  useEffect(() => { if (snap && snap.phase === 'running') sound.updateRun(snap.m, snap.forkPassed ? snap.route : null); }, [snap]);
  // the split gets its own sound, and traps in the scene call back into the sound engine
  const forked = !!snap && snap.forkPassed && snap.phase === 'running';
  useEffect(() => { if (forked && snap) { sound.split(snap.route); const R = scene.routes && scene.routes[snap.route]; if (R) window.setTimeout(() => announce(R.name, R.tag || '', R.color, 2000), 720); } }, [forked]);
  useEffect(() => { CG.sfx = (n: string) => sound.trap(n); return () => { CG.sfx = undefined; }; }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setModal(null); return; }
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.code !== 'Space' || modal || /INPUT|TEXTAREA|SELECT|BUTTON/.test(tag)) return;
      e.preventDefault(); sound.unlock(); ctrl?.action(0);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ctrl, modal]);

  const progress = snap && snap.phase === 'betting' ? snap.countdown / BET_TIME : 0;

  return (
    <section className="game" onPointerDown={() => sound.unlock()}>
      <div className="game-grid">
        <div className="play">
          {/* the game name is already in the top bar; recent results and the info buttons share one row */}
          <h1 className="sr-only">{scene.name}</h1>
          <div className="play-top">
            <History items={snap ? snap.history : []} />
            <div className="play-actions">
              <button type="button" className="ghost-btn" aria-label="How to play" onClick={() => setModal('how')}><InfoIcon /><span className="lbl">How to play</span></button>
              <button type="button" className="ghost-btn fair-btn" aria-label="Provably fair" onClick={() => setModal('fair')}><ShieldIcon /><span className="lbl">Provably fair</span></button>
            </div>
          </div>

          <div className="stage" data-phase={snap ? snap.phase : 'betting'} style={{ background: scene.bg }}>
            <canvas ref={canvasRef} />
            <StageFrame />
            {snap && (
              <>
                <div className="stage-top">
                  <span className="pill"><span className={'state-dot ' + snap.phase} />{snap.phase === 'running' ? 'Live' : snap.phase === 'betting' ? 'Bets open' : 'Round over'} · #{snap.round.nonce}</span>
                </div>
                <div className="hud" data-phase={snap.phase} data-tier={tier(snap.m)} aria-live="polite">
                  <div className="hud-plaque">
                    <span className="hud-label">{snap.hud.label}</span>
                    <span className="hud-mult"><span className="sr-only">{snap.hud.mult}</span><FixedDigits text={snap.hud.mult} /></span>
                  </div>
                  <span className="hud-sub">{snap.hud.sub}</span>
                </div>
                <Trail m={snap.m} phase={snap.phase} progress={progress} fork={scene.fork} col={snap.forkPassed && scene.routes ? scene.routes[snap.route].color : '#8fd14f'} />
                {banner && <div key={banner.id} className="zone-banner" style={{ ['--bc' as string]: banner.col }}><b>{banner.title}</b><span>{banner.sub}</span></div>}
                <div className="pops">
                  {pops.map((p) => <div key={p.id} className={'pop' + (p.big ? ' big' : '')}><span>{p.sub}</span><b>{p.text}</b></div>)}
                </div>
              </>
            )}
          </div>

          <div className="deck">
          {scene.routes && snap && (
            <div className="route-bar">
              <div className="route-info">
                <b>{snap.forkPassed ? 'Road taken' : 'Choose your road'}</b>
                <span>{snap.forkPassed ? 'You took the ' + scene.routes[snap.route].name : scene.dual ? 'Locks at launch' : 'Locks at ' + x2(scene.fork as number) + ' · each road has its own crash point'}</span>
              </div>
              <div className="seg" role="group" aria-label="Route">
                {(['L', 'R'] as RouteKey[]).map((k) => (
                  <button key={k} id={'route' + k} type="button" className="seg-btn" style={{ ['--rc' as string]: scene.routes![k].color }}
                    aria-pressed={snap.route === k} disabled={snap.routeLocked && snap.route !== k} onClick={() => { sound.unlock(); if (snap.route !== k) sound.route(); ctrl?.setRoute(k); }}>
                    <RouteGlyph kind={scene.routes![k].glyph} /><span className="seg-text"><span className="seg-name">{scene.routes![k].name}</span>{scene.routes![k].hint && <span className="seg-hint">{scene.routes![k].hint}</span>}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="slots">
            {[0, 1].map((i) => (
              <BetSlot key={i} index={i} set={slotSet[i]} slot={snap ? snap.slots[i] : null} phase={snap ? snap.phase : 'betting'} m={snap ? snap.m : 1}
                balance={balance} onChange={(p) => updateSlot(i, p)} onAction={() => { sound.unlock(); ctrl?.action(i); }} />
            ))}
          </div>
          </div>
          {balance < 1 && <p className="low">You're out of demo credits. <button type="button" className="link" onClick={() => { wallet.reset(); toast('Demo credits reset to 1,000.00'); }}>Reset to 1,000</button></p>}
        </div>


      </div>

      {modal && (
        <Modal title={modal === 'how' ? 'How to play ' + scene.name : 'Provably fair'} onClose={() => setModal(null)}>
          {modal === 'how' ? <HowTo scene={scene} /> : snap ? <Fairness scene={scene} round={snap.round} prev={snap.prev} toast={toast} /> : null}
        </Modal>
      )}
    </section>
  );
}

/** The display font has proportional figures. Digits after the decimal point change many times a second, so they sit in
    fixed-width boxes; otherwise the centred multiplier jitters as it counts. The whole part keeps natural spacing. */
function FixedDigits({ text }: { text: string }) {
  const dot = text.indexOf('.');
  return <>{[...text].map((ch, i) => <span key={i} aria-hidden="true" className={dot >= 0 && i > dot && ch >= '0' && ch <= '9' ? 'dg' : 'sy'}>{ch}</span>)}</>;
}

/** Carved gold corners laid over the stage. */
function StageFrame() {
  const corner = (cls: string) => (
    <svg className={'frame-corner ' + cls} viewBox="0 0 84 84" aria-hidden="true">
      <defs><linearGradient id={'fg-' + cls} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0b4" /><stop offset="0.45" stopColor="#e2aa3c" /><stop offset="1" stopColor="#7a4e10" /></linearGradient></defs>
      <path d="M0 0H84V9H42V18H28V28H18V42H9V84H0Z" fill={'url(#fg-' + cls + ')'} stroke="#1c1206" strokeWidth="1.2" />
      <path d="M11 11H39V19H25V25H19V39H11Z" fill="#14100a" stroke="#c9963a" strokeWidth="1" />
      <path d="M15 15h14M15 15v14M20 20h5M20 20v5" stroke="#e2aa3c" strokeWidth="1.6" fill="none" />
      <circle cx="51" cy="4.6" r="2.4" fill="#2fbf8a" stroke="#1c1206" strokeWidth=".7" /><circle cx="65" cy="4.6" r="2.4" fill="#d4283c" stroke="#1c1206" strokeWidth=".7" />
      <circle cx="4.6" cy="51" r="2.4" fill="#2fbf8a" stroke="#1c1206" strokeWidth=".7" /><circle cx="4.6" cy="65" r="2.4" fill="#d4283c" stroke="#1c1206" strokeWidth=".7" />
    </svg>
  );
  return <>{corner('tl')}{corner('tr')}{corner('bl')}{corner('br')}</>;
}

/** The way ahead, on a log scale. While bets are open the same line is a fuse burning down. */
const TRAIL_NODES = [5, 10, 25, 50, 100];
const trailPos = (v: number) => Math.min(1, Math.log(v) / Math.log(100));
function Trail({ m, phase, progress, fork, col }: { m: number; phase: string; progress: number; fork?: number; col: string }) {
  const p = phase === 'betting' ? 0 : trailPos(m), bet = phase === 'betting';
  return (
    <div className={'trail' + (bet ? ' fuse' : '')} style={{ ['--tc' as string]: col }} aria-hidden="true">
      <div className="trail-line">
        {bet ? <i className="trail-fuse" style={{ transform: `scaleX(${progress})` }} /> : <i className="trail-fill" style={{ transform: `scaleX(${p})` }} />}
      </div>
      {!bet && fork && <span className={'trail-node split' + (m >= fork ? ' past' : '')} style={{ left: trailPos(fork) * 100 + '%' }}><b>{fork.toFixed(2)}×</b></span>}
      {!bet && TRAIL_NODES.map((n) => <span key={n} className={'trail-node' + (m >= n ? ' past' : '')} style={{ left: trailPos(n) * 100 + '%' }}><b>{n}×</b></span>)}
      {bet ? <span className="trail-spark" style={{ left: progress * 100 + '%' }} /> : <span className={'trail-hero' + (phase === 'crashed' ? ' dead' : '')} style={{ left: p * 100 + '%' }}><svg viewBox="0 0 24 24" width="20" height="20"><path fill="#ecd39a" stroke="#2a1a0a" strokeWidth="1.4" strokeLinejoin="round" d="M2 16c2-1 4-1.4 5-1.6C7.4 9 8.6 6.5 12 6.5s4.6 2.5 5 7.9c1 .2 3 .6 5 1.6-3 1.6-7 2-10 2s-7-.4-10-2Z" /><path fill="#7c2a1b" d="M7.2 12.6c3 .9 6.6.9 9.6 0l.2 2c-3.2 1-6.8 1-10 0Z" /></svg></span>}
    </div>
  );
}

/* ---------- icons ---------- */
function ShieldIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.9-4.9 1.4 1.4-6.3 6.3Z" /></svg>; }
function InfoIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z" /></svg>; }
function RouteGlyph({ kind }: { kind?: string }) {
  if (kind === 'serpent') return (
    <svg className="glyph" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M2.5 19c2.5-5 6.5 3 9.5-2.5S10 7 15 6.2c1.8-.3 3.2.3 4.3 1.3" />
      <ellipse cx="20" cy="8.3" rx="2.2" ry="1.7" fill="currentColor" />
    </svg>
  );
  if (kind === 'sun') return (
    <svg className="glyph" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.6" fill="currentColor" />
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.3 5.3l2 2M16.7 16.7l2 2M5.3 18.7l2-2M16.7 7.3l2-2" />
    </svg>
  );
  return <span className="dot" />;
}

/* ---------- modal ---------- */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="modal-wrap" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button ref={ref} type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function HowTo({ scene }: { scene: Scene }) {
  const steps: Array<[string, string]> = [
    ['Place a bet', 'Set an amount in Bet 1, Bet 2 or both while the countdown runs, then press Bet.'],
    ['Watch it climb', 'When the round starts, the multiplier rises from 1.00× and so does what your bet would pay.'],
    ['Cash out in time', 'Press Cash out before the round crashes to win your bet times the multiplier. If it crashes first, the bet is lost.'],
  ];
  if (scene.fork && scene.routes) steps.splice(2, 0, ['Choose a route', 'At ' + x2(scene.fork) + ' the track splits into ' + scene.routes.L.name + ' and ' + scene.routes.R.name + '. Each has its own hidden crash point. You can switch until the split.']);
  if (scene.dual && scene.routes) steps.splice(1, 0, ['Back a route', 'Pick ' + scene.routes.L.name + ' or ' + scene.routes.R.name + ' before launch. Both run at once, and your bet follows the route you picked.']);
  return (
    <div className="howto">
      <p className="howto-lede">{scene.blurb}</p>
      <ol>{steps.map(([t, d], i) => <li key={i}><b>{t}</b><span>{d}</span></li>)}</ol>
      <div className="howto-grid">
        <div><span>Return to player</span><b>97%</b></div>
        <div><span>Top multiplier</span><b>10,000×</b></div>
        <div><span>Rounds that bust at 1.00×</span><b>3%</b></div>
      </div>
      <p className="note">Use <b>Auto</b> on a bet panel to bet every round or cash out at a set multiplier. Space bar bets or cashes out on Bet 1. Demo credits have no cash value.</p>
    </div>
  );
}

/* ---------- bet slot ---------- */
function BetSlot({ index, set, slot, phase, m, balance, onChange, onAction }: {
  index: number; set: SlotSettings; slot: Slot | null; phase: string; m: number; balance: number;
  onChange: (p: Partial<SlotSettings>) => void; onAction: () => void;
}) {
  const [mode, setMode] = useState<'bet' | 'auto'>('bet');
  const [betText, setBetText] = useState(set.bet.toFixed(2));
  const [autoText, setAutoText] = useState(set.autoAt.toFixed(2));
  useEffect(() => { setBetText(set.bet.toFixed(2)); }, [set.bet]);
  const commitBet = (v: number) => { const n = Math.max(1, r2(v || 0)); setBetText(n.toFixed(2)); onChange({ bet: n }); };
  const s = slot ? slot.status : 'none';
  let label: string, sub: string, cls: string;
  if (phase === 'betting' && s === 'none') { label = 'Bet'; sub = money(set.bet) + ' credits'; cls = 'go'; }
  else if (phase === 'betting' && s === 'placed') { label = 'Cancel'; sub = 'Waiting for the round'; cls = 'stop'; }
  else if (phase === 'running' && s === 'active' && slot) { label = 'Cash out'; sub = money(r2(slot.amount * m)); cls = 'cash'; }
  else if (slot?.queued) { label = 'Cancel'; sub = 'Queued for next round'; cls = 'stop'; }
  else { label = 'Bet'; sub = 'Next round · ' + money(set.bet); cls = 'go dim'; }
  const locked = s === 'placed' || s === 'active';
  const result = s === 'cashed' && slot ? { t: 'Won ' + money(slot.pay as number), c: 'win' } : s === 'lost' && slot ? { t: 'Lost ' + money(slot.amount), c: 'loss' } : null;
  return (
    <div className={'slot' + (s === 'active' ? ' live' : '') + (result ? ' ' + result.c : '')}>
      <div className="slot-head">
        <div className="mini-tabs" role="tablist" aria-label={'Bet ' + (index + 1) + ' mode'}>
          <button type="button" role="tab" aria-selected={mode === 'bet'} className={mode === 'bet' ? 'on' : ''} onClick={() => setMode('bet')}>Bet</button>
          <button type="button" role="tab" aria-selected={mode === 'auto'} className={mode === 'auto' ? 'on' : ''} onClick={() => setMode('auto')}>Auto{(set.autoBet || set.autoOn) && <i className="auto-dot" />}</button>
        </div>
        {result ? <span className={'slot-result ' + result.c}>{result.t}</span> : <span className="slot-name">Bet {index + 1}</span>}
      </div>
      <div className="slot-body">
        <div className="slot-controls">
          <div className="amount">
            <button type="button" aria-label={'Lower bet ' + (index + 1)} disabled={locked} onClick={() => commitBet(set.bet - (set.bet > 10 ? 5 : 1))}>−</button>
            <input id={'bet' + index} type="number" inputMode="decimal" min="1" step="1" value={betText} disabled={locked}
              onChange={(e) => { setBetText(e.target.value); const v = parseFloat(e.target.value); if (v >= 1) onChange({ bet: r2(v) }); }}
              onBlur={() => commitBet(parseFloat(betText))} aria-label={'Bet ' + (index + 1) + ' amount'} />
            <button type="button" aria-label={'Raise bet ' + (index + 1)} disabled={locked} onClick={() => commitBet(set.bet + (set.bet >= 10 ? 5 : 1))}>+</button>
          </div>
          <div className="quick">
            {[10, 50, 100, 500].map((v) => <button key={v} type="button" disabled={locked} onClick={() => commitBet(Math.min(v, Math.max(1, Math.floor(balance))))}>{v}</button>)}
          </div>
        </div>
        <button type="button" className={'act ' + cls} onClick={onAction}>
          <span className="act-label">{label}</span>
          <span className="act-sub">{sub}</span>
        </button>
      </div>
      {mode === 'auto' && (
        <div className="auto-panel">
          <label className="toggle">
            <input id={'autobet' + index} type="checkbox" checked={set.autoBet} onChange={(e) => onChange({ autoBet: e.target.checked })} />
            <span className="switch" aria-hidden="true" />Auto bet every round
          </label>
          <div className="auto-row">
            <label className="toggle">
              <input id={'auto' + index} type="checkbox" checked={set.autoOn} onChange={(e) => onChange({ autoOn: e.target.checked })} />
              <span className="switch" aria-hidden="true" />Auto cash out at
            </label>
            <div className="auto">
              <input id={'autoAt' + index} type="number" inputMode="decimal" min="1.01" step="0.1" value={autoText} disabled={!set.autoOn}
                onChange={(e) => { setAutoText(e.target.value); const v = parseFloat(e.target.value); if (v >= 1.01) onChange({ autoAt: r2(v) }); }}
                onBlur={() => { const v = Math.max(1.01, r2(parseFloat(autoText) || 2)); setAutoText(v.toFixed(2)); onChange({ autoAt: v }); }}
                aria-label={'Auto cash out multiplier for bet ' + (index + 1)} />
              <span>×</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- history pills ---------- */
const History = memo(function History({ items }: { items: HistoryEntry[] }) {
  return (
    <div className="history" aria-label="Recent results">
      {items.length === 0 ? <span className="hist-empty">Recent results will line up here</span> :
        items.map((e, i) => (
          <span key={items.length - i} className={'mpill ' + tier(e.v) + (i === 0 ? ' latest' : '')} title={e.detail}>
            {e.dot && <i style={{ background: e.dot }} />}{x2(e.v)}
          </span>
        ))}
    </div>
  );
});

/* ---------- fairness ---------- */
const Fairness = memo(function Fairness({ scene, round, prev, toast }: { scene: Scene; round: Snapshot['round']; prev: Round | null; toast: (m: string) => void }) {
  const [seed, setSeed] = useState(getClientSeed());
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setVerdict(null); }, [prev]);
  const applySeed = (v: string) => { const s = v.trim().slice(0, 64); if (!s) { setSeed(getClientSeed()); return; } setClientSeed(s); setSeed(s); toast('Your new client seed applies from the next round.'); };
  const copy = () => {
    const h = round.hash || '';
    try { navigator.clipboard.writeText(h).then(() => toast('Hash copied'), () => toast('Copy was blocked. Select the hash and copy it yourself.')); }
    catch { toast('Copy was blocked. Select the hash and copy it yourself.'); }
  };
  const o = prev?.out, R = scene.routes;
  const outText = !o ? '' : scene.dual && R ? R.L.name + ' ' + x2(o.L as number) + ', ' + R.R.name + ' ' + x2(o.R as number)
    : scene.fork && R ? ((o.trunk as number) < scene.fork ? 'Shared track ' + x2(o.trunk as number) + ' (before the split)' : R.L.name + ' ' + x2(o.L as number) + ', ' + R.R.name + ' ' + x2(o.R as number))
      : x2(o.trunk as number);
  return (
    <div className="fair">
      <p className="note">Every result is fixed before betting opens. You see a hash of the secret server seed now, and the seed itself after the round, so you can check nothing changed.</p>
      <dl>
        <dt>Round #{round.nonce} · server seed hash <button type="button" className="link" onClick={copy}>Copy</button></dt>
        <dd className="mono code">{round.hash || 'Generating…'}</dd>
        <dt><label htmlFor="clientSeed">Your client seed</label></dt>
        <dd className="seed-row">
          <input id="clientSeed" className="mono" value={seed} onChange={(e) => setSeed(e.target.value)} onBlur={(e) => applySeed(e.target.value)} />
          <button type="button" onClick={() => applySeed(CG.fair.randomSeed(8))}>New</button>
        </dd>
      </dl>
      {prev ? (
        <div className="prev">
          <h3>Previous round #{prev.nonce}</h3>
          <dl>
            <dt>Revealed server seed</dt><dd className="mono code">{prev.seed}</dd>
            <dt>Client seed</dt><dd className="mono code">{prev.client}</dd>
            <dt>Result</dt><dd>{outText}</dd>
          </dl>
          <button type="button" className="verify-btn" onClick={async () => {
            setVerdict({ ok: true, text: 'Checking…' });
            const ok = await verifyRound(scene, prev);
            setVerdict({ ok, text: ok ? 'Verified. The seed matches the published hash and every result recomputes exactly.' : 'Mismatch. These results do not match the published hash.' });
          }}><ShieldIcon /> Verify previous round</button>
          {verdict && <p className={'verdict ' + (verdict.ok ? 'pos' : 'neg')}>{verdict.text}</p>}
        </div>
      ) : <p className="note">Play one round and its revealed seed appears here to check.</p>}
      <p className="note small">Formula: r = HMAC-SHA256(server seed, client seed:nonce:path), crash = floor(97 / (1 − r)) / 100, so P(crash ≥ x) = 0.97 / x. For this demo the seeds are made in your browser; a live product keeps them on its server.</p>
    </div>
  );
});
