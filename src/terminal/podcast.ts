// Fetch and parse podcast RSS feed at build time
const RSS_URL = 'https://api.riverside.fm/hosting/okuCkBP9.rss';

export interface PodcastEpisode {
  title: string;
  slug: string;
  number: number;
  description: string;
  summary: string;
  chapters: { time: string; title: string }[];
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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/^episode\s*\d+\s*[-–—]\s*/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .replace(/-$/, '');
}

function parseChapters(html: string): { time: string; title: string }[] {
  const chapters: { time: string; title: string }[] = [];
  // Match patterns like "00:00 Title" or "00:00:00 Title"
  const regex = /(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)(?:<\/|$)/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    chapters.push({ time: m[1], title: m[2].replace(/<[^>]*>/g, '').trim() });
  }
  return chapters;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function extractSummary(desc: string): string {
  // Look for <b>Summary</b> section
  const summaryMatch = desc.match(/<b>Summary<\/b><\/p><p>(.*?)<\/p>/s);
  if (summaryMatch) return stripHtml(summaryMatch[1]);

  // Otherwise grab the first paragraph that isn't a heading
  const firstP = desc.match(/<p>(?!<b>)(.*?)<\/p>/s);
  if (firstP) return stripHtml(firstP[1]);

  return stripHtml(desc).slice(0, 300);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
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
  // Handle CDATA
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

export async function fetchPodcast(): Promise<PodcastData | null> {
  try {
    const res = await fetch(RSS_URL);
    if (!res.ok) return null;
    const xml = await res.text();

    const channelTitle = xmlText(xml, 'title');
    const channelDesc = xmlText(xml, 'description');
    const author = xmlText(xml, 'itunes:author');
    const imageUrl = xmlAttr(xml, 'itunes:image', 'href');

    // Parse episodes
    const items = xml.split('<item>').slice(1);
    const episodes: PodcastEpisode[] = items.map(item => {
      const title = xmlText(item, 'title');
      const desc = xmlText(item, 'description');
      const pubDate = xmlText(item, 'pubDate');
      const duration = xmlText(item, 'itunes:duration');
      const audioUrl = xmlAttr(item, 'enclosure', 'url');
      const epImageUrl = xmlAttr(item, 'itunes:image', 'href') || imageUrl;
      const epNumber = Number(xmlText(item, 'itunes:episode')) || 0;

      return {
        title,
        slug: slugify(title),
        number: epNumber,
        description: desc,
        summary: extractSummary(desc),
        chapters: parseChapters(desc),
        pubDate: formatDate(pubDate),
        duration: formatDuration(duration),
        audioUrl,
        imageUrl: epImageUrl,
      };
    });

    // Sort by episode number ascending
    episodes.sort((a, b) => a.number - b.number);

    return { title: channelTitle, description: channelDesc, author, imageUrl, episodes };
  } catch (e) {
    console.error('Failed to fetch podcast RSS:', e);
    return null;
  }
}

export function buildEpisodeHtml(ep: PodcastEpisode, prev: PodcastEpisode | null, next: PodcastEpisode | null): string {
  const lines: string[] = [];

  // Header
  lines.push(`<banner>${ep.title}</banner>`);
  lines.push('');
  lines.push(`<span class="tc-muted">Published ${ep.pubDate}  ·  ${ep.duration}</span>`);
  lines.push('');

  // Custom audio player
  const playerId = `player-${ep.slug}`;
  lines.push(`<div class="podcast-player" id="${playerId}" data-src="${ep.audioUrl}"><div class="pp-controls"><button class="pp-play nf" aria-label="Play">&#xf040a;</button><div class="pp-time"><span class="pp-current">0:00</span> / <span class="pp-duration">${ep.duration}</span></div><div class="pp-bar-wrap"><div class="pp-bar"><div class="pp-progress"></div><div class="pp-knob"></div></div></div><button class="pp-mute nf" aria-label="Mute">&#xf057e;</button></div></div>`);
  lines.push('');

  // Summary
  if (ep.summary) {
    lines.push(`<span class="tc-label">Summary</span>`);
    lines.push(ep.summary);
    lines.push('');
  }

  // Chapters
  if (ep.chapters.length > 0) {
    lines.push(`<span class="tc-label">Chapters</span>`);
    for (const ch of ep.chapters) {
      lines.push(`<span class="tc-muted">${ch.time.padEnd(8)}</span> ${ch.title}`);
    }
    lines.push('');
  }

  // Navigation
  lines.push('<span class="tc-muted">─────────────────────────────────</span>');
  const nav: string[] = [];
  if (prev) {
    nav.push(`<span class="tc-click tc-link-inline" data-cmd="cat ~/podcast/${prev.slug}">← ${prev.title}</span>`);
  }
  if (next) {
    nav.push(`<span class="tc-click tc-link-inline" data-cmd="cat ~/podcast/${next.slug}">${next.title} →</span>`);
  }
  if (nav.length) {
    lines.push(nav.join('    '));
  }
  lines.push(`<span class="tc-click tc-link-inline" data-cmd="cd ~/podcast && ls -l">Back to episodes</span>`);

  return lines.join('\n');
}

export function buildPodcastReadme(data: PodcastData): string {
  const lines: string[] = [];
  lines.push(`<img src="${import.meta.env.BASE_URL}images/not-brothers-podcast.png" alt="Not Brothers Podcast" style="width:min(400px,100%);height:auto;margin:0.5em 0;display:block;border-radius:4px" />`);
  lines.push('');
  lines.push(`<span class="tc-yellow tc-bold">No Nonsense Business and Tech Talk.</span> Just two business partners who've survived nearly two decades of client deadlines, all-nighters, stealing each other's fries, and somehow still speaking at family events.`);
  lines.push('');
  lines.push(`In 2009 they co-founded Oodle – a digital marketing agency that started with two laptops, zero clients, and an unhealthy amount of confidence. Sixteen years later it's one of the sharpest independent shops in the country. Along the way they've launched other companies, products, and ideas together.`);
  lines.push('');
  lines.push(`Every week they pull a couple of chairs up to a mic and rip open the exact stuff most podcasts polish to death:`);
  lines.push('');
  lines.push(`  <span class="tc-cyan">•</span> Which new AI and technology tools are actually shipping vs. which ones are just vaporware`);
  lines.push(`  <span class="tc-cyan">•</span> The creative calls that made fortunes and the ones that almost ended them`);
  lines.push(`  <span class="tc-cyan">•</span> The unsexy business decisions that separate "cool startup" from "company that pays its bills"`);
  lines.push(`  <span class="tc-cyan">•</span> Real-time, zero-filter debates, because when you've argued over cap tables with your actual family, you stop pretending to agree`);
  lines.push('');
  lines.push(`<span class="tc-muted">Not Brothers. Just two co-founders who've been mistaken for siblings so often they made it the title.</span>`);
  lines.push('');
  lines.push('<span class="tc-muted">─────────────────────────────────</span>');
  lines.push('');
  lines.push(`<span class="tc-label">Episodes</span>`);
  lines.push('');

  // List episodes newest first
  const sorted = [...data.episodes].reverse();
  for (const ep of sorted) {
    lines.push(`<span class="tc-click tc-link-inline" data-cmd="cat ~/podcast/${ep.slug}">EP ${String(ep.number).padStart(2, '0')}</span>  <span class="tc-muted">${ep.pubDate.padEnd(14)}</span> <span class="tc-muted">${ep.duration.padEnd(7)}</span> ${ep.title.replace(/^Episode\s*\d+\s*[-–—]\s*/i, '')}`);
  }

  return lines.join('\n');
}
