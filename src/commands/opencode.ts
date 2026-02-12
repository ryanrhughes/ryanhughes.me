import type { CommandContext } from '../terminal/types';

export function cmdOpencode(_args: string, _ctx: CommandContext): string {
  return `<img src="/ryanhughes/opencode-logo.svg" alt="opencode" style="height:3.5em;margin:0.5em 0" />

  <span class="tc-green">The terminal-native AI coding agent.</span>
  <span class="tc-muted">By the SST team. Open source. Runs everywhere.</span>

  <span class="tc-label">Why I use it:</span>
    OpenCode is fucking awesome. It's fast, it's terminal-native,
    it doesn't try to be an IDE — it <span class="tc-accent">is</span> the IDE. You point it at
    a codebase and it just <span class="tc-green">works</span>. No browser tabs, no electron
    bloat, no "please wait while we index your project."

    It thinks in code. It reads your files. It runs your tests.
    It ships your PRs. It does this from a terminal because
    that's where real work happens.

  <span class="tc-label">Stack:</span>
    <span class="tc-purple">Go</span> core — fast startup, low memory, single binary
    <span class="tc-purple">TUI</span> — beautiful terminal interface (not a web wrapper)
    <span class="tc-purple">Multi-provider</span> — Anthropic, OpenAI, local models
    <span class="tc-purple">MCP</span> — native Model Context Protocol support
    <span class="tc-purple">LSP-aware</span> — understands your code, not just your files

  <span class="tc-label">Link:</span>   <a href="https://opencode.ai" target="_blank" class="tc-link">opencode.ai</a>
  <span class="tc-label">Source:</span> <a href="https://github.com/sst/opencode" target="_blank" class="tc-link">github.com/sst/opencode</a>

  <span class="tc-muted">// this site was built with opencode. obviously.</span>`;
}
