---
title: "Running a 120B Parameter Model in My Closet"
date: 2026-03-16
description: "I deployed NVIDIA's Nemotron 120B on a single GPU workstation and used it as my daily driver for a weekend. Here's the real performance data and where it falls apart."
tags: ["ai", "self-hosting", "llm", "nvidia"]
draft: false
---

I ran NVIDIA's Nemotron-3-Super-120B-A12B-NVFP4 as my primary AI model for an entire weekend. Not a benchmark. Real work — [OpenClaw](https://github.com/openclaw/openclaw) agent tasks, [OpenCode](https://github.com/opencode-ai/opencode) coding sessions, the same stuff I normally throw at Claude Opus or GPT 5.3-Codex.

One GPU. A closet in Fort Lauderdale. An RTX Pro 6000 Blackwell Max-Q Workstation Edition.

## How It's Running

Nemotron 120B is a mixture-of-experts model — 120B total parameters, but only ~12B activate per token. You get the knowledge of a massive model with the speed of something much smaller. NVIDIA ships it in NVFP4 quantization so it fits on a single GPU.

I'm running it through [vLLM](https://github.com/vllm-project/vllm) — OpenAI-compatible API, chunked prefill, prefix caching, the works. Here's the full launch script:

```bash
#!/bin/bash
export TORCH_FLOAT32_MATMUL_PRECISION=high
export VLLM_USE_DEEP_GEMM=1
export TORCH_CUDA_ARCH_LIST="12.0"
export VLLM_USE_FLASHINFER_MOE_FP4=1
export VLLM_FLASHINFER_MOE_BACKEND=throughput

# Reasoning parser plugin (NVIDIA super_v3)
MODEL_DIR="$HOME/.cache/huggingface/hub/models--nvidia--NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4"
PLUGIN_PATH="$MODEL_DIR/super_v3_reasoning_parser.py"
if [[ ! -f "$PLUGIN_PATH" ]]; then
  echo "[nemotron] Downloading reasoning parser plugin..."
  mkdir -p "$MODEL_DIR"
  curl -sL -o "$PLUGIN_PATH" \
    "https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4/resolve/main/super_v3_reasoning_parser.py"
fi

CUDA_VISIBLE_DEVICES=0 ~/vllm-env/bin/vllm serve \
  nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4 \
  --port 8000 \
  --gpu-memory-utilization 0.90 \
  --max-model-len 262144 \
  --trust-remote-code \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder \
  --reasoning-parser-plugin "$PLUGIN_PATH" \
  --reasoning-parser super_v3 \
  --async-scheduling \
  --max-num-seqs 8 \
  --enable-chunked-prefill \
  --enable-prefix-caching
```

256K context window. Auto tool calling. Reasoning tokens separated from output.

The workstation sits on my [Tailscale](https://tailscale.com) network, so I hit it from anywhere — my laptop, my Proxmox server running OpenClaw, wherever. Just an OpenAI-compatible endpoint at `http://barracuda:8000/v1`. Point any tool at it and go.

## The Numbers

Over a weekend of actual use:

- **50–60 tokens/second** consistently, high of 74 tok/s
- **Sub-1 second TTFT**, even with ~50K tokens of context loaded
- **262K context** available — a few OpenClaw sessions maxed it out
- **Multiple concurrent sequences** — ran 3-4 at a time without issues

That throughput is faster than most cloud API calls once you factor in network latency. No rate limiting, no usage caps, no per-token billing. Once you own the hardware, inference is free — though "own the hardware" means swallowing ~$9.5K per GPU plus the rest of the system. Not nothing.

## What Actually Happened

I pointed OpenClaw at it and let it handle my usual workload — Discord messages, file management, shell commands, research. For the routine stuff that makes up most of my daily AI usage, it was fine. You wouldn't know it wasn't a frontier model.

Simple coding worked. Writing scripts, editing configs, generating boilerplate — all clean. It could summarize docs, explain concepts, do basic tool-use tasks without any issues.

Then I pushed it.

Complex multi-turn jobs — where you need the model to maintain context, make judgment calls, adapt strategy mid-conversation — it got lost. Not subtly. It would lose the thread, repeat itself, or make decisions that showed it wasn't tracking the full picture. Claude Opus handles this effortlessly. Nemotron does not.

The coding had a similar pattern. It could write code, but not the kind of code you'd ship. Edge cases missed. Error handling as an afterthought. Functional, but without the polish I'm used to from frontier models.

## The Typo That Broke It

This one perfectly illustrates the gap.

I was exploring a Rails project and typed: *"Analyze this project and give me a synopsis of iv"* — meaning "it." A typo.

Any frontier model would figure that out from context instantly.

Nemotron spent about 10 minutes searching the entire codebase for references to "iv." Running `find` commands. Grepping files. Checking if "iv" was a module, a variable, a concept. Completely committed to the bit.

When I corrected it with "it*" — it shifted to searching for the word "it" in the codebase, then gave me an "I.T. Infrastructure Overview."

That's my fault for the typo. But it says everything about where local models are right now versus frontier. We're spoiled by models that handle ambiguity and intent without thinking about it. Local models are literal in ways that catch you off guard.

## So Is It Worth It?

Nemotron on a single GPU is not replacing Claude Opus. That's not the question.

The question is whether it's good enough for the 70% of tasks that don't need frontier intelligence — and it is. Scripts, research, routine agent work, conversational tasks. All fine. 50-60 tok/s with sub-second time to first token and a 256K context window, running on hardware I already own.

I'm going to keep running it alongside my frontier models and see where the actual boundary settles. The interesting thing isn't that local models are catching up to frontier — they're not. It's that "good enough" covers way more ground than I expected.
