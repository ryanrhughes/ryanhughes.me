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

export function dirClick(name: string, path: string): string {
  return click(name + '/', `cd ${path}`, 'tc-dir');
}

export function fileClick(name: string, path: string): string {
  return click(name, `cat ${path}`, 'tc-file');
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
