import { isMobile } from './types';
import {
  PODCAST_RSS_URL,
  parsePodcastFeed,
  type PodcastChapter,
  type PodcastData,
  type PodcastEpisode,
} from '../lib/podcast-rss';

export type { PodcastChapter, PodcastData, PodcastEpisode };

function escPodcast(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function fetchPodcast(): Promise<PodcastData | null> {
  try {
    const res = await fetch(PODCAST_RSS_URL);
    if (!res.ok) return null;
    return parsePodcastFeed(await res.text());
  } catch (e) {
    console.error('Failed to fetch podcast RSS:', e);
    return null;
  }
}

// "45:24" / "1:02:03" -> seconds, for seeking the player
function timeToSeconds(time: string): number {
  return time.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

export function buildEpisodeHtml(ep: PodcastEpisode, prev: PodcastEpisode | null, next: PodcastEpisode | null): string {
  const lines: string[] = [];

  // Header
  lines.push(`<banner>${escPodcast(ep.title)}</banner>`);
  lines.push('');
  lines.push(`<span class="tc-muted">Published ${ep.pubDate}  ·  ${ep.duration}</span>`);
  lines.push('');

  // Custom audio player
  const playerId = `player-${ep.slug}`;
  lines.push(`<div class="podcast-player" id="${playerId}" data-src="${ep.audioUrl}"><div class="pp-controls"><button class="pp-play nf" aria-label="Play">&#xf040a;</button><div class="pp-time"><span class="pp-current">0:00</span> / <span class="pp-duration">${ep.duration}</span></div><div class="pp-bar-wrap"><div class="pp-bar"><div class="pp-progress"></div><div class="pp-knob"></div></div></div><button class="pp-mute nf" aria-label="Mute">&#xf057e;</button></div></div>`);
  lines.push('');

  // Summary — paragraphs are separated by blank lines
  if (ep.summary) {
    lines.push(`<span class="tc-label">Summary</span>`);
    lines.push(escPodcast(ep.summary));
    lines.push('');
  }

  // Chapters — timestamp column, with wrapped titles hanging under the title.
  // Each row carries data-seek so the player above can jump to it.
  if (ep.chapters.length > 0) {
    // Episodes over an hour use h:mm:ss, so size the column to the feed
    const timeWidth = Math.max(...ep.chapters.map(ch => ch.time.length));
    const indent = timeWidth + 2;
    lines.push(`<span class="tc-label">Chapters</span>`);
    // Joined with no separator: the output block is white-space:pre-wrap, so a
    // newline between two display:block spans would render as a blank line.
    lines.push(ep.chapters.map(ch =>
      `<span class="tc-chapter tc-chapter-link" data-seek="${timeToSeconds(ch.time)}"` +
      ` role="button" tabindex="0" aria-label="Play from ${ch.time} — ${escPodcast(ch.title)}"` +
      ` style="padding-left:${indent}ch;text-indent:-${indent}ch">` +
      `<span class="pp-chapter-time">${ch.time.padStart(timeWidth)}</span>  ${escPodcast(ch.title)}</span>`
    ).join(''));
    lines.push('');
  }

  // Navigation
  lines.push('<span class="tc-muted">─────────────────────────────────</span>');
  if (prev) {
    lines.push(`<span class="tc-click tc-link-inline" data-cmd="cat ~/podcast/${prev.slug}">Previous: ${escPodcast(prev.title)}</span>`);
  }
  if (next) {
    lines.push(`<span class="tc-click tc-link-inline" data-cmd="cat ~/podcast/${next.slug}">Next: ${escPodcast(next.title)}</span>`);
  }
  lines.push('');
  lines.push(`<span class="tc-click tc-link-inline" data-cmd="cd ~/podcast && ls -l">All Episodes</span>`);

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
  const mobile = isMobile();
  for (const ep of sorted) {
    if (mobile) {
      lines.push(`<span class="tc-click tc-link-inline" data-cmd="cat ~/podcast/${ep.slug}">EP ${String(ep.number).padStart(2, '0')}</span>  ${escPodcast(ep.title.replace(/^Episode\s*\d+\s*[-–—]\s*/i, ''))}`);
    } else {
      lines.push(`<span class="tc-click tc-link-inline" data-cmd="cat ~/podcast/${ep.slug}">EP ${String(ep.number).padStart(2, '0')}</span>  <span class="tc-muted">${ep.pubDate.padEnd(14)}</span> <span class="tc-muted">${ep.duration.padEnd(7)}</span> ${escPodcast(ep.title.replace(/^Episode\s*\d+\s*[-–—]\s*/i, ''))}`);
    }
  }

  return lines.join('\n');
}
