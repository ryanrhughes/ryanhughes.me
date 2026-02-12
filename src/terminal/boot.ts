import { appendOutput, scrollToBottom, click, initOutput, escapeHtml, dirClick, fileClick } from './output';
import { getPromptHTML, executeCommand, initEngine, commandHistory, setHistoryIndex, updatePrompt, fs, fileContents } from './engine';
import { cmdNeofetch } from '../commands/neofetch';
import type { CommandContext } from './types';

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function typeLine(text: string, outputEl: HTMLElement, speed = 35): Promise<void> {
  const div = document.createElement('div');
  div.className = 'output-block command-echo';
  const promptHTML = getPromptHTML();
  div.innerHTML = `<span class="prompt-echo">${promptHTML}</span><span class="typing-target"></span>`;
  outputEl.appendChild(div);
  const target = div.querySelector('.typing-target')!;

  for (let i = 0; i < text.length; i++) {
    target.textContent += text[i];
    scrollToBottom();
    await sleep(speed + Math.random() * 20);
  }
  await sleep(200);
}

export async function boot() {
  const outputEl = document.getElementById('terminal-output')!;
  const inputEl = document.getElementById('terminal-input') as HTMLInputElement;
  const promptEl = document.getElementById('prompt')!;
  const inputArea = document.getElementById('input-area')!;
  const terminalEl = document.getElementById('terminal')!;

  // Initialize output system first
  initOutput(outputEl, terminalEl, executeCommand);

  // Initialize engine
  initEngine({
    input: inputEl,
    prompt: promptEl,
    inputArea,
    terminal: terminalEl,
    output: outputEl,
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const vibes = ['a mass of open browser tabs', 'the void', 'localhost', 'somewhere with wifi', '127.0.0.1'];
  const vibe = vibes[Math.floor(Math.random() * vibes.length)];

  // ASCII banner
  appendOutput(`<span class="tc-purple tc-bold"> ____                     _   _             _
|  _ \\ _   _  __ _ _ __ | | | |_   _  __ _| |__   ___  ___
| |_) | | | |/ _\` | '_ \\| |_| | | | |/ _\` | '_ \\ / _ \\/ __|
|  _ <| |_| | (_| | | | |  _  | |_| | (_| | | | |  __/\\__ \\
|_| \\_\\\\__, |\\__,_|_| |_|_| |_|\\__,_|\\__, |_| |_|\\___||___/
       |___/                          |___/</span>`);

  await sleep(400);

  // Type and run: whoami
  await typeLine('whoami', outputEl);
  commandHistory.push('whoami');
  appendOutput(`<span class="tc-accent tc-bold" style="font-size:1.1em">Ryan Hughes</span>
<span class="tc-muted">husband · builder · founder · open-source contributor · Fort Lauderdale, FL</span>`);

  await sleep(300);

  // Type and run: neofetch
  await typeLine('neofetch', outputEl);
  commandHistory.push('neofetch');

  const ctx: CommandContext = {
    cwd: '~', commandHistory, startTime: Date.now(), fs, fileContents,
    click, dirClick, fileClick, escapeHtml,
    resolvePath: (s: string) => s
  };
  appendOutput(cmdNeofetch('', ctx));

  await sleep(400);

  // MOTD
  appendOutput(`<span class="tc-muted">Last login: ${dateStr} from ${vibe}</span>

<span class="tc-white">Welcome.</span> <span class="tc-muted">Type ${click('help', 'help', 'tc-link-inline')} for commands, or just click anything highlighted.</span>
<span class="tc-muted">Try: ${click('ls', 'ls', 'tc-link-inline')}  ${click('man ryan', 'man ryan', 'tc-link-inline')}  ${click('cat resume.txt', 'cat resume.txt', 'tc-link-inline')}  ${click('cat connect/*', 'cat connect/*', 'tc-link-inline')}</span>
`);

  // Show input
  setHistoryIndex(commandHistory.length);
  updatePrompt();
  inputArea.style.display = 'flex';
  inputEl.focus();
  scrollToBottom();
}
