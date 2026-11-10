/* The player's balance, as the game server reports it. The server keeps the real wallet;
   this only mirrors it for the UI, plus session stats counted from settled bets. */

export interface Stats { rounds: number; wagered: number; net: number; }
export interface WalletSnapshot { balance: number | null; currency: string; stats: Stats; }

export const r2 = (v: number) => Math.floor(v * 100 + 1e-7) / 100;

export class Wallet {
  private snap: WalletSnapshot = { balance: null, currency: '', stats: { rounds: 0, wagered: 0, net: 0 } };
  private listeners = new Set<() => void>();

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snap;

  private commit(p: Partial<WalletSnapshot>) { this.snap = { ...this.snap, ...p }; this.listeners.forEach((l) => l()); }

  /** A balance from the server. null leaves the shown balance as it is. */
  set(balance: number | null | undefined, currency?: string) {
    if (balance == null && currency == null) return;
    this.commit({ ...(balance != null ? { balance } : {}), ...(currency != null ? { currency } : {}) });
  }
  /** A bet settled: count it in the session stats. */
  settle(stake: number, payout: number) {
    const s = this.snap.stats;
    this.commit({ stats: { rounds: s.rounds + 1, wagered: s.wagered + stake, net: s.net + payout - stake } });
  }
}

export const wallet = new Wallet();
