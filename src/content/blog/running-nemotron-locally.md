---
title: "Running a 120B Parameter Model in My Closet"
date: 2026-03-16
description: "I ran Nvidia's Nemotron 120B locally on consumer hardware and built custom training data from our Airbnb business. Here's what actually happened."
tags: ["ai", "self-hosting", "llm"]
draft: false
---

We spent an afternoon running Nvidia's Nemotron-3-Super-120B locally. Not on a data center GPU cluster — on hardware sitting in a closet in Fort Lauderdale.

The model is a 120B parameter mixture-of-experts that runs in FP4 quantization. That means it fits in about 12GB of VRAM while still being remarkably capable. For context, most people assume you need enterprise hardware to run anything beyond a 7B model.

You don't.

## Why Self-Host?

The obvious question: why bother when Claude and GPT exist?

Because some data shouldn't leave your network. We have an Airbnb rental business with years of guest communications, pricing decisions, occupancy patterns, and operational knowledge. That's proprietary data that's genuinely valuable — and genuinely private.

We assembled training data from that business to create a custom model that understands our specific operation. Try getting that from an API.

## What Actually Happened

Setup took about 30 minutes using LM Studio. The model downloaded, quantized, and loaded without drama. First impressions: it's fast for its size. The mixture-of-experts architecture means only ~12B parameters activate per token, so inference speed is closer to a 12B model than a 120B.

Quality-wise, it sits comfortably between GPT-4-mini and Claude Sonnet for general tasks. For our domain-specific Airbnb queries after fine-tuning? It outperformed both on the things that matter to us.

The honest caveat: context window is limited compared to the frontier APIs. For our use case — short, specific operational queries — that's fine. For writing a novel or analyzing a 200-page document, stick with Claude.

## The Real Takeaway

The gap between "local AI" and "cloud AI" is closing faster than most people realize. A year ago, running anything useful locally meant a $10K+ GPU setup. Today it's consumer hardware and 30 minutes.

The question isn't whether local models are good enough. It's whether your use case has data that shouldn't leave your building.

Ours does.
