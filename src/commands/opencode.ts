import type { CommandContext } from '../terminal/types';

export function cmdOpencode(_args: string, _ctx: CommandContext): string {
  return `<img src="/ryanhughes/opencode-logo.svg" alt="opencode" style="height:3.5em;margin:0.5em 0 0 1em" />
  <span class="tc-green">The best TUI harness for AI coding.</span>
  <span class="tc-muted">By the Anomaly team. Open source. Runs everywhere.</span>

  <span class="tc-label">Why I use it:</span>
    The best way to interact with AI models from a terminal.
    OpenCode gives you a fast, beautiful TUI that works with
    every major provider — Anthropic, OpenAI, Google, local
    models — and makes switching between them effortless.

    It's not just a chat wrapper. It reads your codebase,
    runs your tools, understands your project via LSP and MCP,
    and ships changes. All from a single binary that starts
    in milliseconds.

  <span class="tc-label">Highlights:</span>
    <span class="tc-purple">TUI</span> — gorgeous terminal interface, fast and keyboard-driven
    <span class="tc-purple">Multi-provider</span> — Claude, GPT, Gemini, local — all of them
    <span class="tc-purple">MCP</span> — native Model Context Protocol for tool use
    <span class="tc-purple">LSP-aware</span> — understands your code, not just your files
    <span class="tc-purple">Go</span> core — single binary, instant startup, no dependencies
    <span class="tc-purple">Desktop</span> — also ships as a native app for non-terminal folks

  <span class="tc-label">Link:</span>   <a href="https://opencode.ai" target="_blank" class="tc-link">opencode.ai</a>
  <span class="tc-label">Source:</span> <a href="https://github.com/anomalyco/opencode" target="_blank" class="tc-link">github.com/anomalyco/opencode</a>

  <span class="tc-muted">// this site was built with opencode. obviously.</span>`;
}
