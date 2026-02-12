import type { CommandContext } from '../terminal/types';

export function cmdCowsay(args: string, ctx: CommandContext): string {
  const msg = args || 'moo';
  const len = Math.min(msg.length, 40);
  const top = ' ' + '_'.repeat(len + 2);
  const bot = ' ' + '-'.repeat(len + 2);
  const padded = msg.length <= 40 ? msg : msg.substring(0, 37) + '...';
  return `<span class="tc-muted">${top}
< ${padded}${' '.repeat(Math.max(0, len - padded.length))} >
${bot}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||</span>`;
}
