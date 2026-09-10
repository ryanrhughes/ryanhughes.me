export const STARTING_COINS = 100;
export const FINAL_PUSH_SECONDS = 10;
export const BEST_SCORE_KEY = 'deep-sea-best-score-v1';

export interface RunState {
  balance: number;
  won: number;
  played: number;
  jackpot: number;
  jackpotCoinsWon: number;
  lastJackpot: number;
  gems: number;
  score: number;
  bestScore: number;
  phase: 'playing' | 'settling' | 'over';
  finalPushRemaining: number;
}

/** Coin returns and earned jackpots credit both the pocket and the score. */
export class ArcadeRun {
  readonly state: RunState;

  constructor(bestScore = 0) {
    this.state = {
      balance: STARTING_COINS, won: 0, played: 0, jackpot: 500, jackpotCoinsWon: 0, lastJackpot: 0, gems: 0,
      score: 0, bestScore: Number.isSafeInteger(bestScore) && bestScore > 0 ? bestScore : 0,
      phase: 'playing', finalPushRemaining: 0,
    };
  }

  spendCoin() {
    if (this.state.phase !== 'playing' || this.state.balance < 1) return false;
    this.state.balance--; this.state.played++; this.state.jackpot++;
    this.checkEmpty();
    return true;
  }

  penalize(coins: number) {
    if (this.state.phase !== 'playing') return 0;
    const charge = Math.min(coins, this.state.balance);
    this.state.balance -= charge;
    this.checkEmpty();
    return charge;
  }

  collectCoin() {
    if (this.state.phase === 'over') return false;
    this.creditCoins(1);
    return true;
  }

  collectGem() {
    if (this.state.phase === 'over') return 0;
    this.state.gems++;
    if (this.state.gems < 3) return 0;
    // Credit the full displayed amount before resetting the progressive meter.
    const payout = this.state.jackpot;
    this.creditCoins(payout);
    this.state.jackpotCoinsWon += payout;
    this.state.lastJackpot = payout;
    this.state.gems = 0; this.state.jackpot = 500;
    return payout;
  }

  tick(delta: number, treasureHeld: boolean) {
    if (this.state.phase !== 'settling') return;
    // A caught token gets its shark release, then two full pusher cycles to pay out.
    if (treasureHeld) { this.state.finalPushRemaining = FINAL_PUSH_SECONDS; return; }
    this.state.finalPushRemaining = Math.max(0, this.state.finalPushRemaining - delta);
    if (this.state.finalPushRemaining <= 0) this.state.phase = 'over';
  }

  private checkEmpty() {
    if (this.state.balance > 0) return;
    this.state.phase = 'settling';
    this.state.finalPushRemaining = FINAL_PUSH_SECONDS;
  }

  private addScore(points: number) {
    this.state.score += points;
    this.state.bestScore = Math.max(this.state.bestScore, this.state.score);
  }

  private creditCoins(coins: number) {
    this.state.balance += coins;
    this.state.won += coins;
    this.addScore(coins);
    this.state.phase = 'playing';
    this.state.finalPushRemaining = 0;
  }
}
