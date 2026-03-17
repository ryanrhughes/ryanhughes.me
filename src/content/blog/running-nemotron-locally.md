---
title: "Running a 120B Parameter Model in My Closet"
date: 2026-03-16
description: "I deployed NVIDIA's Nemotron 120B on a single GPU workstation and used it as my daily driver for a weekend. Here's the real performance data and where it falls apart."
tags: ["ai", "self-hosting", "llm", "nvidia"]
draft: false
---

I spent the weekend running NVIDIA's Nemotron-3-Super-120B-A12B-NVFP4 as my primary AI model. Not a quick benchmark — actually using it for real work through [OpenClaw](https://github.com/openclaw/openclaw) and [OpenCode](https://github.com/opencode-ai/opencode), doing the same tasks I normally throw at Claude Opus or GPT 5.3-Codex.

The hardware: an RTX Pro 6000 Blackwell Max-Q Workstation Edition sitting in a closet in Fort Lauderdale. One GPU. No cluster. No cloud.

## The Setup

Nemotron 120B is a mixture-of-experts model with 120B total parameters, but only ~12B activate per token. That's the trick — you get the knowledge capacity of a massive model with inference characteristics closer to a 12B. NVIDIA ships it in NVFP4 quantization, so it fits comfortably on a single GPU.

I deployed it with [vLLM](https://github.com/vllm-project/vllm), which handles the OpenAI-compatible API, chunked prefill, prefix caching, and all the other infrastructure you'd otherwise have to build yourself. The full launch script:

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

256K context window. Auto tool calling. Reasoning tokens separated from output. The whole thing.

The workstation sits on my [Tailscale](https://tailscale.com) network, so I can hit it from any machine in the house (or anywhere, really) — my laptop, my Proxmox server running OpenClaw, wherever. It's just an OpenAI-compatible endpoint at `http://barracuda:8000/v1`. Point any tool at it and go.

## The Numbers

Here's what I actually observed over a weekend of real usage:

- **Throughput:** Mostly 50–60 tokens/second, with a high of 74 tok/s
- **TTFT:** Generally under 1 second, even with ~50K tokens of context loaded
- **Context:** 262K tokens available, used up to ~80K in practice
- **Concurrency:** Handled 8 simultaneous sequences without breaking a sweat

For context, that throughput is faster than most cloud API calls when you factor in network latency. And there's no rate limiting, no usage caps, no per-token billing. Once you own the hardware, inference is free.

## Where It Shines

For straightforward tasks — the kind of work that makes up 70% of what I do with AI — Nemotron is genuinely good:

- **Simple coding tasks:** Writing scripts, editing configs, generating boilerplate. Did the job fine.
- **Research and summarization:** Reading docs, pulling together information, explaining concepts. Solid.
- **Conversational tasks:** System administration, file operations, basic tool use through OpenClaw. Reliable.

I had it running as my OpenClaw model for the whole weekend — handling Discord messages, managing files, running shell commands. For routine operations, you wouldn't know it wasn't a frontier model.

## Where It Falls Apart

But then you push it, and the edges show.

**Complex multi-turn reasoning:** When tasks required maintaining context across many turns, making judgment calls, or adapting strategy mid-conversation — it got lost. Claude Opus or GPT 5.3-Codex would have navigated these smoothly. Nemotron would lose the thread, repeat itself, or make decisions that showed it wasn't really tracking the full picture.

**Coding with polish:** It could write code, but it lacked the finesse I'm used to from frontier models. Edge cases got missed. Error handling was an afterthought. The code worked, but it wasn't the kind of code you'd ship without review.

**The typo incident:** This one illustrates the gap perfectly. I was exploring a Rails project and typed "Analyze this project and give me a synopsis of iv" — meaning "it." A typo. Any frontier model would have figured that out instantly from context.

Nemotron did not.

It spent about 10 minutes searching the entire codebase for references to "iv." Running `find` commands. Grepping files. Checking if "iv" was a module, a variable, a concept. When I corrected it with "it*" — it shifted to searching for the word "it" in the codebase, then delivered an "I.T. Infrastructure Overview."

Partially my fault for the typo. But it perfectly illustrates how spoiled we've gotten with frontier models that handle ambiguity and intent effortlessly. Local models are literal in ways that surprise you.

## The Real Takeaway

Nemotron 120B on consumer hardware is not a replacement for Claude Opus. It's not trying to be. But it's remarkably capable for a model running on a single GPU in a closet — and the performance characteristics (sub-second TTFT, 50-60 tok/s, 256K context) make it genuinely usable for real work.

The question isn't "is it as good as the frontier?" It's "is it good enough for *this* task?" And for a surprising number of tasks, the answer is yes.

I'm going to keep running it alongside my frontier models and see where the boundary actually is. The gap between local and cloud is closing faster than most people expect — not because local models are reaching frontier quality, but because the bar for "good enough" is lower than we think.

More to come as I keep putting it through its paces.
