import type { CommandContext } from '../terminal/types';

/**
 * The intro. Every thing named here links to it, so a visitor can leave in
 * whichever direction interests them. Kept on one line — the output block is
 * white-space: pre-wrap, so a hard break here would not reflow on mobile.
 */
export function whoamiOutput(ctx: CommandContext): string {
  const { click } = ctx;

  const oodle = click('Oodle', 'cat projects/oodle', 'tc-link-inline');
  const herald = click('Herald', 'cat projects/herald', 'tc-link-inline');
  const omarchy = click('Omarchy', 'cat projects/omarchy', 'tc-link-inline');
  const villas = click('Sunset Villas', 'cat projects/sunset-villas', 'tc-link-inline');
  const pod = click('Not Brothers Podcast', 'podcast', 'tc-link-inline');

  return `<span class="tc-accent tc-bold" style="font-size:1.1em">Ryan Hughes</span>
<span class="tc-muted">husband · builder · founder · open-source contributor · Fort Lauderdale, FL</span>

I'm Partner and Chief Innovation Officer at ${oodle}, where I lead technology strategy and applied AI for our clients, and build products like ${herald}. When I'm not there I'm on the ${omarchy} core team. I also co-own ${villas} and co-host the ${pod} with my business partner.

<span class="tc-muted">I write on the ${click('blog', 'blog', 'tc-link-inline')}. Find me on <a href="https://github.com/ryanrhughes" target="_blank" rel="noopener noreferrer" class="tc-link">GitHub</a>, <a href="https://x.com/ryanrhughes" target="_blank" rel="noopener noreferrer" class="tc-link">X</a>, and <a href="https://linkedin.com/in/ryanrhughes" target="_blank" rel="noopener noreferrer" class="tc-link">LinkedIn</a>, or just email me at <a href="mailto:ryan@heyoodle.com" class="tc-link">ryan@heyoodle.com</a>.</span>`;
}

export function cmdWhoami(args: string, ctx: CommandContext): string {
  return whoamiOutput(ctx);
}
