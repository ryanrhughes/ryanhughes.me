let outputEl: HTMLElement;
let terminalEl: HTMLElement;
let executeCommandFn: (cmd: string, opts?: { interactive?: boolean }) => void;

export function initOutput(
  output: HTMLElement,
  terminal: HTMLElement,
  executeCommand: (cmd: string) => void
) {
  outputEl = output;
  terminalEl = terminal;
  executeCommandFn = executeCommand;

  // Delegated click/keyboard handler for all .tc-click elements
  outputEl.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.tc-click') as HTMLElement;
    if (target?.dataset.cmd) {
      executeCommandFn(target.dataset.cmd, { interactive: false });
    }
  });
  outputEl.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
      const target = (e.target as HTMLElement).closest('.tc-click') as HTMLElement;
      if (target?.dataset.cmd) {
        e.preventDefault();
        executeCommandFn(target.dataset.cmd);
      }
    }
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function click(label: string, cmd: string, cls = ''): string {
  return `<span class="tc-click ${cls}" data-cmd="${escapeHtml(cmd)}" role="button" tabindex="0">${escapeHtml(label)}</span>`;
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
  // Support custom font icons (format: "font:codepoint" e.g. "omarchy:e900")
  if (i.includes(':')) {
    const [fontClass, codepoint] = i.split(':');
    return `<span class="tc-icon tc-file-icon ${fontClass}-icon">&#x${codepoint};</span> ` + click(name, `cat ${path}`, 'tc-file');
  }
  return `<span class="tc-icon tc-file-icon">${i}</span> ` + click(name, `cat ${path}`, 'tc-file');
}

export function appendOutput(html: string) {
  const div = document.createElement('div');
  div.className = 'output-block';
  div.innerHTML = html;
  outputEl.appendChild(div);
  // Click/keyboard handling is delegated on #terminal-output (see initOutput)
  // Scroll after images load (bio headshot, icons, etc.)
  div.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', () => scrollToBottom());
  });
  // Init podcast players
  div.querySelectorAll('.podcast-player').forEach(initPodcastPlayer);
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
  // Delayed scroll to catch images/fonts that load after initial render
  setTimeout(() => {
    terminalEl.scrollTop = terminalEl.scrollHeight;
  }, 50);
  setTimeout(() => {
    terminalEl.scrollTop = terminalEl.scrollHeight;
  }, 200);
}

function formatTime(s: number): string {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function initPodcastPlayer(el: Element) {
  const container = el as HTMLElement;
  const src = container.dataset.src;
  if (!src) return;

  const playBtn = container.querySelector('.pp-play') as HTMLElement;
  const muteBtn = container.querySelector('.pp-mute') as HTMLElement;
  const progress = container.querySelector('.pp-progress') as HTMLElement;
  const knob = container.querySelector('.pp-knob') as HTMLElement;
  const currentTime = container.querySelector('.pp-current') as HTMLElement;
  const durationEl = container.querySelector('.pp-duration') as HTMLElement;
  const barWrap = container.querySelector('.pp-bar-wrap') as HTMLElement;

  let audio: HTMLAudioElement | null = null;
  let loaded = false;

  function ensureAudio() {
    if (!audio) {
      audio = new Audio(src);
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio!.duration);
      });
      audio.addEventListener('timeupdate', () => {
        const pct = (audio!.currentTime / audio!.duration) * 100 || 0;
        progress.style.width = pct + '%';
        knob.style.left = pct + '%';
        currentTime.textContent = formatTime(audio!.currentTime);
      });
      audio.addEventListener('ended', () => {
        playBtn.innerHTML = '&#xf040a;';
        progress.style.width = '0%';
        knob.style.left = '0%';
      });
    }
    return audio;
  }

  playBtn.addEventListener('click', () => {
    const a = ensureAudio();
    if (a.paused) {
      a.play();
      playBtn.innerHTML = '&#xf03e4;';
    } else {
      a.pause();
      playBtn.innerHTML = '&#xf040a;';
    }
  });

  muteBtn.addEventListener('click', () => {
    const a = ensureAudio();
    a.muted = !a.muted;
    muteBtn.innerHTML = a.muted ? '&#xf0581;' : '&#xf057e;';
  });

  barWrap.addEventListener('click', (e: MouseEvent) => {
    const a = ensureAudio();
    const rect = barWrap.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (a.duration) {
      a.currentTime = pct * a.duration;
    }
  });
}

export function clearOutput() {
  outputEl.innerHTML = '';
}
