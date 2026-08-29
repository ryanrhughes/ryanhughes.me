import type { CommandContext } from '../terminal/types';

/**
 * The elevator pitch, in the shape DHH uses on dhh.dk: one dense sentence
 * where every clause is a link into the thing it names, so a visitor can
 * leave in whichever direction interests them.
 */
export function whoamiOutput(ctx: CommandContext): string {
  const { click } = ctx;

  const cio = click('Chief Innovation Officer at Oodle', 'cat projects/oodle', 'tc-link-inline');
  const herald = click('creator of Herald', 'cat projects/herald', 'tc-link-inline');
  const omarchy = click('core team on Omarchy', 'cat projects/omarchy', 'tc-link-inline');
  const villas = click('co-owner of Sunset Villas', 'cat projects/sunset-villas', 'tc-link-inline');
  const pod = click('co-host of the Not Brothers Podcast', 'podcast', 'tc-link-inline');

  return `<span class="tc-accent tc-bold" style="font-size:1.1em">Ryan Hughes</span>
<span class="tc-muted">husband · builder · founder · open-source contributor · Fort Lauderdale, FL</span>

I'm ${cio}, ${herald}, ${omarchy}, ${villas}, and ${pod}.

<span class="tc-muted">I write on the ${click('blog', 'blog', 'tc-link-inline')} and talk shop on the ${click('podcast', 'podcast', 'tc-link-inline')}. Find me on <a href="https://github.com/ryanrhughes" target="_blank" rel="noopener noreferrer" class="tc-link">GitHub</a>, <a href="https://x.com/ryanrhughes" target="_blank" rel="noopener noreferrer" class="tc-link">X</a>, and <a href="https://linkedin.com/in/ryanrhughes" target="_blank" rel="noopener noreferrer" class="tc-link">LinkedIn</a>, or email <a href="mailto:ryan@heyoodle.com" class="tc-link">ryan@heyoodle.com</a>.</span>`;
}

export function cmdWhoami(args: string, ctx: CommandContext): string {
  return whoamiOutput(ctx);
}
