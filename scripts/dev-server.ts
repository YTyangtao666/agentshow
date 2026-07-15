#!/usr/bin/env tsx
import { startServer } from '@agentshow/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function main() {
  const configPath = resolve(process.cwd(), 'agentshow.config.json');
  const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

  // Expand env vars
  const config = JSON.parse(
    JSON.stringify(rawConfig).replace(
      /\$\{(\w+)\}/g,
      (_, name) => process.env[name] ?? '',
    ),
  );

  console.log('[AgentShow] Starting server...');
  const { port, token } = await startServer(config);
  console.log(`[AgentShow] Server running on port ${port}`);
  console.log(`[AgentShow] Token: ${token}`);
  console.log(`[AgentShow] Widget: http://localhost:${port}/widget.js`);
  console.log(`[AgentShow] Health: http://localhost:${port}/health`);
  console.log(`[AgentShow] Waiting for connections...`);
}

main().catch((err) => {
  console.error('[AgentShow] Fatal:', err);
  process.exit(1);
});
