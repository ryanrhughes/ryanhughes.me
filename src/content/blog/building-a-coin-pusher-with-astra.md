---
title: "I Built a 3D Coin Pusher with Astra in About an Hour"
date: 2026-09-10
description: "I wanted to put Astra through its paces. A coin pusher turned out to be a pretty good test: 3D rendering, animation, physics, and a jackpot that needed some restraint."
tags: ["ai", "astra", "experiments", "games"]
draft: false
---

I wanted to see what Astra could do, so I had it build a 3D arcade coin pusher. About an hour later, I was playing it.

I happen to be a big fan of coin pushers, especially the SpongeBob machines at arcades. I can stand there for way too long convincing myself that the pile hanging over the edge is definitely going to fall on the next turn. So this was a pretty easy choice for something I'd actually want to play. 😅

[You can play it here.](/coin-pusher-astra/)

![Deep Sea Gold Rush, the underwater coin pusher built with Astra](/images/blog/coin-pusher-astra/game.webp)

It's also a surprisingly good test for a new frontier model. You've got 3D rendering, animation, collision detection, gravity, and all the game logic that ties those things together. A coin needs to fall, bounce off something, land in a pile, and move other coins when the pusher comes forward. If one of those pieces is wrong, you feel it immediately.

Then it has to be fun. Getting the physics working is only part of it; the timing, rewards, and controls all affect whether you want to drop another coin.

My first prompt described the SpongeBob and Marvel coin pushers as references. I wanted it to feel like standing in front of an actual cabinet, right down to a slightly questionable button for nudging the machine to knock coins loose.

A few prompts got the game going. From there, I played it and asked for changes. Some of those were just because they sounded fun:

> add fish floating around and maybe like a shark that comes every so often and hits a machine.

So now fish swim around the cabinet, and a shark occasionally comes over and bumps it hard enough to move the coin pile. I'm pretty happy that made it into the game.

We definitely had to revise things over that hour. In the first version, you could basically sit there and SPAM jackpots. The targets were too easy to hit, coins kept pouring back into your pocket, and there wasn't much reason to care where you dropped them.

We made the chute move back and forth so you have to time your drop, added a short delay between coins, and removed the overly generous side targets. Now you're aiming for one small treasure cup. Catch a coin there and it stays put until the shark knocks it loose. Three of those catches and releases earn the jackpot.

At this point, it's a reasonably decent little game that I'm happy with. You can run out of coins. You can chase a high score. And yes, you can get penalized for nudging the machine too much.

Underneath it, Three.js handles the 3D scene and Rapier handles the physics. The whole thing runs in your browser, with no AI calls or game server needed to play.

After about an hour, I was pretty impressed. There's a lot that has to work together to turn a request like this into a playable game, and every revision touches some of those same pieces. Changing how a coin gets caught affects the physics, the animation, and when the reward gets paid.

That's what this experiment illustrated for me: how far frontier models have come in taking a complex task, working through the dependent parts, and turning it into something usable. I could play what it made, explain what felt wrong, and keep refining it in the same conversation.

I'm excited to see what the next models bring to the table.

[Give it a few coins.](/coin-pusher-astra/)
