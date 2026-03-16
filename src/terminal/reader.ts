/**
 * Reader overlay — a full-viewport content viewer like `less` in a real terminal.
 * Opens over the terminal, captures keyboard input, closes with `q` or `Escape`.
 */

let overlay: HTMLElement | null = null;
let contentEl: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let previousUrl: string | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let isDirectAccess = false;

/** Check if the reader overlay is currently open */
export function isReaderOpen(): boolean {
  return overlay !== null;
}

/** Open the reader overlay with rendered HTML content */
export function openReader(title: string, content: string, filePath: string, options?: { directAccess?: boolean }) {
  if (overlay) closeReader();

  isDirectAccess = options?.directAccess ?? false;
  previousUrl = window.location.pathname + window.location.search;

  // Create overlay
  overlay = document.createElement('div');
  overlay.id = 'reader-overlay';
  overlay.className = 'reader-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Reading: ${title}`);

  // Top bar (like less status)
  const topBar = document.createElement('div');
  topBar.className = 'reader-top-bar';

  if (isDirectAccess) {
    topBar.innerHTML = `<span class="reader-nav"><a href="/?cmd=${encodeURIComponent('cd ~/blog && ls')}" class="reader-nav-link">← blog</a><a href="/" class="reader-nav-link">← terminal</a></span><span class="reader-filename">${escapeHtml(filePath)}</span>`;
  } else {
    topBar.innerHTML = `<span class="reader-filename">${escapeHtml(filePath)}</span><span class="reader-hint">q to quit</span>`;
  }

  // Content area — inner wrapper for max-width while keeping scrollbar at viewport edge
  contentEl = document.createElement('div');
  contentEl.className = 'reader-content';
  contentEl.innerHTML = `<div class="reader-content-inner">${content}</div>`;
  contentEl.tabIndex = 0;

  // Bottom status bar
  statusEl = document.createElement('div');
  statusEl.className = 'reader-status-bar';
  statusEl.innerHTML = '<span class="reader-status-text">:</span>';

  overlay.appendChild(topBar);
  overlay.appendChild(contentEl);
  overlay.appendChild(statusEl);

  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => {
    overlay?.classList.add('reader-visible');
  });

  // Update scroll status on scroll
  contentEl.addEventListener('scroll', updateStatus);

  // Focus for keyboard
  contentEl.focus();

  // Keyboard handler
  keyHandler = (e: KeyboardEvent) => {
    if (!overlay || !contentEl) return;

    const scrollAmount = contentEl.clientHeight - 40;
    const lineHeight = 24;

    switch (e.key) {
      case 'q':
        e.preventDefault();
        e.stopPropagation();
        if (isDirectAccess) {
          window.location.href = '/';
        } else {
          closeReader();
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (isDirectAccess) {
          window.location.href = '/blog';
        } else {
          closeReader();
        }
        break;
      case ' ':
      case 'PageDown':
        e.preventDefault();
        contentEl.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        break;
      case 'b':
      case 'PageUp':
        e.preventDefault();
        contentEl.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
        break;
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        contentEl.scrollBy({ top: lineHeight, behavior: 'smooth' });
        break;
      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        contentEl.scrollBy({ top: -lineHeight, behavior: 'smooth' });
        break;
      case 'g':
        if (!e.shiftKey) {
          e.preventDefault();
          contentEl.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // G (shift+g) — scroll to bottom
          e.preventDefault();
          contentEl.scrollTo({ top: contentEl.scrollHeight, behavior: 'smooth' });
        }
        break;
      case 'G':
        e.preventDefault();
        contentEl.scrollTo({ top: contentEl.scrollHeight, behavior: 'smooth' });
        break;
      case 'Home':
        e.preventDefault();
        contentEl.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'End':
        e.preventDefault();
        contentEl.scrollTo({ top: contentEl.scrollHeight, behavior: 'smooth' });
        break;
      default:
        // Ignore other keys — don't pass to terminal
        e.preventDefault();
        e.stopPropagation();
        break;
    }
  };

  // Capture at the document level so terminal doesn't get events
  document.addEventListener('keydown', keyHandler, true);

  // Push URL state — for blog posts use /blog/slug, for others use ?view=reader
  const blogMatch = filePath.match(/^(?:~\/)?blog\/(.+)$/);
  if (blogMatch) {
    history.pushState({ reader: true, filePath }, '', `/blog/${blogMatch[1]}`);
  } else {
    const cleanPath = filePath.replace(/^~\//, '').replace(/\.txt$/, '');
    history.pushState({ reader: true, filePath }, '', `/${cleanPath}?view=reader`);
  }

  // Listen for popstate to close reader on back
  window.addEventListener('popstate', onPopState);

  // Initial status update
  requestAnimationFrame(() => updateStatus());
}

function updateStatus() {
  if (!contentEl || !statusEl) return;
  const atBottom = contentEl.scrollTop + contentEl.clientHeight >= contentEl.scrollHeight - 5;
  const atTop = contentEl.scrollTop <= 0;

  if (atBottom && atTop) {
    statusEl.innerHTML = '<span class="reader-status-text">(END)</span>';
  } else if (atBottom) {
    statusEl.innerHTML = '<span class="reader-status-text">(END)</span>';
  } else if (atTop) {
    statusEl.innerHTML = '<span class="reader-status-text">:</span>';
  } else {
    const pct = Math.round((contentEl.scrollTop / (contentEl.scrollHeight - contentEl.clientHeight)) * 100);
    statusEl.innerHTML = `<span class="reader-status-text">${pct}%</span>`;
  }
}

function onPopState() {
  if (overlay) {
    closeReader(true); // true = don't manipulate history
  }
}

/** Close the reader overlay and restore the terminal */
export function closeReader(fromPopState = false) {
  if (!overlay) return;

  // Remove keyboard handler
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler, true);
    keyHandler = null;
  }

  window.removeEventListener('popstate', onPopState);

  // Animate out
  overlay.classList.remove('reader-visible');
  const overlayRef = overlay;
  setTimeout(() => {
    overlayRef.remove();
  }, 200);

  overlay = null;
  contentEl = null;
  statusEl = null;

  // For direct access, navigate away instead of restoring
  if (isDirectAccess && !fromPopState) {
    isDirectAccess = false;
    previousUrl = null;
    window.location.href = '/';
    return;
  }

  // Restore URL
  if (!fromPopState && previousUrl) {
    history.pushState(null, '', previousUrl);
  }
  previousUrl = null;
  isDirectAccess = false;

  // Restore terminal focus
  const input = document.getElementById('terminal-input') as HTMLInputElement | null;
  if (input) input.focus();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
