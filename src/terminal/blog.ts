// Blog data types matching what we inject from Astro pages
export interface BlogPostData {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  body: string;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Convert markdown to terminal-formatted HTML.
 * Handles headers, paragraphs, code blocks, bold, italic, lists, links.
 */
function markdownToTerminal(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        result.push(`<span class="tc-muted">${codeLines.map(l => '  ' + escHtml(l)).join('\n')}</span>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('## ')) {
      if (inList) { inList = false; }
      result.push('');
      result.push(`<span class="tc-purple tc-bold">${escHtml(line.slice(3))}</span>`);
      result.push('');
      continue;
    }

    if (line.startsWith('### ')) {
      if (inList) { inList = false; }
      result.push('');
      result.push(`<span class="tc-blue tc-bold">${escHtml(line.slice(4))}</span>`);
      result.push('');
      continue;
    }

    // List items
    if (line.match(/^[-*]\s/)) {
      inList = true;
      const text = formatInline(line.slice(2));
      result.push(`  <span class="tc-cyan">•</span> ${text}`);
      continue;
    }

    // Numbered list items
    if (line.match(/^\d+\.\s/)) {
      inList = true;
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const text = formatInline(numMatch[2]);
        result.push(`  <span class="tc-cyan">${numMatch[1]}.</span> ${text}`);
      }
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      const text = formatInline(line.slice(2));
      result.push(`  <span class="tc-muted">│</span> <span class="tc-yellow">${text}</span>`);
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      result.push('<span class="tc-muted">─────────────────────────────────</span>');
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      if (inList) { inList = false; }
      result.push('');
      continue;
    }

    // Regular paragraph text
    if (inList) { inList = false; }
    result.push(formatInline(line));
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function formatInline(text: string): string {
  let out = escHtml(text);
  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, '<span class="tc-white tc-bold">$1</span>');
  // Italic
  out = out.replace(/\*(.+?)\*/g, '<span class="tc-yellow">$1</span>');
  // Inline code
  out = out.replace(/`(.+?)`/g, '<span class="tc-green">$1</span>');
  // Links [text](url)
  out = out.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="tc-link" target="_blank">$1</a>');
  return out;
}

export function buildBlogTerminalContent(post: BlogPostData): string {
  const lines: string[] = [];

  // Header banner
  lines.push(`<span class="tc-banner" role="heading" aria-level="2">${escHtml(post.title)}</span>`);
  lines.push('');
  lines.push(`<span class="tc-muted">${post.date}  ·  ${post.tags.map(t => `#${t}`).join(' ')}</span>`);
  lines.push('');
  lines.push(`<span class="tc-accent">${escHtml(post.description)}</span>`);
  lines.push('');
  lines.push('<span class="tc-muted">─────────────────────────────────</span>');
  lines.push('');

  // Body content
  lines.push(markdownToTerminal(post.body));

  // Footer
  lines.push('');
  lines.push('<span class="tc-muted">─────────────────────────────────</span>');
  lines.push(`<span class="tc-muted">Read the full version at </span><a href="/blog/${post.slug}" class="tc-link">/blog/${escHtml(post.slug)}</a>`);
  lines.push(`<span class="tc-click tc-link-inline" data-cmd="cd ~/blog && ls">Back to posts</span>`);

  return lines.join('\n');
}
