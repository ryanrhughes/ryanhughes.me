import { test, expect, type Page } from '@playwright/test';

async function state(page: Page) {
  return page.evaluate(() => (window as any).__arcade.getState());
}

test('a finite scored run ends, locks its score, and restarts with a saved best', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 800, height: 600 });
  await page.addInitScript(() => {
    // Run the actual fixed-step simulation quickly. Rendering every 60th frame
    // avoids spending the long-run check on software GPU work.
    let frame = 0;
    window.requestAnimationFrame = callback => window.setTimeout(() => callback(++frame * 50), 0);
    window.cancelAnimationFrame = window.clearTimeout.bind(window);
    for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'] as const) {
      const original = WebGL2RenderingContext.prototype[method];
      (WebGL2RenderingContext.prototype as any)[method] = function (...args: any[]) {
        if (frame % 60 === 0 || (window as any).__renderEveryFrame) return (original as any).apply(this, args);
      };
    }
    let seed = 1947;
    Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
  });
  await page.goto('/');
  await expect(page.locator('#loading')).toHaveClass('loaded');
  const initial = await state(page);
  let lastReport = 0;
  await expect.poll(async () => {
    const current = await state(page);
    if (current.played >= lastReport + 100) {
      lastReport = current.played;
      console.info(`Run: ${current.played} drops, ${current.balance} coins left, ${current.score} points`);
    }
    // Only earned jackpots can add spending coins beyond the original supply.
    expect(current.balance + current.coinCount).toBeLessThanOrEqual(100 + initial.coinCount + current.jackpotCoinsWon);
    if (current.phase === 'playing' && !current.autoDrop) await page.locator('#auto').click();
    return current.phase;
  }, { timeout: 540_000, intervals: [1000] }).toBe('over');
  const ended = await state(page);
  console.info(`Finished: ${ended.played} drops, ${ended.won} coins returned, ${ended.score} points`);
  expect(ended.balance).toBe(0);
  expect(ended.played).toBeGreaterThanOrEqual(100);
  expect(ended.score).toBeGreaterThan(0);
  expect(ended.bestScore).toBe(ended.score);
  await expect(page.locator('#run-status')).toContainText('RUN OVER');
  await expect(page.locator('#auto')).toBeDisabled();
  await expect(page.locator('#drop')).toContainText('PLAY AGAIN');
  await page.keyboard.press('KeyN');
  await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true })));
  await page.waitForTimeout(300);
  expect((await state(page)).score).toBe(ended.score);
  expect((await state(page)).played).toBe(ended.played);
  await page.evaluate(() => { (window as any).__renderEveryFrame = true; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'artifacts/run-over.png', fullPage: true });
  await Promise.all([page.waitForEvent('load'), page.locator('#drop').click()]);
  await expect(page.locator('#loading')).toHaveClass('loaded');
  const fresh = await state(page);
  expect(fresh.balance).toBe(100);
  expect(fresh.score).toBe(0);
  expect(fresh.played).toBe(0);
  expect(fresh.phase).toBe('playing');
  expect(fresh.bestScore).toBe(ended.score);
});

test('coins bounce through moving pegs toward a single treasure cup', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#loading')).toHaveClass('loaded');
  const before = await state(page);
  expect(before.coinCount).toBeGreaterThan(100);

  await page.locator('#drop').click();
  await expect.poll(async () => (await state(page)).played).toBe(1);
  const released = await state(page);
  expect(released.coins.at(-1).position.y).toBeGreaterThan(3);
  expect(released.coins.at(-1).velocity.y).toBeLessThan(0);
  expect(released.bonusHits).toBe(0);
  await expect.poll(async () => (await state(page)).coins.at(-1).position.y).toBeLessThan(2.8);
  expect((await state(page)).pusherZ).not.toBe(before.pusherZ);

  // The chute sweeps without input; manual aiming controls no longer exist.
  await expect(page.locator('input[type="range"]')).toHaveCount(0);
  await expect(page.getByRole('meter')).toHaveCount(0);
  await expect(page.locator('#drop-marker')).toHaveCount(0);
  expect((await state(page)).aim).not.toBe(before.aim);

  await page.locator('#auto').click();
  await expect(page.locator('#auto')).toHaveAttribute('aria-checked', 'true');
  expect(before.plinko.cups.map((cup: any) => cup.prize)).toEqual(['gem']);
  await expect.poll(async () => (await state(page)).plinko.landings.length, { timeout: 120_000 }).toBeGreaterThanOrEqual(18);
  await page.locator('#auto').click();
  const finished = await state(page);
  expect(finished.balance).toBe(100 - finished.played + finished.won);
  expect(finished.score).toBeGreaterThanOrEqual(finished.won);
  expect(finished.plinko.pegHits).toBeGreaterThan(18);
  expect(finished.plinko.misses).toBeGreaterThan(0);
  const awarded = finished.plinko.landings.filter((landing: any) => landing.prize !== null);
  expect(awarded.length).toBe(finished.bonusHits);
  // A lucky straight fall between pegs may still land legitimately in a cup.
  expect(awarded.every((landing: any) => landing.floorContact && landing.y < 3.4)).toBe(true);
  const drops = finished.recentDrops;
  expect(drops.slice(1).every((drop: any, i: number) => drop.time - drops[i].time >= 0.8 - 0.00001)).toBe(true);
  expect(Math.max(...drops.map((d: any) => d.x)) - Math.min(...drops.map((d: any) => d.x))).toBeGreaterThan(3);
  const exits = finished.plinko.landings.map((landing: any) => landing.exitX);
  expect(Math.max(...exits) - Math.min(...exits)).toBeGreaterThan(1);
  expect(finished.plinko.movingRows).not.toEqual(before.plinko.movingRows);
  expect(finished.plinko.cups[0].x).not.toBe(before.plinko.cups[0].x);
  expect(finished.coinCount).toBeLessThanOrEqual(420);
  expect(finished.coins.every((coin: any) => Number.isFinite(coin.position.y) && coin.position.y > -0.5)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'artifacts/reef-playing.png', fullPage: true });
});

test('fish swim and a visiting shark physically bumps the pile without triggering tilt', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#loading')).toHaveClass('loaded');
  const before = await state(page);
  expect(before.ocean.fishCount).toBe(11);
  await page.locator('#drop').click();
  await expect.poll(async () => (await state(page)).ocean.elapsed - before.ocean.elapsed).toBeGreaterThan(0.5);
  expect((await state(page)).ocean.fishPositions).not.toEqual(before.ocean.fishPositions);
  await expect.poll(async () => (await state(page)).ocean.sharkPhase, { timeout: 100_000 }).toBe('approaching');
  await expect.poll(async () => (await state(page)).ocean.sharkPosition[0]).toBeLessThan(6.7);
  await page.screenshot({ path: 'artifacts/shark-approach.png', fullPage: true });
  await expect.poll(async () => (await state(page)).ocean.bumps).toBe(1);
  const bumped = await state(page);
  expect(bumped.lastSharkImpact.coinsAffected).toBeGreaterThan(60);
  expect(bumped.lastSharkImpact.impulse).toBeGreaterThan(0);
  expect(bumped.tilt).toBe(0);
  await expect(page.locator('#drop')).toBeEnabled();
  await page.screenshot({ path: 'artifacts/shark-impact.png', fullPage: true });
  await expect.poll(async () => (await state(page)).ocean.sharkPhase).toBe('away');
  const after = await state(page);
  expect(after.ocean.sharkVisible).toBe(false);
  expect(after.ocean.nextVisitIn).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});

test('nudge has a real effect, tilt blocks drops then recovers, and help pauses play', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading')).toHaveClass('loaded');
  await page.locator('#drop').click();
  await page.keyboard.press('KeyN');
  await expect(page.locator('#event-toast')).toContainText('Who, me?');
  const firstNudge = await state(page);
  expect(firstNudge.coins.some((coin: any) => coin.velocity.y > 0.2)).toBe(true);
  await expect.poll(async () => (await state(page)).time - firstNudge.time).toBeGreaterThan(0.4);
  await page.keyboard.press('KeyN');
  await expect(page.locator('#event-toast')).toContainText('attendant');
  const secondNudge = await state(page);
  await expect.poll(async () => (await state(page)).time - secondNudge.time).toBeGreaterThan(0.4);
  await page.locator('#nudge').click();
  await expect(page.locator('#tilt-overlay')).toHaveClass('tilt-overlay active');
  await expect(page.locator('#drop')).toBeDisabled();
  const tilted = await state(page);
  expect(tilted.balance + tilted.played - tilted.won).toBe(90);
  await expect(page.locator('#event-toast')).toContainText('−10 COINS');
  await page.keyboard.press('Space');
  expect((await state(page)).played).toBe(tilted.played);
  await expect(page.locator('#drop')).toBeEnabled({ timeout: 30_000 });
  await page.locator('#drop').click();
  expect((await state(page)).played).toBe(tilted.played + 1);

  await page.locator('#help-top').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  const paused = await state(page);
  expect(paused.paused).toBe(true);
  await page.waitForTimeout(500);
  expect((await state(page)).time).toBe(paused.time);
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).not.toBeVisible();
  await expect.poll(async () => (await state(page)).paused).toBe(false);

  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-label', 'Enable sound');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-label', 'Mute sound');
  await page.locator('#camera').click();
  expect((await state(page)).cameraMode).toBe(1);
  await page.locator('#fullscreen').click();
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-label', 'Exit fullscreen');
  await expect(page.locator('#mobile-drop')).toBeVisible();
  const beforeFullscreenDrop = (await state(page)).played;
  await page.locator('#mobile-drop').click();
  expect((await state(page)).played).toBe(beforeFullscreenDrop + 1);
  await page.locator('#fullscreen').click();
  await expect(page.locator('#fullscreen')).toHaveAttribute('aria-label', 'Enter fullscreen');
  await expect(page.locator('#refill')).toHaveCount(0);
  await Promise.all([page.waitForEvent('load'), page.locator('#new-run').click()]);
  await expect(page.locator('#loading')).toHaveClass('loaded');
  const fresh = await state(page);
  expect(fresh.balance).toBe(100);
  expect(fresh.score).toBe(0);
  expect(fresh.played).toBe(0);
});

test('the cabinet fits a phone and timed drops work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#loading')).toHaveClass('loaded');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const before = await state(page);
  await page.locator('#mobile-drop').click();
  expect((await state(page)).played).toBe(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('#mobile-ready')).toContainText('RELOAD');
  await expect(page.locator('#mobile-drop')).toBeEnabled();
  expect((await state(page)).aim).not.toBe(before.aim);
  await expect(page.locator('#drop-marker')).toHaveCount(0);
  await page.locator('#mobile-drop').click();
  expect((await state(page)).played).toBe(2);
  await page.locator('#nudge').click();
  const bounds = await page.evaluate(() => ({toast: document.querySelector('#event-toast')!.getBoundingClientRect().toJSON(), canvas: document.querySelector('#game-canvas')!.getBoundingClientRect().toJSON()}));
  expect(bounds.toast.bottom).toBeLessThanOrEqual(bounds.canvas.top);
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
});


test('rapid clicks, keyboard presses and toggling auto-drop share the same reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading')).toHaveClass('loaded');
  await page.evaluate(() => {
    for (let i = 0; i < 30; i++) {
      document.querySelector<HTMLButtonElement>('#drop')!.click();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      document.querySelector<HTMLButtonElement>('#auto')!.click();
    }
  });
  expect((await state(page)).played).toBe(1);
  await expect(page.locator('#drop')).toBeEnabled();
  await page.locator('#drop').click();
  const after = await state(page);
  expect(after.played).toBe(2);
  expect(after.recentDrops[1].time - after.recentDrops[0].time).toBeGreaterThanOrEqual(0.8 - 0.00001);
  await page.locator('#nudge').click();
  await expect(page.locator('#event-toast')).toHaveClass(/visible/);
  let bounds = await page.evaluate(() => ({toast: document.querySelector('#event-toast')!.getBoundingClientRect().toJSON(), canvas: document.querySelector('#game-canvas')!.getBoundingClientRect().toJSON()}));
  expect(bounds.toast.bottom).toBeLessThanOrEqual(bounds.canvas.top);
  await page.screenshot({ path: 'artifacts/alerts-desktop.png', fullPage: true });
  await page.locator('#fullscreen').click();
  bounds = await page.evaluate(() => ({toast: document.querySelector('#event-toast')!.getBoundingClientRect().toJSON(), canvas: document.querySelector('#game-canvas')!.getBoundingClientRect().toJSON()}));
  expect(bounds.toast.bottom).toBeLessThanOrEqual(bounds.canvas.top);
});
