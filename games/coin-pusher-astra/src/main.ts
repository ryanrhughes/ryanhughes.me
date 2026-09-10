import { createIcons, ArrowUpRight, ArrowRight, AudioLines, Bolt, Box, CircleDollarSign, CircleHelp, Gem, Maximize, RotateCcw, GitFork, Sparkles, TriangleAlert, View, Volume2, VolumeX, X } from 'lucide';
import { CoinPusher, TILT_COST, type GameState } from './game';
import { BEST_SCORE_KEY, STARTING_COINS } from './run';
import './style.css';

const icon = (name: string, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
const icons = { ArrowUpRight, ArrowRight, AudioLines, Bolt, Box, CircleDollarSign, CircleHelp, Gem, Maximize, RotateCcw, GitFork, Sparkles, TriangleAlert, View, Volume2, VolumeX, X };

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Pocket Arcade home"><span class="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3v34M3 20h34M8 8l24 24M8 32 32 8" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg></span><span>pocket<span class="brand-light">arcade</span><span class="brand-dot">®</span></span></a>
      <nav aria-label="Main navigation"><span class="nav-active">THE ARCADE<span></span></span><button class="text-button" id="help-top">HOW TO PLAY ${icon('arrow-up-right')}</button></nav>
      <div class="header-right"><span class="free-play"><span></span> ALWAYS FREE TO PLAY</span><button id="sound" class="icon-button" aria-label="Mute sound" title="Toggle sound (M)">${icon('volume-2')}</button></div>
    </header>

    <main>
      <div class="game-heading">
        <div><div class="eyebrow"><span class="small-star">✦</span> POCKET ORIGINAL <span class="edition">NO. 001</span></div><h1>DEEP SEA <span>GOLD RUSH</span><span class="heading-star">✧</span></h1></div>
        <p>A little timing. A little luck.<br>A whole lot of treasure.</p>
      </div>

      <div class="game-layout">
        <section class="game-stage" aria-label="Interactive 3D coin pusher">
          <div class="stage-top"><span class="live-label"><span></span> LIVE FROM THE OCEAN FLOOR</span><div class="stage-tools"><button id="camera" class="icon-button" aria-label="Change camera angle" title="Change camera angle">${icon('view')}</button><button id="fullscreen" class="icon-button" aria-label="Enter fullscreen" title="Fullscreen">${icon('maximize')}</button></div></div>
          <div id="game-canvas"></div>
          <div id="loading"><span class="loading-coin">✦</span><p>Polishing the treasure…</p><span>LOADING YOUR ARCADE</span></div>
          <div class="stage-jackpot"><span>JACKPOT COINS</span><div>${icon('gem')}<strong id="jackpot">500</strong></div></div>
          <div class="stage-notices"><div id="event-toast" role="status" aria-live="polite"></div></div>
          <div class="tilt-overlay" id="tilt-overlay"><span>${icon('triangle-alert')} TILT!</span><p>Easy, captain. Let the machine settle.</p><strong id="tilt-countdown">5</strong></div>
          <div class="stage-bottom"><button id="nudge" class="loose-screw" aria-label="Nudge the machine" title="This panel feels a little loose… (N)">${icon('bolt')}</button><div class="play-hint"><span>Time the moving chute</span><i></i><span><kbd>SPACE</kbd> drop</span></div><span class="touch-hint">TIME YOUR DROP AS THE CHUTE MOVES</span><span class="view-label">${icon('box')} REAL 3D</span></div>
          <div class="win-floats" id="win-floats" aria-hidden="true"></div>
        </section>

        <aside class="controls" aria-label="Game controls">
          <section class="session-panel">
            <div class="panel-heading"><span>YOUR POCKET</span><span class="session-live">${STARTING_COINS} COIN RUN</span></div>
            <div class="bank"><span class="coin-icon"><span>✦</span></span><span id="balance">100</span><span class="bank-unit">coins</span></div>
            <div class="session-stats"><div><span>SCORE</span><strong>${icon('sparkles')} <span id="score">0</span></strong></div><div><span>PERSONAL BEST</span><strong id="best-score">0</strong></div></div>
            <p class="run-totals"><span id="played">0</span> drops · <span id="won">0</span> coins collected</p>
            <p id="run-status" class="run-status" role="status" hidden></p>
            <button class="drop-button" id="drop" disabled><span>${icon('circle-dollar-sign')} <span id="drop-label">DROP A COIN</span></span><span class="drop-cost">−1</span></button>
            <p class="drop-status" id="drop-status">CHUTE MOVES AUTOMATICALLY · READY</p><div class="auto-row"><span>Keep the coins coming</span><button class="toggle" id="auto" role="switch" aria-checked="false" aria-label="Auto drop"><span></span></button></div>
          </section>

          <section class="bonus-panel">
            <div class="bonus-heading"><span class="bonus-icon">${icon('git-fork')}</span><div><h2>THE JACKPOT HUNT</h2><p>One small cup. Make your timing count.</p></div></div>
            <div class="jackpot-rule"><span class="prize-dot coral">${icon('gem')}</span><span>3 GEMS = JACKPOT COINS</span></div>
            <div class="treasure-progress"><div><span>DEEP SEA TREASURE</span><span><strong id="gems">0</strong> / 3</span></div><div class="gem-slots"><span>${icon('gem')}</span><span>${icon('gem')}</span><span>${icon('gem')}</span></div><p>Find 3 gems. One per shark bump.</p><p id="treasure-status">Treasure cup warming up…</p><p id="last-jackpot" hidden></p></div>
          </section>
          <button class="help-link" id="help-bottom">${icon('circle-help')} First time at the machine? <span>How to play ${icon('arrow-up-right')}</span></button>
        </aside>
      </div>

      <footer class="game-footer"><div>${icon('audio-lines')} <span>REAL PHYSICS. REAL SATISFACTION.</span></div><p><a href="/blog/building-a-coin-pusher-with-astra/">Built with Astra. Read the story ↗</a></p><button id="new-run">${icon('rotate-ccw')} New run</button></footer>
    </main>
    <div class="site-bottom"><span>GOOD TIMES, SMALL CHANGE.</span><span>MADE FOR YOUR INNER ARCADE KID <span>✳︎</span></span></div>
  </div>

  <div class="mobile-dock" aria-label="Quick play controls"><span class="mobile-pocket">${icon('circle-dollar-sign')}<strong id="mobile-balance">100</strong></span><span class="mobile-ready" id="mobile-ready">READY</span><button id="mobile-drop" class="drop-button" disabled><span id="mobile-drop-label">DROP A COIN</span><span class="drop-cost">−1</span></button></div>

  <dialog id="help-dialog">
    <button id="close-help" class="icon-button modal-close" aria-label="Close instructions">${icon('x')}</button>
    <div class="eyebrow">WELCOME ABOARD, CAPTAIN</div><h2>LET'S MAKE<br><span>SOME WAVES.</span></h2><p class="modal-intro">Your favorite seaside arcade, right in your browser.</p>
    <ol class="instructions"><li><span>01</span><div><h3>Time the moving chute.</h3><p>The chute sweeps from side to side on its own. Watch its position, then press <kbd>SPACE</kbd> or Drop a coin. Each drop has a 0.8-second reload, including auto-drop.</p></div></li><li><span>02</span><div><h3>Time it. Drop it. Watch it.</h3><p>Press <kbd>SPACE</kbd> or Drop a coin. Every coin has real weight and collision. Each coin pushed over the front edge returns one coin to your pocket and earns one point. Side gutters lose the coin. Start with 100 coins and chase your personal best!</p></div></li><li><span>03</span><div><h3>A little Plinko. A little luck.</h3><p>Coins bounce off real pegs and two sliding rows before reaching one small moving treasure cup. Catch a coin inside to lock it in place. Only a shark bump releases it and awards the gem. It holds one coin at a time; your own nudges cannot free it. Every coin continues onto the pusher. Collect 3 gems to receive the entire displayed jackpot in your pocket, plus the same amount in points. It starts at 500 coins and grows by one per drop. After paying you, the meter resets to 500 for the next jackpot.</p></div></li><li><span>🤫</span><div><h3>A little nudge never hurt…</h3><p>Press <kbd>N</kbd> or tap the loose bolt in the bottom-left corner. Three quick nudges cost up to ${TILT_COST} coins from your pocket and trigger a 5-second tilt lockout. A visiting shark sometimes bumps the cabinet too — its nudges are free!</p></div></li></ol>
    <button class="drop-button" id="start-playing"><span>LET'S PLAY ${icon('arrow-right')}</span></button><p class="modal-note">At zero coins, the machine gets 10 seconds for a final payout. A held treasure waits for its shark first. No payout means game over. New run starts at 100 coins and zero points; your personal best is saved in this browser.</p>
  </dialog>
`;

createIcons({ icons });
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
let game: CoinPusher | undefined;
let currentState: GameState | undefined;
let toastTimeout: ReturnType<typeof setTimeout>;
let autoDrop = false;
let modalOpen = false;
let savedBest = 0;
try {
  const stored = Number(localStorage.getItem(BEST_SCORE_KEY));
  savedBest = Number.isSafeInteger(stored) && stored > 0 ? stored : 0;
} catch { /* Storage may be unavailable. */ }

function showToast(title: string, subtitle = '', type = 'normal') {
  const el = $('#event-toast');
  clearTimeout(toastTimeout);
  el.innerHTML = `<span>${title}</span>${subtitle ? `<small>${subtitle}</small>` : ''}`;
  el.className = `visible ${type}`;
  toastTimeout = setTimeout(() => el.className = '', 3300);
}

function updateState(state: GameState) {
  currentState = state;
  $('#score').textContent = state.score.toLocaleString();
  $('#best-score').textContent = state.bestScore.toLocaleString();
  if (state.bestScore > savedBest) {
    savedBest = state.bestScore;
    try { localStorage.setItem(BEST_SCORE_KEY, String(savedBest)); } catch { /* Keep playing without storage. */ }
  }
  const over = state.phase === 'over';
  const settling = state.phase === 'settling';
  const runStatus = $('#run-status');
  runStatus.hidden = state.phase === 'playing';
  runStatus.textContent = over ? `RUN OVER · ${state.score.toLocaleString()} POINTS` : state.treasureHeld ? 'FINAL CHANCE · waiting for the shark' : `FINAL PUSH · ${Math.ceil(state.finalPushRemaining)}s for a coin to return`;
  $('#drop-label').textContent = over ? 'PLAY AGAIN' : 'DROP A COIN';
  $('#mobile-drop-label').textContent = over ? 'PLAY AGAIN' : 'DROP A COIN';
  document.querySelectorAll('.drop-cost').forEach(el => { el.textContent = over ? '↻' : '−1'; });
  if (state.phase !== 'playing') autoDrop = false;
  $('#auto').setAttribute('aria-checked', String(autoDrop));
  $('#auto').toggleAttribute('disabled', state.phase !== 'playing');
  $('#nudge').toggleAttribute('disabled', state.phase !== 'playing');
  $('#balance').textContent = state.balance.toLocaleString();
  $('#mobile-balance').textContent = state.balance.toLocaleString();
  $('#won').textContent = state.won.toLocaleString();
  $('#played').textContent = state.played.toString();
  $('#jackpot').textContent = state.jackpot.toLocaleString();
  $('#last-jackpot').hidden = state.lastJackpot === 0;
  $('#last-jackpot').textContent = `LAST JACKPOT: +${state.lastJackpot.toLocaleString()} COINS PAID`;
  $('#gems').textContent = state.gems.toString();
  $('#treasure-status').textContent = state.treasureHeld ? 'COIN HELD — waiting for a shark bump' : 'Catch a coin. Let the shark free your gem.';
  $('#treasure-status').dataset.open = String(state.treasureHeld);
  document.querySelectorAll('.gem-slots > span').forEach((el, i) => el.classList.toggle('filled', i < state.gems));
  $('#drop').toggleAttribute('disabled', !over && (state.balance < 1 || state.tilt > 0 || state.dropReadyIn > 0));
  $('#mobile-drop').toggleAttribute('disabled', !over && (state.balance < 1 || state.tilt > 0 || state.dropReadyIn > 0));
  const readyText = over ? 'RUN OVER' : settling ? 'FINAL PUSH' : state.tilt > 0 ? 'TILT' : state.dropReadyIn > 0 ? `RELOAD ${state.dropReadyIn.toFixed(1)}s` : 'READY';
  $('#drop-status').textContent = `CHUTE MOVES AUTOMATICALLY · ${readyText}`;
  $('#mobile-ready').textContent = readyText;
  $('#tilt-overlay').classList.toggle('active', state.tilt > 0);
  $('#tilt-countdown').textContent = Math.ceil(state.tilt).toString();
  $('#balance').classList.toggle('empty', state.balance < 10);
}

function drop() {
  game?.audio.unlock();
  if (currentState?.phase !== 'playing') return;
  game?.dropCoin();
}

function playButton() { if (currentState?.phase === 'over') location.reload(); else drop(); }
$('#drop').addEventListener('click', playButton);
$('#mobile-drop').addEventListener('click', playButton);
$('#nudge').addEventListener('click', () => { game?.audio.unlock(); game?.nudge(); });
$('#auto').addEventListener('click', () => {
  autoDrop = !autoDrop;
  $('#auto').setAttribute('aria-checked', String(autoDrop));
  game?.audio.unlock();
  game?.setAutoDrop(autoDrop);
});
$('#new-run').addEventListener('click', () => location.reload());
$('#camera').addEventListener('click', () => game?.cycleCamera());
$('#sound').addEventListener('click', () => {
  if (!game) return;
  game.audio.enabled = !game.audio.enabled;
  if (game.audio.enabled) game.audio.unlock();
  $('#sound').innerHTML = icon(game.audio.enabled ? 'volume-2' : 'volume-x');
  $('#sound').setAttribute('aria-label', game.audio.enabled ? 'Mute sound' : 'Enable sound');
  createIcons({ icons });
});
$('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else { await $('.game-stage').requestFullscreen(); $('#fullscreen').blur(); }
  } catch { showToast('Fullscreen unavailable', 'You can still play right here.'); }
});
document.addEventListener('fullscreenchange', () => {
  const dock = $('.mobile-dock');
  if (document.fullscreenElement) document.fullscreenElement.appendChild(dock);
  else document.body.appendChild(dock);
  $('#fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
  $('#fullscreen').setAttribute('title', document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen');
});

function openHelp() { $<HTMLDialogElement>('#help-dialog').showModal(); modalOpen = true; game?.setPaused(true); }
function closeHelp() { $<HTMLDialogElement>('#help-dialog').close(); }
$('#help-top').addEventListener('click', openHelp);
$('#help-bottom').addEventListener('click', openHelp);
$('#close-help').addEventListener('click', closeHelp);
$('#start-playing').addEventListener('click', closeHelp);
$('#help-dialog').addEventListener('close', () => { modalOpen = false; game?.setPaused(false); });
$('#help-dialog').addEventListener('click', e => { if (e.target === e.currentTarget) closeHelp(); });

window.addEventListener('keydown', event => {
  if (modalOpen || event.ctrlKey || event.metaKey || event.altKey) return;
  if ((event.target as HTMLElement).matches('input, textarea, select')) return;
  if (event.code === 'Space' && !(event.target as HTMLElement).matches('button, a')) { event.preventDefault(); if (!event.repeat) drop(); }
  if (event.code === 'KeyN' && !event.repeat) { game?.audio.unlock(); game?.nudge(); }
  if (event.code === 'KeyM' && !event.repeat) $('#sound').click();
});

async function boot() {
  try {
    game = await CoinPusher.create($('#game-canvas'), {
      onState: updateState,
      onMessage: showToast,
      onWin: (value: number) => {
        const el = document.createElement('span');
        el.textContent = `+${value}`;
        el.style.left = `${35 + Math.random() * 30}%`;
        $('#win-floats').appendChild(el);
        setTimeout(() => el.remove(), 1800);
      },
    }, savedBest);
    game.setPaused(modalOpen);
    $('#loading').classList.add('loaded');
    $('#drop').removeAttribute('disabled');
    $('#mobile-drop').removeAttribute('disabled');
    // Read-only telemetry for debugging physics and browser verification.
    Object.defineProperty(window, '__arcade', { value: { getState: () => game!.getDebugState() } });
  } catch (error) {
    console.error(error);
    $('#loading').innerHTML = '<span class="loading-coin">!</span><p>The machine needs a moment.</p><span>3D rendering could not start. Enable WebGL and reload.</span><button id="retry" class="text-button">TRY AGAIN ↗</button>';
    $('#retry').addEventListener('click', () => location.reload());
  }
}

void boot();
