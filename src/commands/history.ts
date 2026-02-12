import type { CommandContext } from '../terminal/types';

export function cmdHistory(args: string, ctx: CommandContext): string {
  const { commandHistory, click, escapeHtml } = ctx;
  if (commandHistory.length === 0) return '<span class="tc-muted">No commands in history yet.</span>';
  return commandHistory.map((c, i) =>
    `<span class="tc-muted">${String(i + 1).padStart(4)}</span>  ${click(escapeHtml(c), c, 'tc-link-inline')}`
  ).join('\n');
}
