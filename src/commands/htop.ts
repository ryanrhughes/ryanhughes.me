import { isMobile } from '../terminal/types';
import type { CommandContext } from '../terminal/types';

export function cmdHtop(args: string, ctx: CommandContext): string {
  const { click } = ctx;

  if (isMobile()) {
    return `<span class="tc-white tc-bold"> %CPU  COMMAND</span>
<span class="tc-green"> 85.2  ${click('oodle', 'cat projects/oodle', 'tc-link-inline')}</span>
<span class="tc-green"> 72.1  ${click('third-helix', 'cat projects/third-helix', 'tc-link-inline')}</span>
<span class="tc-green"> 65.8  ${click('omarchy', 'cat projects/omarchy', 'tc-link-inline')}</span>
<span class="tc-yellow"> 45.3  ${click('sunset-villas', 'cat projects/sunset-villas', 'tc-link-inline')}</span>
<span class="tc-yellow"> 99.9  coffee-daemon</span>
<span class="tc-muted"> 30.0  dog-petting-service</span>
<span class="tc-muted"> 15.0  3d-print-slicer</span>
<span class="tc-red">  0.0  sleeping [SUSPENDED]</span>

<span class="tc-muted">Tasks: 8 total, 5 running, 2 sleeping, 1 suspended
Load average: just right</span>`;
  }

  return `<span class="tc-white tc-bold">  PID USER      PR  NI    VIRT    RES  %CPU %MEM  TIME+ COMMAND</span>
<span class="tc-green"> 1337 ryan      20   0  420.0m  69.0m  85.2  4.2  9999+ ${click('oodle', 'cat projects/oodle', 'tc-link-inline')}</span>
<span class="tc-green">  420 ryan      20   0  256.0m  42.0m  72.1  3.1  8888+ ${click('third-helix', 'cat projects/third-helix', 'tc-link-inline')}</span>
<span class="tc-green">  100 ryan      20   0  512.0m  88.0m  65.8  5.5  7777+ ${click('omarchy', 'cat projects/omarchy', 'tc-link-inline')}</span>
<span class="tc-yellow">  777 ryan      20   0  128.0m  32.0m  45.3  2.0  6666+ ${click('sunset-villas', 'cat projects/sunset-villas', 'tc-link-inline')}</span>
<span class="tc-yellow">    2 ryan      20   0   64.0m  16.0m  99.9  1.0  ∞     coffee-daemon</span>
<span class="tc-muted">    3 ryan      20   0   32.0m   8.0m  30.0  0.5  4444+ dog-petting-service</span>
<span class="tc-muted">    4 ryan      20   0   16.0m   4.0m  15.0  0.2  3333+ 3d-print-slicer</span>
<span class="tc-red">    5 ryan      20   0    8.0m   2.0m   0.0  0.1     0  sleeping [SUSPENDED]</span>

<span class="tc-muted">Tasks: 8 total, 5 running, 2 sleeping, 1 permanently suspended
Load average: just right</span>`;
}
