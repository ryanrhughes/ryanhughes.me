# Deep Sea Gold Rush

A playable 3D arcade coin pusher, built with TypeScript, Three.js, and Rapier rigid-body physics. Original underwater cabinet artwork is drawn procedurally; audio is synthesized with Web Audio.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` type-checks and builds the production app; `npm run preview` serves that build.

## Playing

- The chute sweeps automatically along the pegboard rail. Its brass coin slot holds a visible token, with mint lamps when ready and amber lamps during reload. Time your drop as the slot moves; aiming is not manually adjustable.
- Click **Drop a coin** or press **Space**. Every control shares a minimum 0.8-second reload. Auto-drop releases a coin every 0.9 seconds while the chute keeps moving.
- Each run starts with **100 coins and zero points**. Every coin is a cylindrical rigid body. Coins falling over the front edge return **one coin and one point**; side gutters lose the coin. There are no coin multipliers.
- Coins bounce through the Reef Drop pegboard, with two independently sliding peg rows and **one small moving treasure cup**. There are no side bonus cups. Actual contact inside the cup latches one visible coin until a shark bump releases it and awards one gem; player nudges cannot release it. Three gems pay the **full displayed jackpot into your pocket**, plus the same amount in score, starting at 500 coins and increasing by one per drop. The meter resets to 500 only after paying the earned amount. A receipt below the gem tracker keeps the last payout visible. A jackpot earned during the final push restores the pocket and lets the run continue. Misses and released treasure coins continue onto the pusher.
- Press **N**, or click the loose bolt in the cabinet's lower-left corner, to nudge. Three nudges within seven seconds cost 10 coins (or the remaining balance if less) and trigger a five-second tilt lockout. The second nudge warns you about the charge.
- Eleven fish swim around the cabinet. A shark first visits after about 20–25 seconds, bumps the cabinet, and swims away. Later visits are spaced roughly 45–65 seconds apart. Shark bumps move the real coin pile without counting toward tilt.
- **M** toggles sound. The camera button cycles three viewing angles. Fullscreen expands the cabinet.
- At zero coins, a **10-second final push** gives in-flight coins and the bed time to return a coin. A held treasure waits for the next shark, then gets the full final push. Any returned coin lets you continue. Otherwise the run ends and its score freezes. Nudging is disabled during the final push.
- **New run / Play again** resets the cabinet, pocket, score, gems, and jackpot. There are no free refills within a run; an earned jackpot can replenish your pocket. Your personal best is saved locally in this browser; unavailable browser storage does not block play. There is no real money or wagering.

The guide board constrains tokens to an upright plane and uses their circular cross-sections for stable contact physics. Tokens retain their mass and regain full cylinder collisions and all rotation/translation axes when the cup ejects them onto the bed. The treasure token stays physically latched until a shark release. Alerts sit in a reserved strip outside the 3D canvas on desktop, mobile, and fullscreen.

The simulation pauses while help is open or the browser tab is hidden. The fixed 60 Hz physics step uses continuous collision detection and limits catch-up after slow frames. Refreshing starts a new run and preserves the personal best when browser storage is available.

## Browser requirements

A current browser with WebGL 2 and WebAssembly. Audio starts after the first player interaction. A graphics-capable device is recommended for the best frame rate.

## Validation

Run `npm test` for ten isolated physics and scoring regressions plus six browser interaction checks, including a complete run through game over and restart. `npm run test:physics` runs just the physics checks, without a browser. The tests use Playwright Chromium; install it with `npx playwright install chromium` if needed. Set `CHROMIUM_PATH` to use an existing Chromium executable.
