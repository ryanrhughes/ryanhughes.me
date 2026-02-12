import type { CommandContext, FSTree } from './types';
import { appendOutput, appendCommandLine, clearOutput, escapeHtml, click, dirClick, fileClick, scrollToBottom } from './output';
import { buildFilesystem } from './filesystem';
import { cmdHelp } from '../commands/help';
import { cmdMan } from '../commands/man';
import { cmdNeofetch } from '../commands/neofetch';
import { cmdHtop } from '../commands/htop';
import { cmdCowsay } from '../commands/cowsay';
import { cmdHistory } from '../commands/history';
import { cmdUptime } from '../commands/uptime';
import { cmdBuiltin } from '../commands/builtins';
import { cmdOpencode } from '../commands/opencode';

// ── State ──
let cwd = '~';
let commandHistory: string[] = [];
let historyIndex = -1;
let lastCmdError = false;
const startTime = Date.now();

const { fs, fileContents } = buildFilesystem();

// ── DOM ──
let inputEl: HTMLInputElement;
let promptEl: HTMLElement;
let inputArea: HTMLElement;
let terminalEl: HTMLElement;
let outputEl: HTMLElement;

// ── Path resolution ──
function resolvePath(input: string): string {
  let p = input.trim().replace(/\/+$/, '');
  if (p === '~' || p === '') return '~';
  if (p.startsWith('~/')) return p;
  if (p.startsWith('/')) return '~' + p;
  if (cwd === '~') return '~/' + p;
  return cwd + '/' + p;
}

// ── Prompt ──
function formatPath(p: string): string {
  if (p === '~') return '~';
  const segs = p.split('/');
  if (segs.length <= 3) return segs.join('/');
  return '…/' + segs.slice(-2).join('/');
}

export function getPromptHTML(): string {
  const path = formatPath(cwd);
  const char = lastCmdError ? '✗' : '❯';
  return `<span class="prompt-path">${path}</span> <span class="prompt-char">${char}</span> `;
}

function updatePrompt() {
  promptEl.innerHTML = getPromptHTML();
}

// ── Context builder ──
function getContext(): CommandContext {
  return {
    cwd, commandHistory, startTime, fs, fileContents,
    click, dirClick, fileClick, escapeHtml, resolvePath
  };
}

// ── FS commands (inline since they mutate cwd) ──
function parseLsArgs(args: string): { flags: string; path: string } {
  const tokens = args.trim().split(/\s+/).filter(Boolean);
  let flags = '';
  let path = '';
  for (const t of tokens) {
    if (t.startsWith('-')) flags += t.slice(1);
    else path = t;
  }
  return { flags, path };
}

function fakeSize(): string {
  const sizes = ['512', '1.2k', '2.4k', '3.8k', '4.1k', '768', '1.9k', '640', '2.1k', '1.5k'];
  return sizes[Math.floor(Math.random() * sizes.length)];
}

function fakeDate(): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = months[Math.floor(Math.random() * 12)];
  const d = String(Math.floor(Math.random() * 28) + 1).padStart(2, ' ');
  const h = String(Math.floor(Math.random() * 24)).padStart(2, '0');
  const min = String(Math.floor(Math.random() * 60)).padStart(2, '0');
  return `${d} ${m} ${h}:${min}`;
}

function cmdLs(args: string, forceAll = false): string {
  const { flags, path } = parseLsArgs(args);
  const hasA = forceAll || flags.includes('a');
  const hasL = forceAll || flags.includes('l');
  const target = path || cwd;
  const resolved = resolvePath(target);

  if (!fs[resolved]) {
    lastCmdError = true;
    return `<span class="tc-red">ls: cannot access '${escapeHtml(path || '.')}': No such file or directory</span>`;
  }

  const entries = fs[resolved];

  if (!hasL) {
    // Simple mode
    const parts: string[] = [];
    if (hasA) parts.push('<span class="tc-muted">.  ..</span>');
    for (const [name, info] of Object.entries(entries)) {
      if (name === '_type') continue;
      if (name.startsWith('.') && !hasA) continue;
      if ((info as any)._type === 'dir') {
        parts.push(dirClick(name, resolved === '~' ? name : resolved + '/' + name));
      } else {
        parts.push(fileClick(name, resolved === '~' ? name : resolved + '/' + name, (info as any).icon));
      }
    }
    return parts.join('  ');
  }

  // Long format — fixed-width columns
  // Col layout (visible chars):
  //   Perms(10) ' ' Size(5) ' ' User(4) ' ' Date(12) ' ' Name
  const lines: string[] = [];
  // Columns: perms(10) gap(2) size(4) gap(2) user(4) gap(2) date(12) gap(2) name
  // Total before Name = 38
  const header = `<span class="tc-muted">Perms       Size  User  Modified      Name</span>`;
  lines.push(header);

  const colorPerms = (perms: string): string => {
    return perms.split('').map(c => {
      switch (c) {
        case 'd': return '<span class="tc-blue">d</span>';
        case 'r': return '<span class="tc-yellow">r</span>';
        case 'w': return '<span class="tc-red">w</span>';
        case 'x': return '<span class="tc-green">x</span>';
        default:  return '<span class="tc-muted">-</span>';
      }
    }).join('');
  };

  const makeLine = (perms: string, size: string, name: string) => {
    const p = colorPerms(perms);
    const s = size.padStart(4);
    const d = fakeDate();
    // perms(10) + 2 + size(4 right-aligned) + 2 + user(4) + 2 + date(12) + 2 + name
    return `${p}  ${s}  <span class="tc-yellow">ryan</span>  ${d}  ${name}`;
  };

  if (hasA) {
    lines.push(makeLine('drwxr-xr-x', '-', '<span class="tc-icon tc-dir-icon">\uf07b</span> <span class="tc-muted">.</span>'));
    lines.push(makeLine('drwxr-xr-x', '-', '<span class="tc-icon tc-dir-icon">\uf07b</span> <span class="tc-muted">..</span>'));
  }

  for (const [name, info] of Object.entries(entries)) {
    if (name === '_type') continue;
    if (name.startsWith('.') && !hasA) continue;
    const isDir = (info as any)._type === 'dir';
    const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
    const size = isDir ? '-' : fakeSize();
    const fullPath = resolved === '~' ? name : resolved + '/' + name;
    const display = isDir ? dirClick(name, fullPath) : fileClick(name, fullPath, (info as any).icon);
    lines.push(makeLine(perms, size, display));
  }

  return lines.join('\n');
}

function cmdTree(args: string): string {
  const target = args.trim() || cwd;
  const resolved = resolvePath(target);

  if (!fs[resolved]) {
    lastCmdError = true;
    return `<span class="tc-red">tree: ${escapeHtml(target)}: No such directory</span>`;
  }

  const lines: string[] = [`<span class="tc-dir">${escapeHtml(resolved)}</span>`];

  function walk(dirPath: string, prefix: string) {
    const entries = fs[dirPath];
    if (!entries) return;
    const items = Object.entries(entries).filter(([k]) => k !== '_type');
    items.forEach(([name, info], i) => {
      const isLast = i === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const fullPath = dirPath === '~' ? `~/${name}` : `${dirPath}/${name}`;
      const isDir = (info as any)._type === 'dir';

      if (isDir) {
        lines.push(`<span class="tc-muted">${prefix}${connector}</span>${dirClick(name, fullPath)}`);
        walk(fullPath, prefix + (isLast ? '    ' : '│   '));
      } else {
        lines.push(`<span class="tc-muted">${prefix}${connector}</span>${fileClick(name, fullPath, (info as any).icon)}`);
      }
    });
  }

  walk(resolved, '');

  const dirs = Object.values(fs).length;
  const files = Object.keys(fileContents).length;
  lines.push('');
  lines.push(`<span class="tc-muted">${dirs} directories, ${files} files</span>`);

  return lines.join('\n');
}

function cmdCd(args: string): string {
  const target = args.trim();
  if (!target || target === '~' || target === '/home/ryan') {
    cwd = '~'; updatePrompt(); return '';
  }
  if (target === '..') {
    if (cwd !== '~') {
      const parts = cwd.split('/');
      parts.pop();
      cwd = parts.join('/') || '~';
    }
    updatePrompt(); return '';
  }
  if (target === '.') return '';

  const resolved = resolvePath(target);
  if (fs[resolved]) {
    cwd = resolved; updatePrompt(); return '';
  }

  lastCmdError = true;
  return `<span class="tc-red">cd: no such directory: ${escapeHtml(target)}</span>`;
}

function cmdCat(args: string): string {
  const target = args.trim();
  if (!target) { lastCmdError = true; return `<span class="tc-red">cat: missing file operand</span>`; }

  if (target.endsWith('/*')) {
    const dirPart = target.slice(0, -2);
    const resolved = resolvePath(dirPart);
    if (fs[resolved]) {
      const parts: string[] = [];
      for (const [name, info] of Object.entries(fs[resolved])) {
        if (name === '_type') continue;
        const fullPath = resolved + '/' + name;
        if ((info as any)._type !== 'dir' && fileContents[fullPath]) {
          parts.push(fileContents[fullPath]);
        }
      }
      if (parts.length > 0) return parts.join('\n\n');
    }
    lastCmdError = true;
    return `<span class="tc-red">cat: ${escapeHtml(target)}: No such file or directory</span>`;
  }

  const resolved = resolvePath(target);

  if (fs[resolved]) {
    const entries = fs[resolved];
    const parts: string[] = [`<span class="tc-muted">${escapeHtml(resolved)}/</span>\n`];
    for (const [name, info] of Object.entries(entries)) {
      if (name === '_type') continue;
      const fullPath = resolved + '/' + name;
      if ((info as any)._type === 'dir') {
        parts.push('  ' + dirClick(name, fullPath));
      } else {
        parts.push('  ' + fileClick(name, fullPath, (info as any).icon));
      }
    }
    return parts.join('\n');
  }

  if (fileContents[resolved]) return fileContents[resolved];

  lastCmdError = true;
  return `<span class="tc-red">cat: ${escapeHtml(target)}: No such file or directory</span>`;
}

function cmdOpen(args: string): string {
  const target = args.trim();
  const resolved = resolvePath(target);
  const dirPath = resolved.substring(0, resolved.lastIndexOf('/'));
  const fileName = resolved.substring(resolved.lastIndexOf('/') + 1);

  if (fs[dirPath] && fs[dirPath][fileName]?.url) {
    const url = fs[dirPath][fileName].url;
    window.open(url, '_blank');
    return `<span class="tc-green">Opening ${escapeHtml(url)}...</span>`;
  }
  return cmdCat(args);
}

// ── Single command dispatch ──
function executeSingle(command: string, args: string, ctx: CommandContext): string {
  switch (command) {
    case 'help': return cmdHelp(args, ctx);
    case 'ls': return cmdLs(args);
    case 'll': return cmdLs(args, true);
    case 'lt': return cmdTree(args);
    case 'tree': return cmdTree(args);
    case 'opencode': case 'c': return cmdOpencode(args, ctx);
    case 'cd': return cmdCd(args);
    case 'cat': return cmdCat(args);
    case 'open': return cmdOpen(args);
    case 'man': {
      const result = cmdMan(args, ctx);
      if (result.error) lastCmdError = true;
      return result.output;
    }
    case 'neofetch': return cmdNeofetch(args, ctx);
    case 'htop': return cmdHtop(args, ctx);
    case 'history': return cmdHistory(args, ctx);
    case 'uptime': return cmdUptime(args, ctx);
    case 'cowsay': return cmdCowsay(args, ctx);
    case 'clear': clearOutput(); return '';
    default: {
      const builtin = cmdBuiltin(command, args, ctx);
      if (builtin) {
        if (builtin.error) lastCmdError = true;
        return builtin.output;
      }
      lastCmdError = true;
      const responses = [
        `<span class="tc-red">Unknown command: ${escapeHtml(command)}</span>`,
        `<span class="tc-red">Unknown command: ${escapeHtml(command)}.</span> <span class="tc-muted">Try ${click('help', 'help', 'tc-link-inline')}</span>`,
        `<span class="tc-red">${escapeHtml(command)}? Never heard of her.</span>`,
      ];
      return responses[commandHistory.length % responses.length];
    }
  }
}

// ── Execute command ──
export function executeCommand(raw: string) {
  const cmd = raw.trim();
  if (!cmd) return;

  // Support && chaining
  if (cmd.includes('&&')) {
    const cmds = cmd.split('&&').map(c => c.trim()).filter(Boolean);
    appendCommandLine(getPromptHTML(), cmd);
    commandHistory.push(cmd);
    historyIndex = commandHistory.length;
    for (const sub of cmds) {
      lastCmdError = false;
      const subParts = sub.split(/\s+/);
      const subCmd = subParts[0].toLowerCase();
      const subArgs = sub.substring(subParts[0].length).trim();
      const ctx = getContext();
      let output = executeSingle(subCmd, subArgs, ctx);
      if (output) appendOutput(output);
      if (lastCmdError) break;
    }
    updatePrompt();
    inputEl.value = '';
    resizeInput();
    inputEl.focus();
    return;
  }

  lastCmdError = false;
  appendCommandLine(getPromptHTML(), cmd);
  commandHistory.push(cmd);
  historyIndex = commandHistory.length;

  const parts = cmd.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = cmd.substring(parts[0].length).trim();
  const ctx = getContext();

  // Dramatic rm -rf animation
  if (command === 'rm' && args.includes('-rf')) {
    inputEl.value = '';
    resizeInput();
    inputArea.style.display = 'none';
    (async () => {
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      appendOutput(`<span class="tc-red tc-bold">rm: initiating recursive force delete...</span>`);
      await sleep(800);
      appendOutput(`<span class="tc-red">destroying /home/ryan/projects/oodle...</span>`);
      await sleep(400);
      appendOutput(`<span class="tc-red">destroying /home/ryan/projects/third-helix...</span>`);
      await sleep(400);
      appendOutput(`<span class="tc-red">destroying /home/ryan/projects/omarchy...</span>`);
      await sleep(400);
      appendOutput(`<span class="tc-red">destroying /home/ryan/.secrets...</span>`);
      await sleep(300);
      appendOutput(`<span class="tc-red">destroying /home/ryan/.ssh/...</span>`);
      await sleep(300);
      appendOutput(`<span class="tc-red tc-bold">⚠  WARNING: DELETING SYSTEM FILES</span>`);
      await sleep(600);
      appendOutput(`<span class="tc-red">destroying /boot/...</span>`);
      await sleep(300);
      appendOutput(`<span class="tc-red">destroying /etc/...</span>`);
      await sleep(400);
      appendOutput(`<span class="tc-red tc-bold">☠  KERNEL PANIC — NOT SYNCING</span>`);
      await sleep(1200);
      // Screen glitch effect
      const fullscreen = document.querySelector('.terminal-fullscreen') as HTMLElement;
      const glitch = () => {
        fullscreen.style.transform = `translate(${(Math.random()-0.5)*8}px, ${(Math.random()-0.5)*4}px) skewX(${(Math.random()-0.5)*2}deg)`;
        fullscreen.style.filter = `hue-rotate(${Math.random()*360}deg) brightness(${0.3+Math.random()*2})`;
      };
      const glitchInterval = setInterval(glitch, 50);
      await sleep(800);
      clearInterval(glitchInterval);
      fullscreen.style.transform = '';
      fullscreen.style.filter = '';

      // Screen goes "black"
      const outputEl = document.getElementById('terminal-output')!;
      outputEl.innerHTML = '';
      await sleep(2000);

      // Slow flicker back
      fullscreen.style.opacity = '0';
      await sleep(300);
      fullscreen.style.opacity = '1';
      await sleep(100);
      fullscreen.style.opacity = '0';
      await sleep(200);
      fullscreen.style.opacity = '1';
      await sleep(100);
      fullscreen.style.opacity = '0';
      await sleep(500);
      fullscreen.style.opacity = '1';

      appendOutput(`<span class="tc-green tc-bold">...just kidding.</span>`);
      await sleep(1200);
      appendOutput(`<span class="tc-muted">Initiating new session...</span>`);
      await sleep(800);
      appendOutput(`<span class="tc-muted">Restoring /home/ryan/...</span>`);
      await sleep(600);
      outputEl.innerHTML = '';
      // Re-run boot sequence
      cwd = '~';
      lastCmdError = false;
      const bootOutput = executeSingle('neofetch', '', ctx);
      if (bootOutput) appendOutput(bootOutput);
      const now = new Date();
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      appendOutput(`<span class="tc-muted">Last login: ${dateStr} from the void</span>\n\n<span class="tc-white">Welcome back.</span> <span class="tc-muted">Try not to delete everything this time.</span>`);
      updatePrompt();
      inputArea.style.display = 'flex';
      inputEl.focus();
      scrollToBottom();
    })();
    return;
  }

  const output = executeSingle(command, args, ctx);
  if (output) appendOutput(output);
  updatePrompt();
  inputEl.value = '';
  resizeInput();
  inputEl.focus();
}

// ── Tab completion ──
function getCompletions(partial: string): string[] {
  const parts = partial.split(/\s+/);
  if (parts.length <= 1) {
    const cmds = ['help','ls','ll','lt','tree','cd','cat','open','opencode','c','pwd','whoami','man','neofetch','htop','history','uptime','cowsay','clear','exit','sudo','rm','vim','nvim','emacs','nano','rails','echo','ping','ssh','date'];
    return cmds.filter(c => c.startsWith(parts[0]));
  }
  const cmd = parts[0];
  const pathPart = parts.slice(1).join(' ');
  const dirPath = pathPart.includes('/') ? resolvePath(pathPart.substring(0, pathPart.lastIndexOf('/'))) : cwd;
  const prefix = pathPart.includes('/') ? pathPart.substring(pathPart.lastIndexOf('/') + 1) : pathPart;

  if (!fs[dirPath]) return [];
  const entries = Object.keys(fs[dirPath]).filter(k => k !== '_type' && k.startsWith(prefix));
  const basePath = pathPart.includes('/') ? pathPart.substring(0, pathPart.lastIndexOf('/') + 1) : '';
  return entries.map(e => {
    const suffix = (fs[dirPath][e] as any)?._type === 'dir' ? '/' : '';
    return cmd + ' ' + basePath + e + suffix;
  });
}

// ── Input sizing ──
function resizeInput() {
  inputEl.style.width = Math.max(1, inputEl.value.length) + 'ch';
}

// ── Initialization ──
export function initEngine(elements: {
  input: HTMLInputElement;
  prompt: HTMLElement;
  inputArea: HTMLElement;
  terminal: HTMLElement;
  output: HTMLElement;
}) {
  inputEl = elements.input;
  promptEl = elements.prompt;
  inputArea = elements.inputArea;
  terminalEl = elements.terminal;
  outputEl = elements.output;

  inputEl.addEventListener('input', resizeInput);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(inputEl.value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) { historyIndex--; inputEl.value = commandHistory[historyIndex]; resizeInput(); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) { historyIndex++; inputEl.value = commandHistory[historyIndex]; resizeInput(); }
      else { historyIndex = commandHistory.length; inputEl.value = ''; resizeInput(); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const completions = getCompletions(inputEl.value);
      if (completions.length === 1) { inputEl.value = completions[0]; resizeInput(); }
      else if (completions.length > 1) {
        appendCommandLine(getPromptHTML(), inputEl.value);
        appendOutput(completions.map(c => `<span class="tc-muted">${escapeHtml(c)}</span>`).join('  '));
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clearOutput();
    }
  });

  terminalEl.addEventListener('click', (e) => {
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) return;
    if (!(e.target as HTMLElement).closest('a, .tc-click')) inputEl.focus();
  });

  document.querySelectorAll('.mobile-cmd').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = (btn as HTMLElement).dataset.cmd;
      if (cmd) executeCommand(cmd);
    });
  });
}

// Expose for boot sequence
export { cwd, commandHistory, fs, fileContents, updatePrompt, resolvePath };
export function setHistoryIndex(i: number) { historyIndex = i; }
export function getInputArea() { return inputArea; }
export function getInputEl() { return inputEl; }
