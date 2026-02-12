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
function cmdLs(args: string, showAll = false): string {
  const tokens = args.trim().split(/\s+/).filter(Boolean);
  const flags: string[] = [];
  const paths: string[] = [];
  for (const t of tokens) {
    if (t.startsWith('-')) flags.push(t);
    else paths.push(t);
  }
  const hasA = showAll || flags.some(f => /a/.test(f));
  const target = paths[0] || cwd;
  const resolved = resolvePath(target);

  if (!fs[resolved]) {
    lastCmdError = true;
    return `<span class="tc-red">ls: cannot access '${escapeHtml(paths[0] || '.')}': No such file or directory</span>`;
  }

  const entries = fs[resolved];
  const parts: string[] = [];

  if (hasA) parts.push('<span class="tc-muted">.  ..</span>');

  for (const [name, info] of Object.entries(entries)) {
    if (name === '_type') continue;
    if (name.startsWith('.') && !hasA) continue;
    if ((info as any)._type === 'dir') {
      const cdPath = resolved === '~' ? name : resolved + '/' + name;
      parts.push(dirClick(name, cdPath));
    } else {
      const catPath = resolved === '~' ? name : resolved + '/' + name;
      parts.push(fileClick(name, catPath));
    }
  }

  return parts.join('  ');
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
        parts.push('  ' + fileClick(name, fullPath));
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

// ── Execute command ──
export function executeCommand(raw: string) {
  const cmd = raw.trim();
  if (!cmd) return;

  lastCmdError = false;
  appendCommandLine(getPromptHTML(), cmd);
  commandHistory.push(cmd);
  historyIndex = commandHistory.length;

  const parts = cmd.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = cmd.substring(parts[0].length).trim();
  const ctx = getContext();

  let output = '';

  switch (command) {
    case 'help': output = cmdHelp(args, ctx); break;
    case 'ls': output = cmdLs(args); break;
    case 'll': output = cmdLs(args, true); break;
    case 'cd': output = cmdCd(args); break;
    case 'cat': output = cmdCat(args); break;
    case 'open': output = cmdOpen(args); break;
    case 'man': {
      const result = cmdMan(args, ctx);
      output = result.output;
      if (result.error) lastCmdError = true;
      break;
    }
    case 'neofetch': output = cmdNeofetch(args, ctx); break;
    case 'htop': output = cmdHtop(args, ctx); break;
    case 'history': output = cmdHistory(args, ctx); break;
    case 'uptime': output = cmdUptime(args, ctx); break;
    case 'cowsay': output = cmdCowsay(args, ctx); break;
    case 'clear': clearOutput(); inputEl.value = ''; updatePrompt(); return;
    default: {
      const builtin = cmdBuiltin(command, args, ctx);
      if (builtin) {
        output = builtin.output;
        if (builtin.error) lastCmdError = true;
      } else {
        lastCmdError = true;
        const responses = [
          `<span class="tc-red">zsh: command not found: ${escapeHtml(command)}</span>`,
          `<span class="tc-red">${escapeHtml(command)}: not found.</span> <span class="tc-muted">Try ${click('help', 'help', 'tc-link-inline')}</span>`,
          `<span class="tc-red">${escapeHtml(command)}? Never heard of her.</span>`,
        ];
        output = responses[commandHistory.length % responses.length];
      }
    }
  }

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
    const cmds = ['help','ls','ll','cd','cat','open','pwd','whoami','man','neofetch','htop','history','uptime','cowsay','clear','exit','sudo','rm','vim','nvim','emacs','nano','rails','echo','ping','ssh','date'];
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
