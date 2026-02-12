import type { CommandContext } from '../terminal/types';

export function cmdNeofetch(args: string, ctx: CommandContext): string {
  const { click } = ctx;

  if (window.innerWidth < 640) {
    return `<span class="tc-cyan"> 8 888888888o.   8 8888   8
 8 8888    \`88.  8 8888   8
 8 8888     \`88  8 8888   8
 8 8888     ,88  8 8888   8
 8 8888.   ,88'  8 8888   8
 8 888888888P'   8 8888   8
 8 8888\`8b       8 88888888
 8 8888 \`8b.     8 8888   8
 8 8888   \`8b.   8 8888   8
 8 8888    \`88.  8 8888   8</span>

<span class="tc-muted">─── Hardware ───</span>
<span class="tc-cyan nf">&#xf124;</span> Fort Lauderdale, FL
<span class="tc-cyan nf">&#xf0b1;</span> Partner &amp; CIO @ ${click('Oodle', 'cat projects/oodle', 'tc-link-inline')}
<span class="tc-cyan nf">&#xf0ad;</span> ${click('Third Helix', 'cat projects/third-helix', 'tc-link-inline')} (co-founder)
<span class="tc-cyan nf">&#xf303;</span> ${click('Omarchy', 'cat projects/omarchy', 'tc-link-inline')} (core contributor)
<span class="tc-cyan nf">&#xf015;</span> ${click('Sunset Villas', 'cat projects/sunset-villas', 'tc-link-inline')} (co-owner)
<span class="tc-muted">─── Stack ───</span>
<span class="tc-cyan nf">&#xf0c2;</span> Cloudflare, Google
<span class="tc-cyan nf">&#xf121;</span> Ruby on Rails, Astro, Bash
<span class="tc-cyan nf">&#xf085;</span> AI/ML enthusiast
<span class="tc-muted">─── Personal ───</span>
<span class="tc-cyan nf">&#xf1b0;</span> ${click('Remus', 'cat about/dogs/remus', 'tc-link-inline')} + ${click('Arthas José', 'cat about/dogs/arthas', 'tc-link-inline')}
<span class="tc-cyan nf">&#xf1fc;</span> Tokyo Night <span style="color:#f7768e">●</span><span style="color:#ff9e64">●</span><span style="color:#e0af68">●</span><span style="color:#9ece6a">●</span><span style="color:#7dcfff">●</span><span style="color:#7aa2f7">●</span><span style="color:#bb9af7">●</span><span style="color:#c0caf5">●</span>`;
  }

  return `<span class="tc-cyan"> 8 888888888o.      8 8888        8 </span>   <span class="tc-muted">─── Hardware ───</span>
<span class="tc-cyan"> 8 8888    \`88.     8 8888        8 </span>   <span class="tc-cyan nf">&#xf124;</span> Fort Lauderdale, FL
<span class="tc-cyan"> 8 8888     \`88     8 8888        8 </span>   <span class="tc-cyan nf">&#xf0b1;</span> Partner &amp; CIO @ ${click('Oodle', 'cat projects/oodle', 'tc-link-inline')}
<span class="tc-cyan"> 8 8888     ,88     8 8888        8 </span>   <span class="tc-cyan nf">&#xf0ad;</span> ${click('Third Helix', 'cat projects/third-helix', 'tc-link-inline')} (co-founder)
<span class="tc-cyan"> 8 8888.   ,88'     8 8888        8 </span>   <span class="tc-cyan nf">&#xf303;</span> ${click('Omarchy', 'cat projects/omarchy', 'tc-link-inline')} (core contributor)
<span class="tc-cyan"> 8 888888888P'      8 8888        8 </span>   <span class="tc-cyan nf">&#xf015;</span> ${click('Sunset Villas', 'cat projects/sunset-villas', 'tc-link-inline')} (co-owner)
<span class="tc-cyan"> 8 8888\`8b          8 8888888888888 </span>   <span class="tc-muted">─── Stack ───</span>
<span class="tc-cyan"> 8 8888 \`8b.        8 8888        8 </span>   <span class="tc-cyan nf">&#xf0c2;</span> Cloudflare, Google
<span class="tc-cyan"> 8 8888   \`8b.      8 8888        8 </span>   <span class="tc-cyan nf">&#xf121;</span> Ruby on Rails, Astro, Bash
<span class="tc-cyan"> 8 8888    \`88.     8 8888        8 </span>   <span class="tc-cyan nf">&#xf085;</span> AI/ML enthusiast
                                       <span class="tc-muted">─── Personal ───</span>
                                       <span class="tc-cyan nf">&#xf1b0;</span> ${click('Remus', 'cat about/dogs/remus', 'tc-link-inline')} + ${click('Arthas José', 'cat about/dogs/arthas', 'tc-link-inline')}
                                       <span class="tc-cyan nf">&#xf1fc;</span> Tokyo Night <span style="color:#f7768e">●</span><span style="color:#ff9e64">●</span><span style="color:#e0af68">●</span><span style="color:#9ece6a">●</span><span style="color:#7dcfff">●</span><span style="color:#7aa2f7">●</span><span style="color:#bb9af7">●</span><span style="color:#c0caf5">●</span>`;
}
