import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

export const startCommand = new Command('start')
  .description('Start AgentShow server')
  .option('-c, --config <path>', 'Config file path', '.agentshow/config.json')
  .option('-p, --port <number>', 'Override server port', parseInt)
  .action(async (options) => {
    const configPath = resolve(options.config);
    if (!existsSync(configPath)) {
      console.error(`Config not found: ${configPath}`);
      console.error('Run "agentshow init" first.');
      process.exit(1);
    }

    const configRaw = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configRaw);
    if (options.port) config.server.port = options.port;

    // 写PID文件
    const pidPath = resolve('.agentshow', 'server.pid');
    writeFileSync(pidPath, String(process.pid));

    // 动态导入Server
    const { startServer } = await import('@agentshow/server');
    const { port, token } = await startServer(config);

    console.log(`\n\x1b[36m\u{1F916} AgentShow server running on port ${port}\x1b[0m`);
    console.log(`\n--- Widget injection code ---\n`);
    console.log(`<script>`);
    console.log(`  window.__AGENTSHOW__ = { port: ${port}, token: "${token}" };`);
    console.log(`  var s = document.createElement('script');`);
    console.log(`  s.src = 'http://localhost:${port}/widget.js';`);
    console.log(`  document.head.appendChild(s);`);
    console.log(`</script>\n`);

    // 优雅退出
    process.on('SIGINT', () => {
      console.log('\n\x1b[36mStopping AgentShow server...\x1b[0m');
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      process.exit(0);
    });
  });
