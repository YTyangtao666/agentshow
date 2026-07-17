---
name: agentshow-development
description: Development conventions, architecture, and pitfalls for the AgentShow (OpenClaw) web demo assistant — a tool that lets AI agents operate web pages via natural language with visual effects.
---

# AgentShow Development

## Project Location
`~/Desktop/agentshow/` — pnpm/npm monorepo, TypeScript ESM.

## Architecture (3-layer)
1. **Widget** (browser-injected, Shadow DOM isolated) — chat UI + DOM scanner + action executor + visual effects
2. **Server** (Node.js WebSocket + HTTP) — LLM client + plan cache + plan generation + widget.js static serving
3. **CLI** (commander) — init/start/stop commands

## Package Structure
```
packages/
  shared/   — type contracts (WS protocol, Plan/Action, Config) — NO runtime code
  core/     — pure utils: generateSelector, getCacheKey, validatePlan, delay, generateToken
  cli/      — commander commands (init creates config, start launches server+injects widget, stop kills)
  server/   — WebSocket server, LLM client (DeepSeek/OpenAI/GLM), plan cache (file-based), planner (prompt→JSON plan)
  widget/   — Shadow DOM chat widget, DOM scanner, action executor, effects (highlight/ripple/narrate)
```

## Key Design Decisions
- Widget uses **Shadow DOM** (`attachShadow({ mode: 'open' })`) for complete CSS isolation
- DOM scanner **penetrates Shadow DOM and same-origin iframes** recursively
- Elements get `data-agentshow-index` attribute for index-based selector fallback
- Plan cache is file-based (`~/.agentshow/cache/`), keyed by `md5(intent)_md5(url)`
- Server serves widget bundle at `/widget.js` (IIFE format via tsup)
- WS protocol: token auth via URL query param, origin whitelist

## Pitfalls

### tsx + top-level await = CJS error
**Problem:** `npx tsx script.ts` with top-level `await` fails:
```
SyntaxError: await is currently not supported with the "cjs" output format
```
**Fix:** Wrap top-level code in `async function main() { ... } main();` OR rename file to `.mts` to force ESM mode.

### tsup bundle naming
`tsup src/index.ts --format iife --global-name initAgentShow` outputs `dist/index.global.js` (NOT `dist/widget.js`). Server path must match.

### tsup IIFE global-name does NOT set window.X (CRITICAL)
**Problem:** `tsup --format iife --global-name initAgentShow` produces:
```js
var initAgentShow = (() => { ... return __toCommonJS(index_exports); })();
```
This creates a **module object** (not a function) as a local `var`, NOT `window.initAgentShow`. When loaded via `<script>` tag, the auto-init code inside the closure DOES run, but `window.initAgentShow` is `undefined` — so you can't call it manually from outside.
Also, the return value is `__toCommonJS(index_exports)` which wraps exports — so even `initAgentShow` itself is an object like `{ initAgentShow: [Function] }`, not the function directly.
**WORKING FIX (verified):** Create a separate `entry-browser.ts` that explicitly assigns to globalThis:
```ts
import { AgentShowApp } from './app.js';
function initAgentShow(options) { ... new AgentShowApp(options); }
// THIS LINE IS CRITICAL — without it, the function never reaches window
;(globalThis as any).initAgentShow = initAgentShow;
```
Then build: `tsup src/entry-browser.ts --format iife --global-name initAgentShow --out-dir dist`
After this fix, `window.initAgentShow` is a `function` (not `undefined`) and auto-init works when `window.__AGENTSHOW__` is set before script loads.
**Injection method:** Must use `<script src="http://localhost:9100/widget.js">` (normal script tag). Do NOT use `fetch() + eval()` — IIFE bundles may fail with "Illegal return statement" or similar errors in eval context.

### Widget auto-init pattern
Widget checks `window.__AGENTSHOW__` global for auto-init config (port + token). The inject script sets this before loading widget.js.

### Widget WS connection race condition (FIXED)
**Problem:** Original code did `await ws.connect()` BEFORE creating/showing UI. If WS fails, FAB never appears.
**Fix:** Show widget UI immediately in constructor, register WS handlers, THEN attempt `ws.connect()`. If connect fails, show error message but UI is already visible.

### Circular import in widget
`app.ts` must NOT `import type { InitOptions } from './index.js'` — index.ts imports app.ts, creating circular dep. Define InitOptions inline in app.ts instead.

### Dynamic import() breaks in IIFE bundle
`import('./app.js')` in index.ts does NOT work inside tsup IIFE bundle — there's no module system to resolve it. Must use static `import { AgentShowApp } from './app.js'` instead.

### node:crypto breaks browser bundle (CRITICAL)
**Problem:** `@agentshow/core` used `import { createHash } from 'node:crypto'` and `require('node:crypto')`. When tsup bundles this into the widget IIFE for browser, it produces:
```
Dynamic require of "crypto" is not supported
```
The script silently fails to load — `window.initAgentShow` stays `undefined` with no visible error in console.
**Fix:** Replace ALL Node-only imports in packages that get bundled for browser:
- `cache-key.ts`: replace `createHash('md5')` with a simple `djb2()` string hash function
- `utils.ts` `generateToken()`: use `crypto.randomUUID()` (Web Crypto API, available in browser + Node 19+) with `Math.random` fallback, remove `require('node:crypto')` entirely
- After fix, verify with `grep -c "require(" dist/entry-browser.global.js` — must be 0

### Server query param breaks static file serving
**Problem:** Browser `<script src>` may add cache-buster params: `GET /widget.js?t=1234567890`. Server checks `if (req.url === '/widget.js')` → misses because `req.url` is `/widget.js?t=123...`.
**Fix:** Strip query string before matching:
```ts
const reqUrl = (req.url ?? '/').split('?')[0];
if (reqUrl === '/widget.js') { ... }
```

### WebSocket dev token + origin bypass (CRITICAL)
**Problem 1 (401 Unauthorized):** Server generates a UUID token via `generateToken()`. Browser widget connects with empty token. Even with `if (token && clientToken !== token)` check, token is non-empty (it's a UUID), so empty clientToken !== UUID → connection rejected with code 4001.
**Fix:** Add `dev?: boolean` to `AgentShowConfig.server`. When `dev: true`, use empty token: `const token = config.server.dev ? '' : generateToken();`

**Problem 2 (403 Forbidden):** Even after token fix, WS gets closed with code 4003 "Forbidden". The origin check fails because browser may send origin as IPv6 (`http://[::1]:5175`) or the Origin header doesn't match exactly.
**Fix:** Skip origin check entirely in dev mode:
```ts
if (!config.server.dev) {
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin, allowedOrigins)) {
    ws.close(4003, 'Forbidden');
    return;
  }
}
```

**Config for dev mode:**
```json
{ "server": { "port": 9100, "dev": true } }
```

**How to verify WS works from browser console:**
```js
const ws = new WebSocket('ws://localhost:9100/?token=');
ws.onopen = () => { ws.send(JSON.stringify({type:'page-state',url:'...',title:'...',elements:[...]})); };
ws.onmessage = (e) => console.log('recv:', e.data);
ws.onclose = (e) => console.log('closed:', e.code, e.reason);
```
If close code is 4001 → token mismatch. 4003 → origin mismatch. No close + messages received → success.

### Demo Plan mode (no LLM API key)
When `config.ai.apiKey` is empty or starts with `${` (unresolved env var), the Planner auto-falls back to `getDemoPlan()` — a keyword-matching engine that scans `PageElement[]` for relevant UI elements and generates highlight+click steps. This lets the demo work without any API key configured.
```ts
// In LLMClient:
hasApiKey(): boolean {
  return !!this.apiKey && !this.apiKey.startsWith('${');
}
// In Planner.plan():
if (!this.llm.hasApiKey()) return this.getDemoPlan(intent, elements);
```

### Demo Plan matcher architecture (CRITICAL — ordering matters)
The `getDemoPlan()` method uses an array of **Matcher** objects evaluated in priority order. The FIRST matcher whose `keywords` array contains a substring of the user intent wins. This means:
- **Most specific keywords MUST come first** (e.g. '文章' before '写')
- Each matcher has: `keywords[]`, `find()` (element lookup), `highlight` msg, `click` msg, optional `fallback` URL
- If no matcher hits, the fallback showcase highlights all main features

**Bug found and fixed:** Original code had '写' in the '创建作品' matcher keywords. So "我想写文章" would match '创建作品' (because '写' matched first), navigating to /novels/new instead of /documents. Fix: put the '文章文案' matcher (keywords: ['文章','文案','公众号','小红书','抖音']) BEFORE the '创建作品' matcher (keywords: ['创建','新建','写','开始','小说','篇章']).

Current 10 matchers (in priority order):
1. 文章文案 → /documents (keywords: 文章,文案,公众号,小红书,抖音)
2. AI助手 → /ai/assistant (keywords: ai,助手,智能,续写,润色)
3. 知识库 → /kb (keywords: 知识库,知识,素材,参考)
4. 数据统计 → /stats (keywords: 统计,数据,概览)
5. 我的作品 → /novels (keywords: 作品库,我的作品,书架,列表)
6. 创建作品 → /novels/new (keywords: 创建,新建,写,开始,小说,篇章)
7. 导入小说 → /novels/import (keywords: 导入,上传小说)
8. 导出中心 → /export (keywords: 导出,下载)
9. 个人中心 → /profile (keywords: 个人,设置,profile)
10. 回收站 → /recycle (keywords: 回收站,删除,垃圾桶)

**When adding new matchers:** Always add above the generic ones. Use `findEl(...keywords)` helper that searches `elements.find(e => keywords.some(kw => e.text.includes(kw)))`. Each matcher should have a `fallback` URL for robustness when the element isn't found on the current page.

### InkMuse target app specifics
- Login: username `admin`, password `admin123` (NOT yangtao971325)
- Backend API: port **8080** (Spring Boot), NOT 3000
- Frontend dev server: port **5175** (Vite), proxies `/api` → `localhost:8080`
- Vite proxy in `vite.config.ts`: `'/api': { target: 'http://localhost:8080' }`

### Monorepo tsconfig.json rootDir trap
**Problem:** Root `tsconfig.json` had `"rootDir": "./src"` and `"outDir": "./dist"`, but there is no `src/` at the root level in a monorepo. Running `tsc --noEmit` at the root causes "File is not under rootDir" errors for every package file.
**Fix:** Root tsconfig.json should be a **base config only** — NO `rootDir`, NO `outDir`. Each package's tsconfig.json overrides with its own `rootDir: "./src"` and `outDir: "./dist"`. Run typecheck per-package: `npm run typecheck --workspaces`.

### Async cache-key test gotcha
**Problem:** `getCacheKey()` was refactored from sync to `async` (returns `Promise<string>`), but tests called it without `await`. `expect(key).toMatch(...)` fails with "expects to receive a string, but got object" (the Promise).
**Fix:** Tests should use the `getCacheKeySync()` export for synchronous assertions, or `await` the async version. Keep both sync and async exports.

### Security hardening (0.2.0 audit fixes)

#### CSS selector validation regex pitfall (CRITICAL)
**Problem:** Initial `isValidSelector()` used `/[<>]/` to block HTML injection. This also blocks the CSS `>` combinator (e.g. `div > .child`), which is a completely valid CSS selector.
**Fix:** Use `/<[a-zA-Z\/!]/` — only matches HTML open/close tags like `<script>`, `</div>`, `<!DOCTYPE` — but NOT bare `>` which is the CSS child combinator. The regex catches `<img onerror=...>` payloads while allowing `nav > ul > li`.
**Test pitfall:** Always test with BOTH real injection payloads (`<script>alert(1)</script>`) AND valid CSS combinators (`div > .child`). A test like `div >< img` doesn't trigger the fix because there's no `<` immediately before a letter.

#### WSHandler per-connection session isolation (CRITICAL)
**Problem:** `WSHandler` stored `cancelled` and `resolveStep` as instance-level fields. With multiple concurrent WS connections, one client's cancel signal would kill another client's demo.
**Fix:** Use `WeakMap<WebSocket, SessionState>` — each WS gets its own `{ cancelled, resolveStep }`. WeakMap auto-GC's when the WS is dereferenced. Add `cleanupSession(ws)` for explicit teardown on disconnect. The server creates ONE handler instance (not per-connection), and all state is keyed by the `ws` argument passed to `handleMessage(ws, msg, page)`.

#### CORS hardening pattern
Replace global `Access-Control-Allow-Origin: *` with per-request matching:
```ts
const corsOrigin = config.server.dev
  ? (reqOrigin ?? '*')           // dev: allow caller's origin
  : (allowedOrigin ?? '');       // prod: empty string if not in whitelist
```
Dev mode echoes back the caller's Origin (like whitelist but permissive). Prod mode returns empty string for unknown origins (browser blocks the response).

#### LLM fetch timeout
Wrap `fetch()` in `AbortController` with `setTimeout(abort, 30000)`. Must `clearTimeout` in `finally` block. Catch `AbortError` by name and throw a descriptive timeout message. Configurable via `ai.timeout` in config.

#### Action executor registration mechanism
`ActionExecutor` now has `registerAction(name, handler)` / `unregisterAction(name)` / `hasCustomAction(name)`. Custom actions are checked BEFORE the switch-case. Unknown actions fall through to a `default` case that logs a warning (no crash). This lets projects add e.g. `select`, `drag`, `upload` without modifying core source.

#### Removing `as any` from planner
CachedPlan.steps is typed as `CachedStep[]` (requires non-optional `selector` and `intent`). When mapping from LLM-parsed `PlanStep[]`, annotate the map callback return type explicitly: `.map((s): CachedStep => ({ ...s, selector: s.selector ?? '', intent: s.intent ?? s.narrate ?? '' }))` — no `as any` needed.

## GitHub Repository
**URL:** https://github.com/YTyangtao666/agentshow  
**CI:** `.github/workflows/ci.yml` — runs typecheck + test + build on Node 18/20/22 matrix.

## Build Commands
```bash
# Typecheck ALL packages (run from root)
npm run typecheck    # = npm run typecheck --workspaces

# Run ALL tests
npm test             # = vitest run

# Build widget bundle (IIFE for browser injection) — MUST use entry-browser.ts, not index.ts
npm run build --workspace @agentshow/widget

# Verify no Node.js require() leaked into browser bundle (MUST be 0)
grep -c "require(" packages/widget/dist/entry-browser.global.js

# CLI via tsx (no compiled bin yet)
npx tsx packages/cli/src/index.ts --help
npx tsx packages/cli/src/index.ts init
npx tsx packages/cli/src/index.ts start
```

## Dev Server
`scripts/dev-server.ts` — reads `agentshow.config.json`, expands `${ENV_VAR}` placeholders, starts WebSocket server on configured port (default 9100).

## Config Format (agentshow.config.json)
```json
{
  "name": "app-name",
  "ai": { "provider": "deepseek", "apiKey": "${DEEPSEEK_API_KEY}", "model": "deepseek-chat" },
  "server": { "port": 9100, "target": "http://localhost:5175" },
  "features": ["描述要展示的功能1", "功能2"]
}
```

## Target App
InkMuse (AI Novel Studio) at localhost:5175 — the demo target for Phase 1 MVP validation.
