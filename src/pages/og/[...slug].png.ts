import type { APIRoute } from 'astro';
import { PODCAST_RSS_URL, parsePodcastFeed } from '../../lib/podcast-rss';
import { getPublishedPosts, POST_DATE_FORMAT } from '../../lib/blog-data';
import { renderOgCard, type OgCard } from '../../lib/og-image';

// One social card per episode and post. Everything else falls back to the
// static og-image.png, so only the pages people actually share get one.
export async function getStaticPaths() {
  const paths: { params: { slug: string }; props: OgCard }[] = [];

  const res = await fetch(PODCAST_RSS_URL);
  if (!res.ok) throw new Error(`Podcast RSS fetch failed: ${res.status} ${res.statusText}`);
  for (const ep of parsePodcastFeed(await res.text()).episodes) {
    paths.push({
      params: { slug: `podcast/${ep.slug}` },
      props: {
        title: ep.title.replace(/^Episode\s*\d+\s*[-–—]\s*/i, ''),
        kicker: `podcast/episode-${ep.number}`,
        footer: `${ep.pubDate} · ${ep.duration}`,
      },
    });
  }

  for (const post of await getPublishedPosts()) {
    paths.push({
      params: { slug: `blog/${post.id.replace(/\.md$/, '')}` },
      props: {
        title: post.data.title,
        kicker: 'blog',
        footer: post.data.date.toLocaleDateString('en-US', POST_DATE_FORMAT),
      },
    });
  }

  return paths;
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgCard(props as OgCard);
  // Copied into an ArrayBuffer-backed view: sharp hands back a Node Buffer,
  // which TypeScript won't accept as a BodyInit
  const body = new Uint8Array(png.length);
  body.set(png);
  return new Response(body, {
    headers: { 'Content-Type': 'image/png' },
  });
};
