import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const gameDirectory = fileURLToPath(new URL('../games/coin-pusher-astra/', import.meta.url));
const base = `${process.env.PREVIEW ? '/ryanhughes' : ''}/coin-pusher-astra/`;
const installEnvironment = { ...process.env };
// npm run exports .npmrc policy as an environment override, which newer npm
// rejects for nested installs. Let npm read the original policy files instead.
for (const key of Object.keys(installEnvironment)) {
  if (key.toLowerCase() === 'npm_config_allow_scripts') delete installEnvironment[key];
}

// Keep the game's dependencies and lockfile separate from the Astro site.
execFileSync('npm', ['ci', '--include=dev', '--no-audit', '--no-fund'], { cwd: gameDirectory, stdio: 'inherit', env: installEnvironment });
execFileSync('npm', ['run', 'build', '--', `--base=${base}`, '--outDir=../../public/coin-pusher-astra', '--emptyOutDir'], {
  cwd: gameDirectory,
  stdio: 'inherit',
});
