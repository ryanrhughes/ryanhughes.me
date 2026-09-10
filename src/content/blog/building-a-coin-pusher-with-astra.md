---
title: "I Built a 3D Coin Pusher with Astra in About an Hour"
date: 2026-09-10
description: "A few prompts, about an hour, and a playable arcade game with real coin physics, swimming fish, and a shark that bumps the machine."
tags: ["ai", "astra", "experiments", "games"]
draft: false
---

I built a playable 3D coin pusher with Astra in about an hour. The kind of machine you stand in front of at an arcade, drop coins into, and convince yourself that the pile hanging over the edge is definitely going to fall on the next turn.

[You can play it here.](/coin-pusher-astra/)

![Deep Sea Gold Rush, the underwater coin pusher built with Astra](/images/blog/coin-pusher-astra/game.webp)

I started by describing the SpongeBob and Marvel coin pushers as references. I wanted to insert coins, watch them collide and fall naturally, hit specials, and feel like I was standing at an actual cabinet. I also wanted a slightly questionable nudge button, because obviously.

A few prompts got the game going. Then I played it and kept asking for changes. Most of the direction was as informal as this:

> add fish floating around and maybe like a shark that comes every so often and hits a machine.

So now there are fish swimming around it, and a shark occasionally comes over and bumps the cabinet hard enough to move the coin pile. That might be my favorite part. 😅

The useful part of the process was being able to react to something I could actually play. The early bonus mechanic was too easy: a coin could pass near the target and trigger it. I wanted it to bounce through moving pegs and actually land inside a little cup. Astra changed the game to do that.

Then I realized that aiming at the same spot over and over wasn't particularly interesting:

> I also think instead of being able to aim and just drop in the same place, the aim should be moving back and forth and you're having to time the drop

The chute now sweeps across the machine. You time the release. There's a short delay between drops, and the indicator is a lit coin slot built into the cabinet.

I spent a fair amount of the iteration making it harder. The side targets paid out five and ten coins so often that you basically couldn't run out. We removed them and kept one small treasure cup. Catch a coin there and it stays stuck until the shark knocks it loose. Each release earns a gem; three gems pay the jackpot.

There were things to correct along the way, too. Alerts covered the falling coins. A floating “DROP HERE” label looked out of place. When we added scoring, the jackpot got changed to points without paying coins into the pocket. I hit it, noticed the missing payout, and had that fixed.

That's a pretty good description of how I like building with these tools: ask for something, try it, notice what's wrong, explain what I meant. The prompts were mostly feedback about the experience.

The game uses Three.js for the 3D scene, Rapier for physics, and Lucide for icons. Those are its three runtime dependencies. TypeScript and Vite handle the build, and it deploys as static files on this site. The physics runs in your browser; playing doesn't call an AI model or need a game server.

It's still an experiment, and I'm sure the balance could use more work. But going from “I want an arcade coin pusher” to playing one with a shark that occasionally helps you cheat, in about an hour, is a pretty fun way to spend an afternoon.

[Give it a few coins.](/coin-pusher-astra/)
