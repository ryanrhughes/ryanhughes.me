/**
 * `read` / `less` command — opens content in the reader overlay.
 * Like `less` in a real terminal: takes over the viewport.
 */

import type { CommandContext } from '../terminal/types';
import { openReader } from '../terminal/reader';
import { relatedPosts, type BlogPostData } from '../terminal/blog';


function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Render markdown to clean reader HTML (not terminal-formatted — proper readable HTML) */
function markdownToReaderHtml(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  function closeList() {
    if (inList) {
      result.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        result.push(`<pre><code class="reader-code${codeLang ? ` lang-${codeLang}` : ''}">${codeLines.map(l => escHtml(l)).join('\n')}</code></pre>`);
        codeLines = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        closeList();
        codeLang = line.slice(3).trim();
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
      closeList();
      result.push(`<h2>${formatInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      result.push(`<h3>${formatInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('# ')) {
      closeList();
      result.push(`<h1>${formatInline(line.slice(2))}</h1>`);
      continue;
    }

    // Images
    const imageMatch = line.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (imageMatch) {
      closeList();
      result.push(`<figure><img src="${escHtml(imageMatch[2])}" alt="${escHtml(imageMatch[1])}" loading="lazy" /><figcaption>${escHtml(imageMatch[1])}</figcaption></figure>`);
      continue;
    }

    // List items (unordered)
    if (line.match(/^[-*]\s/)) {
      if (!inList || listType !== 'ul') {
        closeList();
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li>${formatInline(line.slice(2))}</li>`);
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      if (!inList || listType !== 'ol') {
        closeList();
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      const numMatch = line.match(/^\d+\.\s(.*)/);
      if (numMatch) {
        result.push(`<li>${formatInline(numMatch[1])}</li>`);
      }
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      closeList();
      result.push(`<blockquote>${formatInline(line.slice(2))}</blockquote>`);
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      closeList();
      result.push('<hr>');
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      closeList();
      continue;
    }

    // Regular paragraph
    closeList();
    result.push(`<p>${formatInline(line)}</p>`);
  }

  closeList();
  return result.join('\n');
}

function formatInline(text: string): string {
  let out = escHtml(text);
  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  out = out.replace(/`(.+?)`/g, '<code>$1</code>');
  // Images ![alt](url)
  out = out.replace(/!\[(.*?)\]\((.+?)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
  // Links [text](url)
  out = out.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return out;
}

/** Get blog post data from the embedded JSON */
export function getBlogPosts(): BlogPostData[] {
  const el = document.getElementById('blog-data');
  if (!el) return [];
  try {
    return JSON.parse(el.textContent || '[]');
  } catch {
    return [];
  }
}

/** Related-post block for the reader overlay */
function relatedHtml(post: BlogPostData): string {
  const related = relatedPosts(post, getBlogPosts());
  if (!related.length) return '';
  const items = related
    .map(
      r =>
        `<li><a href="#" class="reader-back-link" data-reader-cmd="read ~/blog/${r.slug}">${escHtml(r.title)}</a> <span class="reader-post-date">${escHtml(r.date)}</span></li>`
    )
    .join('');
  return `<div class="reader-related"><h2>Related</h2><ul>${items}</ul></div>`;
}

/** Build reader HTML for a blog post */
export function buildBlogReaderHtml(post: BlogPostData): string {
  return `<div class="reader-blog-post">
  <div class="reader-post-meta">
    <h1 class="reader-post-title">${escHtml(post.title)}</h1>
    <div class="reader-post-date">${escHtml(post.date)}${post.updated ? ` · Updated ${escHtml(post.updated)}` : ''}</div>
    <div class="reader-post-description">${escHtml(post.description)}</div>
    ${post.tags.length > 0 ? `<div class="reader-post-tags">${post.tags.map(t => `<span class="reader-post-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
  </div>
  <div class="reader-post-body">
    ${markdownToReaderHtml(post.body)}
  </div>
  ${relatedHtml(post)}
  <div class="reader-post-footer">
    <a href="#" class="reader-back-link" data-reader-cmd="cd ~/blog && ls">← back to blog</a>
    <a href="/rss.xml" class="reader-back-link">subscribe via RSS</a>
  </div>
</div>`;
}

/** Build reader HTML for a generic file (terminal HTML content → reader-friendly version) */
function buildFileReaderHtml(filePath: string, rawContent: string): string {
  // The file content is already terminal-formatted HTML — we'll wrap it nicely
  return `<div class="reader-file-content">
  <div class="reader-file-body">${rawContent}</div>
</div>`;
}

export function cmdRead(args: string, ctx: CommandContext): string {
  const target = args.trim();
  if (!target) {
    return `<span class="tc-red">read: missing file operand</span>\n<span class="tc-muted">Usage: read &lt;file&gt;  — open file in reader mode</span>`;
  }

  const resolved = ctx.resolvePath(target);

  // Check if it's a directory
  if (ctx.fs[resolved]) {
    return `<span class="tc-red">read: ${ctx.escapeHtml(target)}: Is a directory</span>`;
  }

  // Check for blog posts first
  const blogMatch = resolved.match(/^~\/blog\/(.+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const posts = getBlogPosts();
    const post = posts.find(p => p.slug === slug);
    if (post) {
      const html = buildBlogReaderHtml(post);
      openReader(post.title, html, `blog/${slug}`);
      return ''; // No terminal output — reader takes over
    }
  }

  // Check for regular file content
  const content = ctx.fileContents[resolved] || ctx.fileContents[resolved + '.txt'];
  if (content) {
    const fileName = resolved.split('/').pop() || target;
    const displayPath = resolved.replace(/^~\//, '');
    const html = buildFileReaderHtml(displayPath, content);
    openReader(fileName, html, displayPath);
    return ''; // No terminal output
  }

  return `<span class="tc-red">read: ${ctx.escapeHtml(target)}: No such file</span>`;
}
