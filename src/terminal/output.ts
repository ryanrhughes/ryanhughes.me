let outputEl: HTMLElement;
let terminalEl: HTMLElement;
let executeCommandFn: (cmd: string) => void;

export function initOutput(
  output: HTMLElement,
  terminal: HTMLElement,
  executeCommand: (cmd: string) => void
) {
  outputEl = output;
  terminalEl = terminal;
  executeCommandFn = executeCommand;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function click(label: string, cmd: string, cls = ''): string {
  return `<span class="tc-click ${cls}" data-cmd="${escapeHtml(cmd)}">${label}</span>`;
}

// Nerd Font icons
const DIR_ICON = '\uf07b';      // 
const FILE_ICONS: Record<string, string> = {
  '.txt': '\uf15c',             // 
  '.md':  '\ue609',             // 
};
const DEFAULT_FILE_ICON = '\uf016'; // 

export function getFileIcon(name: string, customIcon?: string): string {
  if (customIcon) return customIcon;
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  return FILE_ICONS[ext] || DEFAULT_FILE_ICON;
}

export function dirClick(name: string, path: string): string {
  const absPath = path.startsWith('~') ? path : `~/${path}`;
  return `<span class="tc-icon tc-dir-icon">${DIR_ICON}</span> ` + click(name + '/', `cd ${absPath} && ls`, 'tc-dir');
}

export function fileClick(name: string, path: string, icon?: string): string {
  const i = getFileIcon(name, icon);
  // Support image icons (paths starting with /)
  if (i.startsWith('/') || i.startsWith('http')) {
    return `<img src="${i}" class="tc-img-icon" alt="" /> ` + click(name, `cat ${path}`, 'tc-file');
  }
  return `<span class="tc-icon tc-file-icon">${i}</span> ` + click(name, `cat ${path}`, 'tc-file');
}

export function appendOutput(html: string) {
  const div = document.createElement('div');
  div.className = 'output-block';
  div.innerHTML = html;
  outputEl.appendChild(div);
  div.querySelectorAll('.tc-click').forEach(el => {
    el.addEventListener('click', () => {
      const cmd = (el as HTMLElement).dataset.cmd;
      if (cmd) executeCommandFn(cmd);
    });
  });
  scrollToBottom();
}

export function appendCommandLine(promptHTML: string, cmd: string) {
  const div = document.createElement('div');
  div.className = 'output-block command-echo';
  div.innerHTML = `<span class="prompt-echo">${promptHTML}</span>${escapeHtml(cmd)}`;
  outputEl.appendChild(div);
  scrollToBottom();
}

export function scrollToBottom() {
  requestAnimationFrame(() => {
    terminalEl.scrollTop = terminalEl.scrollHeight;
  });
}

export function clearOutput() {
  outputEl.innerHTML = '';
}
