/* The game menu: a carved-stone panel that slides in from the right.
   Main list: My bets, How to play, Game rules, Provably fair, Game limits; balance and round underneath.
   Each item opens its own page inside the panel, with a back arrow. */
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Scene } from '../engine/core.js';
import { money, x2 } from '../game/controller';
import type { Snapshot } from '../game/controller';
import type { Stats } from '../game/wallet';

export type MenuView = 'main' | 'bets' | 'how' | 'rules' | 'fair' | 'limits';

const ITEMS: Array<{ id: Exclude<MenuView, 'main'>; title: string; sub: string; tone: string; icon: ReactNode }> = [
  { id: 'bets', title: 'My bets', sub: 'Your wins, losses and profit', tone: '#ff5a67',
    icon: <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4Zm10 0v9" /> },
  { id: 'how', title: 'How to play', sub: 'Bet, run with the explorer, cash out', tone: '#6cc4ff',
    icon: <path d="M12 6.5C10.2 5.2 7.6 4.8 4.5 5v12.5c3.1-.2 5.7.2 7.5 1.5m0-12.5c1.8-1.3 4.4-1.7 7.5-1.5v12.5c-3.1-.2-5.7.2-7.5 1.5m0-12.5V19" /> },
  { id: 'rules', title: 'Game rules', sub: 'Rounds, payouts and auto cash-out', tone: '#ffcc4d',
    icon: <path d="M7 4.5h8.5L19 8v11.5H7Zm8.5 0V8H19M9.8 11h6.4M9.8 14h6.4M9.8 17h4" /> },
  { id: 'fair', title: 'Provably fair', sub: 'Check every crash point', tone: '#5fd38a',
    icon: <path d="M12 3.5 5 6.2v5.3c0 4.3 2.9 7.8 7 9 4.1-1.2 7-4.7 7-9V6.2Zm-3 8.6 2.2 2.2L15.4 10" /> },
  { id: 'limits', title: 'Game limits', sub: 'Bets, max win and RTP', tone: '#ff9a3c',
    icon: <path d="M4.5 16.5a7.5 7.5 0 1 1 15 0M12 16.5l3.6-4.4M7 16.5h.01M17 16.5h.01M12 9h.01" /> },
];

interface Props {
  scene: Scene;
  snap: Snapshot | null;
  balance: number | null;
  currency: string;
  stats: Stats;
  view: MenuView;
  setView: (v: MenuView | null) => void;
  how: ReactNode;
  fair: ReactNode;
}

export function GameMenu({ scene, snap, balance, currency, stats, view, setView, how, fair }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, [view]);
  const item = ITEMS.find((i) => i.id === view);
  const close = () => setView(null);
  return (
    <div className="menu-wrap" role="presentation" onClick={close}>
      <aside className="menu" role="dialog" aria-modal="true" aria-label={item ? item.title : 'Menu'} onClick={(e) => e.stopPropagation()}>
        <div className="menu-head">
          {item ? (
            <button type="button" className="menu-round" onClick={() => setView('main')} aria-label="Back to the menu">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : null}
          <h2>{item ? item.title : 'Menu'}</h2>
          <button ref={closeRef} type="button" className="menu-round" onClick={close} aria-label="Close the menu">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="menu-body">
          {view === 'main' && (
            <>
              <div className="menu-hero">
                <svg className="menu-hero-art" viewBox="0 0 64 64" aria-hidden="true">
                  <defs><linearGradient id="mh-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b0" /><stop offset=".45" stopColor="#f2b33d" /><stop offset="1" stopColor="#8a5a12" /></linearGradient></defs>
                  <circle cx="32" cy="32" r="30" fill="#0d2416" stroke="url(#mh-g)" strokeWidth="2.4" />
                  <circle cx="32" cy="19" r="5.5" fill="url(#mh-g)" />
                  <path d="M13 50h38v-5.5h-5v-6h-5v-6h-5V27h-8v5.5h-5v6h-5v6h-5Z" fill="url(#mh-g)" />
                  <path d="M29 50v-7a3 3 0 0 1 6 0v7Z" fill="#0d2416" />
                  <path d="M8 52c4-7 8-10 13-10M56 52c-4-7-8-10-13-10" stroke="#5fd38a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                </svg>
                <div className="menu-hero-txt">
                  <span className="menu-kicker">Temple crash</span>
                  <b className="menu-title">Jungle <em>Escape</em></b>
                </div>
                <div className="menu-chips">
                  <span>RTP <b>97%</b></span>
                  <span>Up to <b>{(snap ? snap.maxMultiplier : 10000).toLocaleString('en-US')}×</b></span>
                  <span><b>{snap ? snap.slotCount : 2}</b> bets a round</span>
                </div>
              </div>

              <nav className="menu-list" aria-label="Menu">
                {ITEMS.map((i) => (
                  <button key={i.id} type="button" className="menu-item" style={{ ['--tone' as string]: i.tone }} onClick={() => setView(i.id)}>
                    <span className="menu-ico"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg></span>
                    <span className="menu-txt"><b>{i.title}</b><span>{i.sub}</span></span>
                    <svg className="menu-chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                ))}
              </nav>

              <div className="menu-foot">
                <div><span>Balance{currency ? ' · ' + currency : ''}</span><b>{balance == null ? '—' : money(balance)}</b></div>
                <div><span>Round</span><b>{snap && snap.round.nonce ? '#' + snap.round.nonce : '—'}</b></div>
              </div>
            </>
          )}

          {view === 'bets' && <MyBets scene={scene} snap={snap} stats={stats} />}
          {view === 'how' && how}
          {view === 'rules' && <Rules snap={snap} />}
          {view === 'fair' && fair}
          {view === 'limits' && <Limits snap={snap} />}
        </div>
      </aside>
    </div>
  );
}

function MyBets({ scene, snap, stats }: { scene: Scene; snap: Snapshot | null; stats: Stats }) {
  const bets = snap ? snap.myBets.filter((b) => b.game === scene.name) : [];
  const won = bets.filter((b) => b.at != null).length;
  return (
    <div className="menu-page">
      <div className="menu-stats">
        <div><span>Bets</span><b>{stats.rounds}</b></div>
        <div><span>Won</span><b className="pos">{won}</b></div>
        <div><span>Lost</span><b className="neg">{bets.length - won}</b></div>
        <div><span>Profit</span><b className={stats.net >= 0 ? 'pos' : 'neg'}>{(stats.net >= 0 ? '+' : '−') + money(Math.abs(stats.net))}</b></div>
      </div>
      {bets.length === 0 ? <p className="menu-empty">No bets yet this session. Settled bets show up here.</p> : (
        <ul className="menu-bets">
          {bets.map((b) => (
            <li key={b.id} className={b.at != null ? 'win' : 'loss'}>
              <span className="mb-round">#{b.round}<i>Bet {b.slot} · {new Date(b.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</i></span>
              <span className="mb-stake">{money(b.amount)}</span>
              <span className="mb-at">{b.at != null ? x2(b.at) : b.result ? 'Crashed ' + x2(b.result) : 'Lost'}</span>
              <b className="mb-net">{b.at != null ? '+' + money(b.pay - b.amount) : '−' + money(b.amount)}</b>
            </li>
          ))}
        </ul>
      )}
      <p className="menu-note">Profit counts this session only. Your balance always comes from the game server.</p>
    </div>
  );
}

function Rules({ snap }: { snap: Snapshot | null }) {
  const bet = snap ? snap.betTime : 6;
  const rows: Array<[string, string]> = [
    ['Rounds', `Bets are open for ${bet} s. Then the explorer runs and the multiplier climbs until the temple collapses. The result shows for 4 s, then a new round opens.`],
    ['The multiplier', 'It grows as e^(0.09·t): about 2× at 7.7 s, 5× at 17.9 s, 10× at 25.6 s.'],
    ['Payouts', 'Cash out to win your bet × the multiplier at that moment. If the temple collapses first, the bet is lost.'],
    ['Two bets', `Up to ${snap ? snap.slotCount : 2} bets a round, each with its own amount and auto settings.`],
    ['Auto cash-out', `Cashes out for you at the multiplier you set, from ${(snap ? snap.minAuto : 1.01).toFixed(2)}×. Set it before you place the bet.`],
    ['Cancelling', 'You can cancel a bet until the round starts.'],
    ['The road at 1.80×', 'The Serpent Hall or the Sun Gate is only for show. Each round has one crash point.'],
    ['Lost connection', 'Your bets stay in the round. An auto cash-out still pays. Reload to see the result.'],
    ['Delayed payouts', 'If the wallet is slow, your win is saved and paid shortly. You see a notice when this happens.'],
  ];
  return (
    <div className="menu-page">
      <dl className="menu-rules">{rows.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
    </div>
  );
}

function Limits({ snap }: { snap: Snapshot | null }) {
  const tiles: Array<[string, string]> = [
    ['Min bet', money(snap ? snap.minBet : 1)],
    ['Max bet', money(snap ? snap.maxBet : 10000)],
    ['Max win', money(snap ? snap.maxWin : 500000)],
    ['Top multiplier', (snap ? snap.maxMultiplier : 10000).toLocaleString('en-US') + '×'],
    ['Return to player', '97%'],
    ['House edge', '3%'],
    ['Bets per round', String(snap ? snap.slotCount : 2)],
    ['Min auto cash-out', (snap ? snap.minAuto : 1.01).toFixed(2) + '×'],
  ];
  return (
    <div className="menu-page">
      <div className="menu-limits">{tiles.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
      <p className="menu-note">About 3% of rounds crash at 1.00×. The chance of reaching a multiplier x is about 97% ÷ x: 48.5% for 2×, 9.7% for 10×.</p>
    </div>
  );
}
