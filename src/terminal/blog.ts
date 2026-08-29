// Blog data types matching what we inject from Astro pages
export interface BlogPostData {
  slug: string;
  title: string;
  date: string;
  updated?: string;
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

    // Images ![alt](url)
    const imageMatch = line.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (imageMatch) {
      if (inList) { inList = false; }
      result.push(`<img src="${escHtml(imageMatch[2])}" alt="${escHtml(imageMatch[1])}" class="reader-inline-image" loading="lazy" />`);
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
  // Images ![alt](url)
  out = out.replace(/!\[(.*?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="reader-inline-image" loading="lazy" />');
  // Links [text](url)
  out = out.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="tc-link" target="_blank">$1</a>');
  return out;
}

/**
 * Posts to read next: those sharing the most tags, then the most recent.
 * The fallback matters — right now no two posts share a tag, and a post that
 * dead-ends at "back to posts" is the end of the visit.
 */
export function relatedPosts(post: BlogPostData, all: BlogPostData[], limit = 3): BlogPostData[] {
  const tags = new Set(post.tags);
  const others = all.filter(p => p.slug !== post.slug);

  const scored = others
    .map((p, index) => ({ post: p, shared: p.tags.filter(t => tags.has(t)).length, index }))
    // `all` arrives newest-first, so index doubles as a recency rank
    .sort((a, b) => b.shared - a.shared || a.index - b.index);

  return scored.slice(0, limit).map(p => p.post);
}

export function buildBlogTerminalContent(post: BlogPostData, all: BlogPostData[] = []): string {
  const lines: string[] = [];

  // Header banner
  lines.push(`<span class="tc-banner" role="heading" aria-level="2">${escHtml(post.title)}</span>`);
  lines.push('');
  const dateParts = [post.date];
  if (post.updated) dateParts.push(`Updated ${post.updated}`);
  lines.push(`<span class="tc-muted">${dateParts.join('  ·  ')}  ·  ${post.tags.map(t => `#${t}`).join(' ')}</span>`);
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

  const related = relatedPosts(post, all);
  if (related.length) {
    lines.push('');
    lines.push('<span class="tc-label">Related</span>');
    for (const r of related) {
      lines.push(`<span class="tc-click tc-link-inline" data-cmd="cat ~/blog/${r.slug}">${escHtml(r.title)}</span> <span class="tc-muted">· ${escHtml(r.date)}</span>`);
    }
    lines.push('');
  }

  lines.push(`<span class="tc-click tc-link-inline" data-cmd="read ~/blog/${post.slug}">📖 open reader experience</span>`);
  lines.push(`<span class="tc-click tc-link-inline" data-cmd="cd ~/blog && ls">Back to posts</span>`);
  lines.push(`<a href="/rss.xml" class="tc-link">Subscribe via RSS</a>`);

  return lines.join('\n');
}
