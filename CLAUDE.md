# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

kiro-proxy is a Node.js proxy that bridges Kiro IDE with Amazon Q Developer. It reads Kiro's auth token from `~/.aws/sso/cache/kiro-auth-token.json`, proxies requests to Q Developer, and exposes OpenAI and Anthropic-compatible API endpoints so Claude models can be used via Claude Code.

## Running

```bash
# Install deps (lock file is pnpm)
pnpm install

# Start the server (default port 3456, override with PORT env var)
node server.js

# Or via the CLI command after npm link / global install
kiro-proxy
```

No build step, no tests, no linter configured. Pure ES modules (`"type": "module"`), requires Node >= 18.

## Architecture

Source files, each with a single responsibility:

- **server.js** — Express server exposing API endpoints. Handles request/response format translation and streaming (SSE). Caches the Q Developer client and reuses it when the token hasn't changed.
- **q-client.js** — Wraps `@aws/codewhisperer-streaming-client`. Converts Anthropic message format → CodeWhisperer format (messages, images, tools, thinking blocks). Streams response events back as an async generator.
- **token-reader.js** — Reads and refreshes Kiro auth tokens. Supports Social (Google/GitHub OAuth) and IdC (Enterprise/BuilderId) auth flows. Caches in memory, auto-refreshes 5 minutes before expiry, deduplicates concurrent refresh calls.
- **token-counter.js** — Heuristic token estimator for Anthropic-style content (text/tool_use/tool_result/thinking). Applies per-category multipliers (CJK, emoji, math symbols, URL delimiters, etc.). Used only for `usage.input_tokens` / `output_tokens` in responses — not billing.
- **usage-tracker.js** — Appends one JSONL line per request to `~/.kiro-proxy/usage/YYYY/MM/DD.jsonl` with `{ts, credits, model}`. Powers the `/credits` endpoint; supports `today | 7d | 30d | all` periods.
- **logger.js** — ANSI-colored console logger: `log()` for HTTP lines, `tagLog/tagWarn/tagError` for tagged messages, `logSummary()` for the per-request summary line with elapsed/context/tokens/credits.
- **proxy-config.js** — Reads `HTTPS_PROXY`/`HTTP_PROXY` and installs `undici`'s `EnvHttpProxyAgent` globally plus exposes an `https-proxy-agent` for the CodeWhisperer client.

Request flow: Client → Express endpoint → `getAccessToken()` → `getClient()` (cached) → `convertMessages()` → `chatStream()`/`chat()` → format response back to client.

## API Endpoints

- `POST /v1/messages` — Anthropic Messages API (streaming + non-streaming)
- `POST /v1/chat/completions` — OpenAI Chat Completions API (streaming + non-streaming)
- `GET /v1/models` — List available models (Anthropic format)
- `GET /q/models` — Raw Q Developer model list
- `GET /health` — Token expiration status
- `GET /credits?period=today|7d|30d|all` — Credit usage summary (requests, credits, byModel)

All endpoints are protected by a Bearer-token middleware if `PROXY_API_KEY` is set; otherwise open.

## Environment

- `PORT` — listen port (default `3456`)
- `PROXY_API_KEY` — if set, clients must send `Authorization: Bearer <key>`
- `KIRO_VERSION` — User-Agent version string (default `0.11.107`)
- `HTTPS_PROXY` / `HTTP_PROXY` — outbound proxy for Q Developer calls (applied globally via undici)

## Key Implementation Details

- Token is read from `~/.aws/sso/cache/kiro-auth-token.json`, enriched with profile ARN from Kiro's profile cache
- Region and endpoint are derived from the profile ARN
- Tool use inputs arrive as streamed chunks that get accumulated and JSON-parsed at tool_use_end
- Image content supports base64, data URLs, and LangChain formats
- `usage.input_tokens` / `output_tokens` in responses come from the heuristic `token-counter.js`, not from upstream. Actual billing uses `meteringUsage` reported by CodeWhisperer and is persisted by `usage-tracker.js`.
- SSE streaming in `/v1/messages` carefully sequences `thinking` → `text` → `tool_use` blocks, closing each before opening the next, and emits the full tool-use `input` as a single `input_json_delta` at `tool_use_end`.
