English | [中文](README.md)

# kiro-proxy

Use the Claude models bundled with your [Kiro](https://kiro.dev) subscription in Claude Code.

Reads Kiro's auth token, proxies requests to Amazon Q Developer, and exposes OpenAI and Anthropic-compatible API endpoints.

## Prerequisites

Install and log in to Kiro so that `~/.aws/sso/cache/kiro-auth-token.json` exists and is valid.

## Quick Start

```bash
npx kiro-proxy
```

Server listens on `http://localhost:3456` by default.

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `3456` | Listen port |
| `PROXY_API_KEY` | None | When set, all requests must include this key for authentication. No validation when unset |
| `HTTPS_PROXY` | None | HTTP/HTTPS proxy URL, e.g. `http://127.0.0.1:7890` |

## API

### GET /v1/models — List available models

```bash
curl http://localhost:3456/v1/models
```

### POST /v1/messages — Anthropic-compatible

```bash
# Non-streaming
curl http://localhost:3456/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: any" \
  -d '{"model": "claude-sonnet-4.6", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello"}]}'

# Streaming
curl http://localhost:3456/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: any" \
  -d '{"model": "claude-sonnet-4.6", "max_tokens": 1024, "messages": [{"role": "user", "content": "Hello"}], "stream": true}'
```

### POST /v1/chat/completions — OpenAI-compatible

```bash
# Non-streaming
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet-4.6", "messages": [{"role": "user", "content": "Hello"}]}'

# Streaming
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet-4.6", "messages": [{"role": "user", "content": "Hello"}], "stream": true}'
```

### GET /health

Check token status and expiration.

### GET /credits

Query credit usage statistics. Supports `period` parameter:

```bash
# Today's usage (default)
curl http://localhost:3456/credits

# Last 7 days
curl http://localhost:3456/credits?period=7d

# Last 30 days
curl http://localhost:3456/credits?period=30d

# All time
curl http://localhost:3456/credits?period=all
```

## Claude Code Integration

Claude Code uses Anthropic's official model IDs by default. Map them to Q Developer model IDs via environment variables.

Add to `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "any",
    "ANTHROPIC_BASE_URL": "http://localhost:3456",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4.6",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4.6",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4.5"
  },
  "model": "sonnet"
}
```

`model` accepts `sonnet`, `opus`, or `haiku`. Append `[1m]` to enable the 1M context window (e.g. `"opus[1m]"`).

> Note: Do not set the `ANTHROPIC_MODEL` environment variable — it overrides the `model` field and disables context window configuration.

## Proxy Setup

Since May 1, 2026, Claude models on Kiro are unavailable in mainland China, Hong Kong, Macau, and Taiwan. If you encounter an `Invalid model` error, configure a proxy.

> Note: Proxy nodes must be in other regions (e.g. Singapore, Thailand, South Korea).

Set the proxy via environment variable:

```bash
# Start with proxy
HTTPS_PROXY=http://127.0.0.1:7890 npx kiro-proxy
```

Supported environment variables: `HTTPS_PROXY`, `https_proxy`, `HTTP_PROXY`, `http_proxy` (priority from left to right).

## Related Projects

- [kiro-web-search](https://github.com/Colin3191/kiro-web-search) — MCP server exposing Kiro's web search for use in Claude Code and other clients
