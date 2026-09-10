import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server, ArcadeRun, FINAL_PUSH_SECONDS;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
  ({ ArcadeRun, FINAL_PUSH_SECONDS } = await server.ssrLoadModule('/src/run.ts'));
});
after(async () => server?.close());

function spendPocket(run) { while (run.spendCoin()) {} }

test('a jackpot pays the full progressive amount before resetting, exactly once', () => {
  const run = new ArcadeRun();
  for (let i = 0; i < 12; i++) run.spendCoin();
  assert.equal(run.collectGem(), 0);
  assert.equal(run.collectGem(), 0);
  assert.equal(run.state.balance, 88);
  assert.equal(run.state.won, 0);
  assert.equal(run.collectGem(), 512);
  assert.equal(run.state.balance, 600);
  assert.equal(run.state.won, 512);
  assert.equal(run.state.score, 512);
  assert.equal(run.state.bestScore, 512);
  assert.equal(run.state.jackpotCoinsWon, 512);
  assert.equal(run.state.lastJackpot, 512);
  assert.equal(run.state.jackpot, 500);
  assert.equal(run.state.gems, 0);
  assert.equal(run.collectGem(), 0);
  assert.equal(run.collectGem(), 0);
  assert.equal(run.state.balance, 600);
  run.spendCoin();
  assert.equal(run.collectGem(), 501);
  assert.equal(run.state.balance, 1100);
  assert.equal(run.state.score, 1013);
  assert.equal(run.state.won, 1013);
  assert.equal(run.state.jackpotCoinsWon, 1013);
  assert.equal(run.state.lastJackpot, 501);
});

test('the last coin gets a final push and a late return resumes the run', () => {
  const run = new ArcadeRun();
  spendPocket(run);
  assert.equal(run.state.played, 100);
  assert.equal(run.state.phase, 'settling');
  assert.equal(run.spendCoin(), false);
  run.tick(FINAL_PUSH_SECONDS - 0.01, false);
  assert.equal(run.state.phase, 'settling');
  run.collectCoin();
  assert.equal(run.state.phase, 'playing');
  assert.equal(run.state.balance, 1);
  assert.equal(run.state.score, 1);
  assert.equal(run.spendCoin(), true);
  run.tick(FINAL_PUSH_SECONDS, false);
  assert.equal(run.state.phase, 'over');
});

test('a shark-released jackpot restores an empty pocket during the final push', () => {
  const run = new ArcadeRun();
  run.collectGem(); run.collectGem();
  spendPocket(run);
  run.tick(80, true);
  assert.equal(run.state.phase, 'settling');
  assert.equal(run.collectGem(), 600);
  assert.equal(run.state.balance, 600);
  assert.equal(run.state.phase, 'playing');
  assert.equal(run.state.finalPushRemaining, 0);
  run.tick(FINAL_PUSH_SECONDS, false);
  assert.equal(run.state.phase, 'playing');
  assert.equal(run.state.score, 600);
  assert.equal(run.spendCoin(), true);
  assert.equal(run.state.balance, 599);
});

test('tilt can exhaust the pocket and game over freezes the final score', () => {
  const run = new ArcadeRun();
  for (let i = 0; i < 97; i++) run.spendCoin();
  assert.equal(run.penalize(10), 3);
  assert.equal(run.state.balance, 0);
  run.tick(FINAL_PUSH_SECONDS, false);
  const final = { ...run.state };
  assert.equal(run.collectCoin(), false);
  assert.equal(run.collectGem(), 0);
  assert.equal(run.spendCoin(), false);
  assert.equal(run.penalize(10), 0);
  run.tick(100, false);
  assert.deepEqual(run.state, final);
});

test('new runs keep only the personal best and start with a fresh pocket and score', () => {
  const previous = new ArcadeRun();
  previous.spendCoin();
  previous.collectGem(); previous.collectGem(); previous.collectGem();
  const fresh = new ArcadeRun(previous.state.bestScore);
  assert.equal(fresh.state.bestScore, 501);
  assert.equal(fresh.state.balance, 100);
  assert.equal(fresh.state.score, 0);
  assert.equal(fresh.state.played, 0);
  assert.equal(fresh.state.gems, 0);
  assert.equal(fresh.state.jackpotCoinsWon, 0);
  assert.equal(fresh.state.lastJackpot, 0);
  assert.equal(new ArcadeRun(Infinity).state.bestScore, 0);
  assert.equal(new ArcadeRun(-3).state.bestScore, 0);
});
