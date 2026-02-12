import type { CommandContext } from '../terminal/types';

export function cmdUptime(args: string, ctx: CommandContext): string {
  const elapsed = Date.now() - ctx.startTime;
  const secs = Math.floor(elapsed / 1000);
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const display = hrs > 0
    ? `${hrs}h ${mins % 60}m ${secs % 60}s`
    : mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;
  return `<span class="tc-muted">Session uptime: ${display}
Visitor arrived: ${new Date(ctx.startTime).toLocaleString()}
Side projects running: too many
Coffee consumed: yes</span>`;
}
