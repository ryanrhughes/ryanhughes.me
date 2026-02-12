import type { CommandContext } from '../terminal/types';

export function cmdBuiltin(command: string, args: string, ctx: CommandContext): { output: string; error?: boolean } | null {
  const { click, escapeHtml, cwd } = ctx;

  switch (command) {
    case 'pwd':
      return { output: `<span class="tc-muted">/home/ryan${cwd === '~' ? '' : cwd.replace('~', '')}</span>` };

    case 'whoami':
      return { output: `<span class="tc-green">visitor</span> <span class="tc-muted">(but you seem cool)</span>` };

    case 'exit':
      return { output: `<span class="tc-purple">There is no escape.</span>\n<span class="tc-muted">You live here now. Try ${click('help', 'help', 'tc-link-inline')} instead.</span>` };

    case 'sudo':
      return {
        output: `<span class="tc-red">nice try.</span>\n<span class="tc-muted">visitor is not in the sudoers file. This incident will be reported.</span>`,
        error: true
      };

    case 'rm':
      return {
        output: args.includes('-rf')
          ? `<span class="tc-red">rm: nice try, but no.</span>\n<span class="tc-muted">🔥 *distant explosion noises* 🔥\n\n...just kidding. Everything's fine. Probably.</span>`
          : `<span class="tc-red">rm: permission denied (and also no)</span>`,
        error: true
      };

    case 'n':
      return { output: `<span class="tc-cyan">Oh!</span> <span class="tc-muted">You must be an Omarchy user... nice.</span>\n<span class="tc-muted">But no nvim here — this terminal is read-only. Try ${click('cat', 'cat resume.txt', 'tc-link-inline')} instead.</span>` };

    case 'vim': case 'nvim':
      return { output: `<span class="tc-green">Good choice.</span> <span class="tc-muted">But this terminal doesn't have vim.\nTry ${click('cat', 'cat resume.txt', 'tc-link-inline')} instead — it's read-only here.</span>` };

    case 'emacs':
      return { output: `<span class="tc-red">We can't be friends.</span>` };

    case 'nano':
      return { output: `<span class="tc-yellow">I mean... it works, I guess.</span> <span class="tc-muted">But we both know you can do better.</span>` };

    case 'r':
      return { output: `<span class="tc-cyan">Oh!</span> <span class="tc-muted">An Omarchy user in the wild. Respect.</span>\n\n<span class="tc-red">🛤️  Rails is the answer.</span> <span class="tc-muted">The question doesn't matter.</span>\n\n<span class="tc-muted">Convention over configuration. Monoliths over microservices.\nShip on Friday. Sleep on Saturday. That's the way.</span>\n\n<span class="tc-green">Want to see what I build with it?</span> Try ${click('cat projects/oodle', 'cat projects/oodle', 'tc-link-inline')}` };

    case 'rails':
      return { output: `<span class="tc-red">🛤️  Rails is the answer.</span> <span class="tc-muted">The question doesn't matter.</span>\n\n<span class="tc-muted">Convention over configuration. Monoliths over microservices.\nShip on Friday. Sleep on Saturday. That's the way.</span>\n\n<span class="tc-green">Want to see what I build with it?</span> Try ${click('cat projects/oodle', 'cat projects/oodle', 'tc-link-inline')}` };

    case 'echo':
      return { output: `<span class="tc-muted">${escapeHtml(args.replace(/^["']|["']$/g, ''))}</span>` };

    case 'ping':
      return { output: `<span class="tc-muted">PING ${escapeHtml(args)} (127.0.0.1): 56 data bytes\n64 bytes: icmp_seq=0 ttl=64 time=0.042ms</span>\n<span class="tc-green">yeah, it works.</span>` };

    case 'ssh':
      return {
        output: `<span class="tc-red">ssh: connect to host ${escapeHtml(args || 'nowhere')}: Connection refused</span>\n<span class="tc-muted">You're already inside the machine.</span>`,
        error: true
      };

    case 'date':
      return { output: `<span class="tc-muted">${new Date().toString()}</span>` };

    default:
      return null;
  }
}
