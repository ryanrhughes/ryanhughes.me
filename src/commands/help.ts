import type { CommandContext } from '../terminal/types';

export function cmdHelp(args: string, ctx: CommandContext): string {
  const { click } = ctx;
  return `<span class="tc-purple">Available Commands</span>

  ${click('help', 'help', 'tc-cmd')}             show this help message
  ${click('ls', 'ls', 'tc-cmd')} <span class="tc-muted">[path]</span>         list directory contents
  ${click('cd', 'cd ~', 'tc-cmd')} <span class="tc-muted">&lt;dir&gt;</span>          change directory
  ${click('cat', 'cat resume.txt', 'tc-cmd')} <span class="tc-muted">&lt;file&gt;</span>        read file contents
  ${click('open', 'open resume.txt', 'tc-cmd')} <span class="tc-muted">&lt;file&gt;</span>       open file / URLs in new tab
  ${click('pwd', 'pwd', 'tc-cmd')}              print working directory
  ${click('whoami', 'whoami', 'tc-cmd')}           who are you?
  ${click('man ryan', 'man ryan', 'tc-cmd')}         the man page
  ${click('neofetch', 'neofetch', 'tc-cmd')}         system info
  ${click('htop', 'htop', 'tc-cmd')}             process list
  ${click('history', 'history', 'tc-cmd')}          command history
  ${click('uptime', 'uptime', 'tc-cmd')}           session uptime
  ${click('cowsay', 'cowsay moo', 'tc-cmd')} <span class="tc-muted">&lt;text&gt;</span>      make the cow say things
  ${click('clear', 'clear', 'tc-cmd')}            clear terminal
  ${click('exit', 'exit', 'tc-cmd')}             try it and see

<span class="tc-muted">Tip: Click any highlighted text to run commands.
     Tab completion and arrow key history work too.</span>`;
}
