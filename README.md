# ryanhughes.me

Personal Astro site, deployed as static assets to the `personal-website` Cloudflare Worker.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The game at `/coin-pusher-astra/` lives in `games/coin-pusher-astra/`, with its own
dependency lockfile and physics/browser checks. The site build installs those locked
dependencies and builds it into `public/coin-pusher-astra/` before Astro copies the
static files to `dist`. The generated game directory is ignored by Git.

Use `npm run build:game` to rebuild only the game. For interactive game development,
run `npm run dev --prefix games/coin-pusher-astra` after the first site build.

```sh
npm run deploy:check
npm run deploy
```

Deployment uses the checked-in account, Worker, and existing custom domain from
`wrangler.jsonc`. It requires Wrangler authentication for the personal Cloudflare account.
