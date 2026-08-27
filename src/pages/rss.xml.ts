import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/blog-data';
import { absoluteUrl, SITE_AUTHOR, SITE_URL } from '../lib/site';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();

  const items = posts
    .map(post => {
      const slug = post.id.replace(/\.md$/, '');
      const url = absoluteUrl(`blog/${slug}`);
      return `    <item>
      <title>${esc(post.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(post.data.description)}</description>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
${post.data.tags.map(t => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ryan Hughes — Blog</title>
    <link>${SITE_URL}/blog/</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Writing from ${SITE_AUTHOR} on Linux, self-hosting, AI, and building things that hold up.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
