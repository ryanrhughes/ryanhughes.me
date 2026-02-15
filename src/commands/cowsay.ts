import { isMobile } from '../terminal/types';
import type { CommandContext } from '../terminal/types';

export function cmdCowsay(args: string, ctx: CommandContext): string {
  const msg = ctx.escapeHtml(args) || 'moo';
  const maxLen = isMobile() ? 25 : 40;
  const len = Math.min(msg.length, maxLen);
  const top = ' ' + '_'.repeat(len + 2);
  const bot = ' ' + '-'.repeat(len + 2);
  const padded = msg.length <= maxLen ? msg : msg.substring(0, maxLen - 3) + '...';
  return `<span class="tc-muted">${top}
< ${padded}${' '.repeat(Math.max(0, len - padded.length))} >
${bot}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||</span>`;
}
