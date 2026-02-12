import type { CommandContext } from '../terminal/types';

export function cmdMan(args: string, ctx: CommandContext): { output: string; error?: boolean } {
  const { click } = ctx;
  if (args.toLowerCase() === 'ryan') {
    return { output: `<span class="tc-yellow">RYAN(1)</span>                    <span class="tc-muted">User Commands</span>                    <span class="tc-yellow">RYAN(1)</span>

<span class="tc-yellow">NAME</span>
       ryan — husband, builder, founder, open-source contributor

<span class="tc-yellow">SYNOPSIS</span>
       <span class="tc-white">ryan</span> [--build] [--break] [--fix] [--repeat]

<span class="tc-yellow">DESCRIPTION</span>
       Partner & CIO at ${click('Oodle', 'cat projects/oodle', 'tc-link-inline')}. Co-founder of ${click('Third Helix', 'cat projects/third-helix', 'tc-link-inline')}.
       Core contributor to ${click('Omarchy', 'cat projects/omarchy', 'tc-link-inline')}. Runs ${click('luxury vacation rentals', 'cat projects/sunset-villas', 'tc-link-inline')} near
       Disney & Universal. Lives in Fort Lauderdale with his wife
       and two dogs.

<span class="tc-yellow">OPTIONS</span>
       <span class="tc-white">--coffee</span>     Required.
       <span class="tc-white">--dogs</span>       ${click('Remus', 'cat about/dogs/remus', 'tc-link-inline')}, ${click('Arthas José', 'cat about/dogs/arthas', 'tc-link-inline')} (supermutt)
       <span class="tc-white">--verbose</span>    Has opinions. Will share them.
       <span class="tc-white">--edge</span>       Runs everything on master/edge/beta. Stable is boring.

<span class="tc-yellow">ENVIRONMENT</span>
       <span class="tc-white">OS</span>           Omarchy (btw)
       <span class="tc-white">EDITOR</span>       neovim
       <span class="tc-white">SHELL</span>        fish + tmux
       <span class="tc-white">WM</span>           Hyprland
       <span class="tc-white">LOCATION</span>     Fort Lauderdale, FL

<span class="tc-yellow">BUGS</span>
       Cannot stop starting new projects. Runs everything on
       master — production is the only environment that matters.
       Caffeine dependency classified as critical infrastructure.

<span class="tc-yellow">SEE ALSO</span>
       ${click('resume.txt', 'cat resume.txt', 'tc-link-inline')}, ${click('connect/', 'cat connect/', 'tc-link-inline')}, <a href="https://heyoodle.com" target="_blank" class="tc-link">heyoodle.com</a>, <a href="https://x.com/ryanrhughes" target="_blank" class="tc-link">@ryanrhughes</a>` };
  }

  return {
    output: `<span class="tc-red">No manual entry for ${ctx.escapeHtml(args)}</span>\n<span class="tc-muted">Try: ${click('man ryan', 'man ryan', 'tc-link-inline')}</span>`,
    error: true
  };
}
