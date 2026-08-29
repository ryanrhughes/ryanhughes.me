import type { CommandContext } from '../terminal/types';
import { getLatestEpisode } from '../terminal/filesystem';
import { getBlogPosts } from './read';

/**
 * What's new — the site publishes weekly but the boot screen looks identical
 * whether the last update was yesterday or two years ago.
 */
export function cmdLatest(ctx: CommandContext): string {
  const { click } = ctx;
  const lines: string[] = [`<span class="tc-label">Latest</span>`];

  const ep = getLatestEpisode();
  if (ep) {
    lines.push('');
    lines.push(`<span class="tc-cyan nf">&#xf04c1;</span> <span class="tc-muted">Podcast</span>  <span class="tc-muted">${ep.pubDate}</span>`);
    lines.push(`  ${click(ep.title, `cat ~/podcast/${ep.slug}`, 'tc-link-inline')}`);
  }

  const posts = getBlogPosts();
  if (posts.length) {
    const post = posts[0];
    lines.push('');
    lines.push(`<span class="tc-cyan nf">&#xf09de;</span> <span class="tc-muted">Blog</span>     <span class="tc-muted">${post.date}</span>`);
    lines.push(`  ${click(post.title, `read ~/blog/${post.slug}`, 'tc-link-inline')}`);
  }

  if (lines.length === 1) {
    return `<span class="tc-muted">Nothing to report — the feed didn't load.</span>`;
  }

  lines.push('');
  lines.push(
    `<span class="tc-muted">All: ${click('podcast', 'podcast', 'tc-link-inline')}  ${click('blog', 'blog', 'tc-link-inline')}</span>`
  );
  return lines.join('\n');
}
