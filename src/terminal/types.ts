export interface FSEntry {
  _type: 'dir' | 'file';
  url?: string;
  [key: string]: any;
}

export interface FSTree {
  [path: string]: FSEntry & { [name: string]: FSEntry };
}

export interface CommandContext {
  cwd: string;
  commandHistory: string[];
  startTime: number;
  fs: FSTree;
  fileContents: Record<string, string>;
  click: (label: string, cmd: string, cls?: string) => string;
  dirClick: (name: string, path: string) => string;
  fileClick: (name: string, path: string) => string;
  escapeHtml: (s: string) => string;
  resolvePath: (input: string) => string;
}
