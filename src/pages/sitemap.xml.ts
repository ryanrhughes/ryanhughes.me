import type { APIRoute } from 'astro';
import { PODCAST_RSS_URL, parsePodcastFeed } from '../lib/podcast-rss';
import { getPublishedPosts } from '../lib/blog-data';
import { absoluteUrl } from '../lib/site';

// Kept in sync with the static path list in [...path].astro
const STATIC_PATHS = [
  '',
  'about', 'about/bio', 'about/dogs', 'about/dogs/remus', 'about/dogs/arthas',
  'projects', 'projects/oodle', 'projects/herald', 'projects/sunset-villas', 'projects/omarchy',
  'connect', 'connect/email', 'connect/linkedin', 'connect/github', 'connect/x',
  'resume',
  'podcast', 'podcast/readme',
  'blog',
];

interface Entry {
  path: string;
  lastmod?: string;
}

export const GET: APIRoute = async () => {
  const entries: Entry[] = STATIC_PATHS.map(path => ({ path }));

  const res = await fetch(PODCAST_RSS_URL);
  if (!res.ok) throw new Error(`Podcast RSS fetch failed: ${res.status} ${res.statusText}`);
  for (const ep of parsePodcastFeed(await res.text()).episodes) {
    entries.push({ path: `podcast/${ep.slug}` });
  }

  for (const post of await getPublishedPosts()) {
    entries.push({
      path: `blog/${post.id.replace(/\.md$/, '')}`,
      lastmod: (post.data.updated ?? post.data.date).toISOString(),
    });
  }

  const urls = entries
    .map(({ path, lastmod }) => {
      const mod = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
      return `  <url>\n    <loc>${absoluteUrl(path)}</loc>${mod}\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
