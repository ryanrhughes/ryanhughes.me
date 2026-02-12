import type { FSTree } from './types';

// Import all .html files from src/filesystem/ at build time
const htmlModules = import.meta.glob('/src/filesystem/**/*.html', { query: '?raw', import: 'default', eager: true });

interface FilesystemData {
  fs: FSTree;
  fileContents: Record<string, string>;
}

function parseMetadata(raw: string): { content: string; url?: string } {
  const urlMatch = raw.match(/^<!--\s*url:\s*(.+?)\s*-->\n?/);
  if (urlMatch) {
    return { content: raw.slice(urlMatch[0].length), url: urlMatch[1] };
  }
  return { content: raw };
}

export function buildFilesystem(): FilesystemData {
  const fs: FSTree = {
    '~': { _type: 'dir' } as any,
  };
  const fileContents: Record<string, string> = {};

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
    const { content, url } = parseMetadata(raw as string);
    const fullPath = currentPath === '~' ? `~/${fileName}` : `${currentPath}/${fileName}`;

    if (!fs[currentPath]) fs[currentPath] = { _type: 'dir' } as any;
    const fileEntry: any = { _type: 'file' };
    if (url) fileEntry.url = url;
    fs[currentPath][fileName] = fileEntry;

    fileContents[fullPath] = content;
  }

  return { fs, fileContents };
}
