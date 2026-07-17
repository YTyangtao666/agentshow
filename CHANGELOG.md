# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **CORS hardened**: Replace `Access-Control-Allow-Origin: *` with per-request Origin whitelist matching. Dev mode still allows all origins for convenience.
- **Selector injection protection**: Added `isValidSelector()` — rejects selectors containing `<script>` tags, `javascript:`, `expression()`, `url()`, and hex escape sequences. Applied in both `validatePlan` (server-side) and `findElement` (client-side defense-in-depth).
- **WSHandler concurrency fix**: Switched from instance-level `cancelled`/`resolveStep` to `WeakMap<WebSocket, SessionState>`. Multiple concurrent WS connections no longer interfere.

### Improved
- **WebSocket reconnection**: Exponential backoff with jitter (1s → 30s cap), unlimited retries, graceful `destroy()` method, and connection status events (`connected`/`reconnecting`/`disconnected`).
- **LLM request timeout**: `AbortController` with 30s default. Configurable via `ai.timeout` in config. Throws descriptive timeout error.
- **SPA navigation**: `navigate` action now supports `condition` + `timeout` for waiting on dynamically rendered elements after route change.
- **Type safety**: Removed `as any` assertion in `planner.ts` — replaced with proper `CachedStep` type annotation.

### Added
- **19 new unit tests** (28 total): selector security, LLM client, WSHandler session isolation, PlanCache CRUD.
- **CHANGELOG.md**, **CONTRIBUTING.md**.

## [0.1.0] — 2026-07-15

### Added
- Core: selector generator, cache key, security validation, utils (delay, generateToken, isAllowedOrigin, clamp).
- Shared: WS protocol types (ClientMessage/ServerMessage), Plan/Action types, Config types.
- Server: CLI (init/start/stop), WebSocket server, LLM client (DeepSeek/OpenAI/GLM/Ollama), plan cache, planner with demo mode.
- Widget: Shadow DOM chat widget, DOM scanner (with Shadow DOM + iframe traversal), action executor (click/type/wait/navigate/highlight/scroll), visual effects (highlight/ripple/narrate).
- Demo plan matchers for InkMuse pages.
- MIT License.
