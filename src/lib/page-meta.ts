// Per-page <head> metadata and the no-JS content mirror.
//
// The terminal renders everything client-side, which leaves crawlers and social
// scrapers with an empty document. This module turns the same source content
// into a real title, description, and <noscript> body at build time.

import type { PodcastData, PodcastEpisode } from './podcast-rss';
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_TITLE, truncate } from './site';

const htmlModules = import.meta.glob('/src/filesystem/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface PageMeta {
  /** Full <title>, already suffixed with the site name */
  title: string;
  description: string;
  canonical: string;
  ogType: 'website' | 'article';
  /** Heading rendered above the no-JS body */
  heading: string;
  /** HTML for the <noscript> mirror; empty when there's nothing to mirror */
  noscript: string;
}

/** Titles and descriptions for the hand-authored terminal pages. */
const STATIC_PAGES: Record<string, { title: string; description: string }> = {
  '': {
    title: SITE_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  about: {
    title: 'About',
    description: 'Who Ryan Hughes is, what he builds, and the two dogs supervising it all.',
  },
  'about/bio': {
    title: 'Bio',
    description:
      'Partner & CIO at Oodle, Omarchy core team member, and a reformed Apple fanboy in Fort Lauderdale.',
  },
  'about/dogs': {
    title: 'Dogs',
    description: 'Remus the beagle and Arthas José the supermutt — the real management team.',
  },
  'about/dogs/remus': {
    title: 'Remus',
    description: 'Beagle. Couch security specialist. Unofficial Nappy Boy, T-Pain certification pending.',
  },
  'about/dogs/arthas': {
    title: 'Arthas José',
    description: 'Supermutt, alias Professor Chaos. Thinks he is a badass, is actually a dork.',
  },
  projects: {
    title: 'Projects',
    description: 'Oodle, Omarchy, and Sunset Villas — the things Ryan Hughes builds and runs.',
  },
  'projects/oodle': {
    title: 'Oodle',
    description:
      'Full-service digital marketing agency founded in 2009. Six-time INC 5000 honoree and Google Premier Partner.',
  },
  'projects/omarchy': {
    title: 'Omarchy',
    description:
      'Beautiful, modern and opinionated Linux by DHH. Ryan Hughes is a founding core team member.',
  },
  'projects/sunset-villas': {
    title: 'Sunset Villas',
    description:
      'Three 8-bedroom luxury vacation homes in ChampionsGate, minutes from the Orlando theme parks.',
  },
  connect: {
    title: 'Connect',
    description: 'Email, LinkedIn, GitHub, and X — every way to reach Ryan Hughes.',
  },
  'connect/email': { title: 'Email', description: 'Email Ryan Hughes at ryan@heyoodle.com.' },
  'connect/linkedin': { title: 'LinkedIn', description: 'Ryan Hughes on LinkedIn — linkedin.com/in/ryanrhughes.' },
  'connect/github': { title: 'GitHub', description: 'Ryan Hughes on GitHub — github.com/ryanrhughes.' },
  'connect/x': { title: 'X', description: 'Ryan Hughes on X — x.com/ryanrhughes.' },
  resume: {
    title: 'Resume',
    description:
      'Partner & CIO at Oodle, Omarchy core team, and co-owner of Sunset Villas. Stack, expertise, and notable clients.',
  },
  podcast: {
    title: 'Not Brothers Podcast',
    description:
      'No-nonsense business and tech talk from two co-founders who have been mistaken for brothers for two decades.',
  },
  'podcast/readme': {
    title: 'About the Podcast',
    description:
      'What the Not Brothers Podcast is about, and why two business partners keep arguing on tape every week.',
  },
  blog: {
    title: 'Blog',
    description: 'Writing from Ryan Hughes on Linux, self-hosting, AI, and building things that hold up.',
  },
};

/** Directory listings have no source file, so spell out what they contain. */
const DIRECTORY_BODIES: Record<string, string> = {
  about: 'bio.txt\ndogs/',
  'about/dogs': 'remus\narthas',
  projects: 'oodle\nomarchy\nsunset-villas',
  connect: 'email\nlinkedin\ngithub\nx',
};

function fileKey(path: string): string {
  // 'about/bio' -> '/src/filesystem/about/bio.html'
  return `/src/filesystem/${path}.html`;
}

/**
 * Convert a terminal content file into plain content for the no-JS mirror:
 * metadata comments and decorative SVG logos go, the banner becomes the
 * heading, and the terminal's styling spans collapse to their text.
 */
export function toNoscriptBody(raw: string, base: string): { heading: string; body: string } {
  let html = raw
    .replace(/^(?:<!--\s*\w+:[\s\S]*?-->\s*)+/, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/__BASE__/g, base);

  let heading = '';
  html = html.replace(/<banner>([\s\S]*?)<\/banner>\n?/, (_, text: string) => {
    heading = text.trim();
    return '';
  });

  // Drop the terminal's presentational spans but keep links and images
  html = html.replace(/<\/?span[^>]*>/g, '');

  return { heading, body: html.trim() };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrap(heading: string, body: string): string {
  if (!body.trim()) return '';
  return `<h1>${escapeHtml(heading)}</h1>\n<pre>${body}</pre>`;
}

function episodeNoscript(ep: PodcastEpisode): string {
  const parts = [`<h1>${escapeHtml(ep.title)}</h1>`];
  parts.push(`<p>Published ${escapeHtml(ep.pubDate)} · ${escapeHtml(ep.duration)}</p>`);
  if (ep.audioUrl) {
    parts.push(`<p><a href="${escapeHtml(ep.audioUrl)}">Listen to this episode</a></p>`);
  }
  if (ep.summary) {
    parts.push('<h2>Summary</h2>');
    for (const paragraph of ep.summary.split('\n\n')) {
      parts.push(`<p>${escapeHtml(paragraph)}</p>`);
    }
  }
  if (ep.chapters.length) {
    parts.push('<h2>Chapters</h2>');
    const items = ep.chapters
      .map(ch => `<li>${escapeHtml(ch.time)} — ${escapeHtml(ch.title)}</li>`)
      .join('\n');
    parts.push(`<ul>\n${items}\n</ul>`);
  }
  return parts.join('\n');
}

export function getPodcastEpisodeMeta(ep: PodcastEpisode): PageMeta {
  const path = `podcast/${ep.slug}`;
  return {
    title: `${ep.title} — ${SITE_TITLE}`,
    description: truncate(ep.summary || `${ep.title} — the Not Brothers Podcast.`),
    canonical: absoluteUrl(path),
    ogType: 'article',
    heading: ep.title,
    noscript: episodeNoscript(ep),
  };
}

export interface BlogListEntry {
  slug: string;
  title: string;
  date: string;
  description: string;
}

export interface PageData {
  podcast: PodcastData | null;
  posts: BlogListEntry[];
}

/**
 * Metadata for any non-blog-post path. `podcast` supplies episode data for
 * /podcast/<slug> routes; `posts` backs the /blog listing.
 */
export function getPageMeta(path: string, data: PageData, base: string): PageMeta {
  const { podcast, posts } = data;
  const clean = path.replace(/^\/+|\/+$/g, '');

  const episodeSlug = clean.startsWith('podcast/') ? clean.slice('podcast/'.length) : null;
  if (episodeSlug && episodeSlug !== 'readme') {
    const ep = podcast?.episodes.find(e => e.slug === episodeSlug);
    if (ep) return getPodcastEpisodeMeta(ep);
  }

  const entry = STATIC_PAGES[clean];
  const title = clean === '' ? SITE_TITLE : `${entry?.title ?? clean} — ${SITE_TITLE}`;
  const description = entry?.description ?? DEFAULT_DESCRIPTION;

  let heading = entry?.title ?? clean;
  let noscript = '';

  // The home page is the terminal itself, so mirror the bio and link the rest
  const raw = htmlModules[fileKey(clean === '' ? 'about/bio' : clean)];
  if (clean === '' && raw) {
    const rendered = toNoscriptBody(raw, base);
    const links = ['about/bio', 'resume', 'projects', 'podcast', 'blog', 'connect']
      .map(p => `<li><a href="${absoluteUrl(p)}">${escapeHtml(STATIC_PAGES[p].title)}</a></li>`)
      .join('\n');
    noscript = `<h1>${escapeHtml(SITE_TITLE)}</h1>\n<pre>${rendered.body}</pre>\n<h2>Sections</h2>\n<ul>\n${links}\n</ul>`;
  } else if (raw) {
    const rendered = toNoscriptBody(raw, base);
    heading = rendered.heading || heading;
    noscript = wrap(heading, rendered.body);
  } else if (DIRECTORY_BODIES[clean]) {
    noscript = wrap(heading, escapeHtml(DIRECTORY_BODIES[clean]));
  } else if (clean === 'blog') {
    const items = posts
      .map(
        post =>
          `<li><a href="${absoluteUrl(`blog/${post.slug}`)}">${escapeHtml(post.title)}</a> — ${escapeHtml(post.date)}<br />${escapeHtml(post.description)}</li>`
      )
      .join('\n');
    noscript = `<h1>${escapeHtml(heading)}</h1>\n<ul>\n${items}\n</ul>`;
  } else if (clean === 'podcast/readme' && podcast) {
    noscript =
      `<h1>${escapeHtml(heading)}</h1>\n` +
      `<p>${escapeHtml(podcast.description)}</p>\n` +
      `<p>${escapeHtml(STATIC_PAGES['podcast'].description)}</p>`;
  } else if ((clean === 'podcast' || clean === 'podcast/readme') && podcast) {
    const items = podcast.episodes
      .slice()
      .reverse()
      .map(
        ep =>
          `<li><a href="${absoluteUrl(`podcast/${ep.slug}`)}">${escapeHtml(ep.title)}</a> — ${escapeHtml(ep.pubDate)}</li>`
      )
      .join('\n');
    noscript = `<h1>${escapeHtml(heading)}</h1>\n<ul>\n${items}\n</ul>`;
  }

  return {
    title,
    description,
    canonical: absoluteUrl(clean),
    ogType: 'website',
    heading,
    noscript,
  };
}
