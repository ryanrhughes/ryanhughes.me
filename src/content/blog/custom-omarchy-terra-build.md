---
title: "Building a Ridiculous Omarchy PC in a Fractal Terra"
date: 2026-05-17
description: "I built a custom Omarchy machine inside a Fractal Terra with a Ryzen 9 9950X3D, RTX 5090, Noctua low-profile cooler, and almost no unused space."
tags: ["omarchy", "linux", "pc-build", "hardware"]
draft: false
---

Omarchy runs fantastic on pre-builds, but I wanted to see what would happen if I went the other direction entirely.

Tiny case. Stupid amount of compute. Linux-first. No compromise if I could help it.

The case was the easy choice: [Fractal Terra](https://www.fractal-design.com/products/cases/terra/terra/terra-jade/) in Jade. I don't think there's a better looking small form factor case out there, and the color felt especially fitting after staring at the Osaka Jade theme in Omarchy for so long.

![Fractal Terra in Jade](/images/blog/custom-omarchy-terra-build/01-terra-jade.jpg)

## The Parts That Matter

This was never going to be a quiet little media PC tucked under a TV. The goal was to pack workstation-class power into something that looks like it belongs on a shelf.

The CPU is an [AMD Ryzen 9 9950X3D](https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9950x3d.html): 16 cores, 32 threads, and a frankly absurd amount of performance for a machine this small.

![AMD Ryzen 9 9950X3D](/images/blog/custom-omarchy-terra-build/04-ryzen-9950x3d.jpg)

The motherboard is a tiny ASUS ROG ITX board. Photos don't really do the scale justice, so yes, I found a banana.

![ASUS ROG ITX motherboard with banana for scale](/images/blog/custom-omarchy-terra-build/03-asus-rog-banana.jpg)

The one miss: I didn't pay enough attention to the Wi-Fi chip. This board uses the MediaTek 7927, which doesn't currently have working Linux kernel support for Wi-Fi or Bluetooth. Not a problem for me since this machine is wired, but if you're building something similar and need wireless, check the chip before buying. Future me would appreciate past me doing that homework.

## Cooling Was the Whole Game

Massive compute requires massive cooling, which gets funny when the case is smaller than some air coolers.

I went with the Noctua NH-L12Sx77. It fits, but barely. This is the kind of fit where you close the panel and quietly thank every mechanical engineer involved.

![Noctua NH-L12Sx77 cooler](/images/blog/custom-omarchy-terra-build/07-noctua-l12sx77.jpg)

![Tight cooler clearance inside the Terra](/images/blog/custom-omarchy-terra-build/06-cooler-tight-fit.jpg)

The NVMe install also turned into one of those tiny-case moments where you realize a single forgotten step means taking half the machine apart again.

![NVMe buried under the motherboard stack](/images/blog/custom-omarchy-terra-build/05-nvme-stack.jpg)

Small form factor builds are mostly normal PC building until suddenly they're not. Then every millimeter matters.

## The 5090 Problem

What complements a monster CPU better than a monster GPU?

An NVIDIA RTX 5090, obviously.

The problem is that dumping 600W of heat directly into the back of the motherboard felt like a pretty terrible plan. So I flipped the GPU and used a reverse mount plate mod to exhaust the hot air outward instead of using the motherboard as a space heater.

A little 3D printing solved a problem that probably shouldn't exist in a case this small, but that's half the fun.

![RTX 5090 reverse mount plate mod](/images/blog/custom-omarchy-terra-build/08-rtx-5090-reverse-mount.jpg)

At this point there really wasn't unused space left in the case. I think this legally counts as turning the Terra into a heatsink.

![Fully packed Fractal Terra interior](/images/blog/custom-omarchy-terra-build/09-space-check.jpg)

## Installing Omarchy

Once the hardware was together, the software part was almost boring — in the best possible way.

The most annoying step was figuring out where ASUS hid the Secure Boot toggle. It took longer to disable Secure Boot than it did to install the entire OS.

![ASUS BIOS Secure Boot settings](/images/blog/custom-omarchy-terra-build/10-secure-boot.jpg)

Omarchy formatted the 4TB NVMe and installed the full system, including NVIDIA drivers, in just under three minutes.

Booted straight in. No settings to tweak. No package list to babysit. No "now go spend the rest of your evening fixing graphics drivers" ritual.

Just Linux, ready to use, on a ridiculous little machine.

![Omarchy installer complete](/images/blog/custom-omarchy-terra-build/11-omarchy-installed.jpg)

![Omarchy desktop running on the custom build](/images/blog/custom-omarchy-terra-build/12-omarchy-desktop.jpg)

## Thermals

The thermals ended up better than expected.

With the GPU flipped so it's exhausting out of the case, normal workload temps looked completely reasonable even on the silent fan curve.

![Thermals during normal workload on the silent fan curve](/images/blog/custom-omarchy-terra-build/13-thermals.png)

That's the part I was most curious about. It's one thing to make the parts physically fit. It's another thing to make the machine usable without sounding like it's trying to leave the room.

## Was This Practical?

Not really.

But it worked.

The Terra was surprisingly easy to build in for something this compact. The Omarchy install was faster than the BIOS spelunking. NVIDIA worked out of the box. The cooling setup didn't immediately turn into a tiny emerald furnace. And the whole thing is now a genuinely powerful Linux machine in a case that looks way too calm for what's happening inside it.

That's exactly the kind of unnecessary-but-useful build I love.

Original X thread: [x.com/ryanrhughes/status/1966937223955358083](https://x.com/ryanrhughes/status/1966937223955358083)
