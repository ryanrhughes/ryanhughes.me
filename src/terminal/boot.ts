import { appendOutput, scrollToBottom, click, initOutput, escapeHtml, dirClick, fileClick } from './output';
import { getPromptHTML, executeCommand, initEngine, commandHistory, setHistoryIndex, updatePrompt, updateMobileBar, fs, fileContents, getCwd, setUrlStateCallback } from './engine';
import { cmdNeofetch } from '../commands/neofetch';
import { getBlogPosts, buildBlogReaderHtml } from '../commands/read';
import { getLatestEpisode } from './filesystem';
import { whoamiOutput } from '../commands/whoami';
import { openReader, setReaderExecuteCommand } from './reader';
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

/** Get the initial reader slug from the page data (for direct blog URLs) */
function getInitialReaderSlug(): string | null {
  const el = document.getElementById('initial-reader');
  if (el) {
    try {
      const slug = JSON.parse(el.textContent || 'null');
      return slug || null;
    } catch { return null; }
  }
  return null;
}

/** Get the initial path to restore from the page data */
function getInitialPath(): string {
  const el = document.getElementById('initial-path');
  if (el) {
    try {
      return JSON.parse(el.textContent || '""') || '';
    } catch { return ''; }
  }
  return '';
}

/** Convert a filesystem path to a URL path */
function fsPathToUrl(cwd: string, file?: string): string {
  let p = cwd === '~' ? '' : cwd.replace(/^~\/?/, '');
  if (file) {
    p = p ? `${p}/${file}` : file;
  }
  return '/' + p;
}

/** Set up URL state management — pushState on navigation, popstate for back/forward */
function initUrlState() {
  // Override executeCommand to push state after each command
  const originalExecute = executeCommand;

  // We wrap at the output level to track what changed
  // Instead, we'll use a MutationObserver on the prompt to detect cwd changes
  // and hook into specific commands

  // Listen for popstate (browser back/forward)
  window.addEventListener('popstate', (e) => {
    const state = e.state;
    if (state && state.cmd) {
      executeCommand(state.cmd, { interactive: false });
    } else {
      // Navigate to whatever the current URL says
      const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
      if (!path) {
        executeCommand('home', { interactive: false });
      } else {
        navigateToPath(path);
      }
    }
  });
}

/** Push URL state after a command executes */
export function pushUrlState(cmd: string) {
  const parts = cmd.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const args = cmd.substring(parts[0]?.length || 0).trim();

  let url: string | null = null;

  if (command === 'cat') {
    // Resolve the path to figure out the URL
    const target = args.split(/\s+/)[0];
    if (target) {
      const cwd = getCwd();
      let resolved = target;
      if (!target.startsWith('~') && !target.startsWith('/')) {
        resolved = cwd === '~' ? target : `${cwd.replace(/^~\/?/, '')}/${target}`;
      } else {
        resolved = target.replace(/^~\/?/, '');
      }
      // Clean up .txt extensions for URLs
      resolved = resolved.replace(/\.txt$/, '');
      url = '/' + resolved;
    }
  } else if (command === 'cd') {
    const cwd = getCwd();
    url = fsPathToUrl(cwd);
    if (url !== '/') url = url.replace(/\/$/, '') + '/';
  } else if (command === 'ls' || command === 'll' || command === 'lt' || command === 'tree') {
    const cwd = getCwd();
    url = fsPathToUrl(cwd);
    if (url !== '/') url = url.replace(/\/$/, '') + '/';
  } else if (command === 'home' || command === 'clear') {
    url = '/';
  }

  if (url && url !== window.location.pathname) {
    history.pushState({ cmd, url }, '', url);
  }
}

/** Navigate to a filesystem path (for deep links and popstate) */
function navigateToPath(path: string) {
  // Clean path
  const cleaned = path.replace(/^\//, '').replace(/\/$/, '');
  if (!cleaned) {
    executeCommand('home', { interactive: false });
    return;
  }

  const segments = cleaned.split('/');

  // Check if the last segment is a file (cat target)
  const fullPath = '~/' + cleaned;
  const dirPath = segments.length > 1 ? '~/' + segments.slice(0, -1).join('/') : '~';
  const fileName = segments[segments.length - 1];

  // Check variations: exact, with .txt
  const isFile = fileContents[fullPath] || fileContents[fullPath + '.txt'];
  const isDir = fs[fullPath];

  if (isFile) {
    // It's a file — cat it
    const catTarget = fileContents[fullPath] ? cleaned : cleaned + '.txt';
    executeCommand(`cat ${catTarget}`, { interactive: false });
  } else if (isDir) {
    // It's a directory — cd and ls
    executeCommand(`cd ~/${cleaned} && ls`, { interactive: false });
  } else {
    // Try treating the last segment as a file in the parent dir
    const parentPath = segments.length > 1 ? segments.slice(0, -1).join('/') : '';
    if (parentPath) {
      executeCommand(`cd ~/${parentPath} && cat ${fileName}`, { interactive: false });
    } else {
      executeCommand(`cat ${fileName}`, { interactive: false });
    }
  }
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

  // Set up URL state management
  initUrlState();
  setUrlStateCallback(pushUrlState);
  setReaderExecuteCommand(executeCommand);

  // Check for ?cmd= query parameter (from blog easter egg links)
  const urlParams = new URLSearchParams(window.location.search);
  const cmdParam = urlParams.get('cmd');

  // Check for initial reader (direct blog URL like /blog/slug)
  const initialReaderSlug = getInitialReaderSlug();

  // Check for initial deep-link path
  const initialPath = getInitialPath();
  const hasDeepLink = (initialPath && initialPath !== '/') || cmdParam || initialReaderSlug;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const vibes = ['a mass of open browser tabs', 'the void', 'localhost', 'somewhere with wifi', '127.0.0.1'];
  const vibe = vibes[Math.floor(Math.random() * vibes.length)];

  // Determine post-boot navigation command for deep links
  let postBootCmd: (() => void) | null = null;

  if (initialReaderSlug) {
    // Direct blog URL — open the reader overlay after boot
    postBootCmd = () => {
      const posts = getBlogPosts();
      const post = posts.find(p => p.slug === initialReaderSlug);
      if (post) {
        const html = buildBlogReaderHtml(post);
        openReader(post.title, html, `blog/${initialReaderSlug}`);
      }
    };
  } else if (cmdParam) {
    postBootCmd = () => executeCommand(cmdParam, { interactive: false });
  } else if (hasDeepLink) {
    postBootCmd = () => navigateToPath(initialPath);
  }

  // Full boot sequence — always play the animation
  // ASCII banner
  appendOutput(`<span class="ascii-banner tc-purple tc-bold"> ____                    _   _             _
|  _ \\ _   _  __ _ _ __ | | | |_   _  __ _| |__   ___  ___
| |_) | | | |/ _\` | '_ \\| |_| | | | |/ _\` | '_ \\ / _ \\/ __|
|  _ <| |_| | (_| | | | |  _  | |_| | (_| | | | |  __/\\__ \\
|_| \\_\\\\__, |\\__,_|_| |_|_| |_|\\__,_|\\__, |_| |_|\\___||___/
       |___/                          |___/</span>`);

  await sleep(400);

  // Type and run: whoami
  await typeLine('whoami', outputEl);
  commandHistory.push('whoami');
  const ctx: CommandContext = {
    cwd: '~', commandHistory, startTime: Date.now(), fs, fileContents,
    click, dirClick, fileClick, escapeHtml,
    resolvePath: (s: string) => s
  };
  appendOutput(whoamiOutput(ctx));

  await sleep(300);

  // Type and run: neofetch
  await typeLine('neofetch', outputEl);
  commandHistory.push('neofetch');
  appendOutput(cmdNeofetch('', ctx));

  await sleep(400);

  // MOTD
  // Lead with the newest thing — the podcast is weekly, but nothing here said so
  const latestEp = getLatestEpisode();
  const latestPost = getBlogPosts()[0];
  const whatsNew: string[] = [];
  if (latestEp) {
    whatsNew.push(
      `<span class="tc-muted">Latest episode:</span> ${click(latestEp.title.replace(/^Episode\s*\d+\s*[-–—]\s*/i, ''), `cat ~/podcast/${latestEp.slug}`, 'tc-link-inline')} <span class="tc-muted">· ${latestEp.pubDate}</span>`
    );
  }
  if (latestPost) {
    whatsNew.push(
      `<span class="tc-muted">Latest post:</span>    ${click(latestPost.title, `read ~/blog/${latestPost.slug}`, 'tc-link-inline')} <span class="tc-muted">· ${latestPost.date}</span>`
    );
  }

  appendOutput(`<span class="tc-muted">Last login: ${dateStr} from ${vibe}</span>

<span class="tc-white">Welcome.</span> <span class="tc-muted">Type ${click('help', 'help', 'tc-link-inline')} for commands, or just click anything highlighted.</span>
${whatsNew.length ? whatsNew.join('\n') + '\n' : ''}
<span class="tc-muted">Try: ${click('podcast', 'podcast', 'tc-link-inline')}  ${click('blog', 'blog', 'tc-link-inline')}  ${click('man ryan', 'man ryan', 'tc-link-inline')}  ${click('cat resume.txt', 'cat resume.txt', 'tc-link-inline')}  ${click('cat connect/*', 'cat connect/*', 'tc-link-inline')}</span>
`);

  // Show input
  setHistoryIndex(commandHistory.length);
  updatePrompt();
  inputArea.style.display = 'flex';
  inputEl.focus();
  updateMobileBar();
  scrollToBottom();

  // Navigate to deep-linked content after boot animation completes
  if (postBootCmd) {
    await sleep(200);
    postBootCmd();
    scrollToBottom();
  }
}
