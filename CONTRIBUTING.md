# Contributing to AgentShow

Thanks for your interest in contributing! This guide covers the basics.

## Development Setup

```bash
git clone https://github.com/YTyangtao666/agentshow.git
cd agentshow
npm install
```

### Prerequisites
- Node.js >= 18
- npm >= 9

### Project Structure

```
agentshow/
├── packages/
│   ├── shared/       # Type contracts (WS protocol, Plan, Config) — zero runtime deps
│   ├── core/         # Pure utility functions (selector, cache-key, security, utils)
│   ├── server/       # WebSocket server + LLM client + planner + CLI
│   └── widget/       # Browser-injected Shadow DOM widget
├── package.json      # Workspace root
└── tsconfig.json     # Shared TS config
```

## Common Commands

```bash
# Run all tests
npm test

# Type check all packages
npm run typecheck

# Build all packages
npm run build

# Build only the widget bundle (for IIFE injection)
npm run build:widget
```

## How to Add a New Action Type

1. Add the action name to `ActionType` in `packages/shared/src/types-plan.ts`
2. Add it to `ALLOWED_ACTIONS` in `packages/core/src/security.ts`
3. Implement the handler in `packages/widget/src/executor/action-executor.ts` (add a `case`)
4. Add a test in the appropriate test file

## How to Add a New LLM Provider

1. Add the provider URL to `PROVIDER_URLS` in `packages/server/src/llm/client.ts`
2. Add the provider name to the `ai.provider` union type in `packages/shared/src/types-config.ts`
3. Test with: `npx vitest run packages/server/tests/llm-client.test.ts`

## Code Style

- TypeScript strict mode (already configured)
- Use `import type` for type-only imports
- Avoid `as any` — if you need a type assertion, add a proper interface
- Comments in Chinese or English are both fine — be consistent within a file

## Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] No new `as any` assertions
- [ ] No `console.log` in production code (use `console.error` or `console.warn` for diagnostics)
- [ ] If adding a new dependency, explain why in the PR description
- [ ] Update CHANGELOG.md under `[Unreleased]`

## Reporting Bugs

Please use [GitHub Issues](https://github.com/YTyangtao666/agentshow/issues) and include:
1. AgentShow version
2. Node.js version
3. Steps to reproduce
4. Expected vs actual behavior
5. Console output (if any)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
