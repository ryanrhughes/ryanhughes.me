import type { FSTree } from './types';
import { buildEpisodeHtml, buildPodcastReadme, type PodcastData } from './podcast';

// Import all .html files from src/filesystem/ at build time
const htmlModules = import.meta.glob('/src/filesystem/**/*.html', { query: '?raw', import: 'default', eager: true });

interface FilesystemData {
  fs: FSTree;
  fileContents: Record<string, string>;
}

function makeBanner(text: string): string {
  return `<span class="tc-banner" role="heading" aria-level="2">${text}</span>`;
}

function expandBanners(html: string): string {
  return html.replace(/<banner>(.*?)<\/banner>/g, (_, text) => makeBanner(text.trim()));
}

interface FileMetadata {
  content: string;
  url?: string;
  icon?: string;
}

function parseMetadata(raw: string): FileMetadata {
  const meta: FileMetadata = { content: raw };
  // Parse frontmatter comments: <!-- key: value -->
  let text = raw;
  while (true) {
    const m = text.match(/^<!--\s*(\w+):\s*(.+?)\s*-->\n?/);
    if (!m) break;
    const [full, key, val] = m;
    if (key === 'url') meta.url = val;
    else if (key === 'icon') meta.icon = val;
    text = text.slice(full.length);
  }
  meta.content = expandBanners(text);
  return meta;
}

export function buildFilesystem(): FilesystemData {
  const fs: FSTree = {
    '~': { _type: 'dir' } as any,
  };
  const fileContents: Record<string, string> = {};

  // Inject podcast data if available
  const podcastEl = document.getElementById('podcast-data');
  if (podcastEl) {
    try {
      const podcastData: PodcastData = JSON.parse(podcastEl.textContent || '');
      if (podcastData && podcastData.episodes.length > 0) {
        // Create ~/podcast/ directory
        fs['~']['podcast'] = { _type: 'dir' } as any;
        fs['~/podcast'] = { _type: 'dir' } as any;

        // Build readme with full description + episode index
        const readmeHtml = buildPodcastReadme(podcastData);
        fs['~/podcast']['readme'] = { _type: 'file', icon: '\uf02d' } as any;
        fileContents['~/podcast/readme'] = expandBanners(readmeHtml);

        for (let i = 0; i < podcastData.episodes.length; i++) {
          const ep = podcastData.episodes[i];
          const prev = i > 0 ? podcastData.episodes[i - 1] : null;
          const next = i < podcastData.episodes.length - 1 ? podcastData.episodes[i + 1] : null;

          fs['~/podcast'][ep.slug] = { _type: 'file', icon: '\uf001' } as any;
          const html = buildEpisodeHtml(ep, prev, next);
          fileContents[`~/podcast/${ep.slug}`] = expandBanners(html);
        }
      }
    } catch (e) {
      console.warn('Failed to parse podcast data:', e);
    }
  }

  for (const [modulePath, raw] of Object.entries(htmlModules)) {
    // modulePath: /src/filesystem/projects/oodle.html
    // Convert to virtual path: ~/projects/oodle
    const relative = modulePath.replace('/src/filesystem/', '');
    const parts = relative.replace(/\.html$/, '').split('/');

    // Handle secrets.html -> .secrets
    let fileName = parts[parts.length - 1];
    if (fileName === 'secrets') fileName = '.secrets';
    // Handle bio.html -> bio.txt, resume.html -> resume.txt
    if (fileName === 'bio') fileName = 'bio.txt';
    if (fileName === 'resume') fileName = 'resume.txt';

    parts[parts.length - 1] = fileName;

    // Build directory entries
    let currentPath = '~';
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      // Ensure parent dir has this child
      if (!fs[currentPath]) fs[currentPath] = { _type: 'dir' } as any;
      if (!fs[currentPath][dirName]) {
        fs[currentPath][dirName] = { _type: 'dir' } as any;
      }
      currentPath = currentPath === '~' ? `~/${dirName}` : `${currentPath}/${dirName}`;
      if (!fs[currentPath]) fs[currentPath] = { _type: 'dir' } as any;
    }

    // Add file entry
    const { content, url, icon } = parseMetadata(raw as string);
    const fullPath = currentPath === '~' ? `~/${fileName}` : `${currentPath}/${fileName}`;

    if (!fs[currentPath]) fs[currentPath] = { _type: 'dir' } as any;
    const fileEntry: any = { _type: 'file' };
    if (url) fileEntry.url = url;
    if (icon) fileEntry.icon = icon;
    fs[currentPath][fileName] = fileEntry;

    fileContents[fullPath] = content;
  }

  return { fs, fileContents };
}
