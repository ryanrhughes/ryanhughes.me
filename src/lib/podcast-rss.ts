// Shared RSS parsing for the Not Brothers podcast feed.
// Imported by the terminal runtime and by the Astro pages that inline
// #podcast-data at build time, so the feed is parsed the same way everywhere.

export const PODCAST_RSS_URL = 'https://api.riverside.fm/hosting/okuCkBP9.rss';

export interface PodcastChapter {
  time: string;
  title: string;
}

export interface PodcastEpisode {
  title: string;
  slug: string;
  number: number;
  description: string;
  summary: string;
  chapters: PodcastChapter[];
  pubDate: string;
  duration: string;
  audioUrl: string;
  imageUrl: string;
}

export interface PodcastData {
  title: string;
  description: string;
  author: string;
  imageUrl: string;
  episodes: PodcastEpisode[];
}

// Episodes in this feed mark up chapters six different ways — <br />-separated,
// <p>-per-chapter, <ul><li>, inside <pre><code> with newlines, with the heading
// in <b>, in <p>, or absent entirely. Normalizing to plain lines first collapses
// all of those into one case.
const CHAPTERS_HEADING = /(?:<b>|<p>|<h[1-6]>)\s*chapters:?\s*(?:<\/b>|<\/p>|<\/h[1-6]>)/i;
const CHAPTER_LINE = /^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—:]?\s*(.+)$/;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d',
};

// Callers escape this text again on the way into the DOM, so entities have to
// be decoded here or they render double-escaped.
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] !== '#') return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    const code = body[1] === 'x' || body[1] === 'X'
      ? parseInt(body.slice(2), 16)
      : parseInt(body.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : match;
  });
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).trim();
}

function toLines(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|div|h[1-6]|pre)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map(l => decodeEntities(l).trim())
    .filter(Boolean);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/^episode\s*\d+\s*[-–—]\s*/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .replace(/-$/, '');
}

export function parseChapters(html: string): PodcastChapter[] {
  const lines = toLines(html);
  // Prefer everything after a "Chapters" heading; episodes that omit the
  // heading just list the timestamps at the end of the description.
  const headingIdx = lines.findIndex(l => /^chapters:?$/i.test(l));
  const section = headingIdx === -1 ? lines : lines.slice(headingIdx + 1);

  const chapters: PodcastChapter[] = [];
  for (const line of section) {
    // "00:00 — Title", "00:00 - Title" and "00:00 Title" all show up here
    const m = line.match(CHAPTER_LINE);
    if (m) chapters.push({ time: m[1], title: m[2].trim() });
  }

  return chapters;
}

export function extractSummary(desc: string): string {
  const beforeChapters = desc.split(CHAPTERS_HEADING)[0];
  const firstBlock = beforeChapters.match(/<p>(?!\s*<b>)([\s\S]*?)<\/p>/);
  const source = firstBlock ? firstBlock[1] : beforeChapters;

  const text = decodeEntities(
    source
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
  ).trim();

  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim().replace(/\s*\n\s*/g, ' '))
    .filter(Boolean);

  // Feeds end the summary with a dangling label ("Explore Omarchy:") whose
  // links live in a later <p> we don't render.
  while (paragraphs.length > 1) {
    const last = paragraphs[paragraphs.length - 1];
    if (last.endsWith(':') && last.length < 60) paragraphs.pop();
    else break;
  }

  return paragraphs.join('\n\n');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatDuration(dur: string): string {
  // "00:46:53" -> "46 min"
  const parts = dur.split(':').map(Number);
  if (parts.length === 3) {
    const [h, m] = parts;
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  }
  return dur;
}

function xmlText(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1];

  const re = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'is');
  const match = xml.match(re);
  return match ? match[1].trim() : '';
}

function xmlAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i');
  const match = xml.match(re);
  return match ? match[1] : '';
}

export function parsePodcastFeed(xml: string): PodcastData {
  const channelTitle = xmlText(xml, 'title');
  const channelDesc = stripHtml(xmlText(xml, 'description')).split('.').slice(0, 2).join('.') + '.';
  const author = xmlText(xml, 'itunes:author');
  const imageUrl = xmlAttr(xml, 'itunes:image', 'href');

  const episodes: PodcastEpisode[] = xml.split('<item>').slice(1).map(item => {
    const title = xmlText(item, 'title');
    const desc = xmlText(item, 'description');

    return {
      title,
      slug: slugify(title),
      // Not every item carries <itunes:episode>; the title is the fallback,
      // otherwise those episodes sort to the front as number 0.
      number: Number(xmlText(item, 'itunes:episode')) || Number(title.match(/^episode\s*(\d+)/i)?.[1]) || 0,
      description: desc,
      summary: extractSummary(desc),
      chapters: parseChapters(desc),
      pubDate: formatDate(xmlText(item, 'pubDate')),
      duration: formatDuration(xmlText(item, 'itunes:duration')),
      audioUrl: xmlAttr(item, 'enclosure', 'url'),
      imageUrl: xmlAttr(item, 'itunes:image', 'href') || imageUrl,
    };
  }).sort((a, b) => a.number - b.number);

  return { title: channelTitle, description: channelDesc, author, imageUrl, episodes };
}
