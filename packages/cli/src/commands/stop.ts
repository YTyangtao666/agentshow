import { Command } from 'commander';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

export const stopCommand = new Command('stop')
  .description('Stop AgentShow server')
  .option('-p, --pid-path <path>', 'PID file path', '.agentshow/server.pid')
  .action((options) => {
    const pidPath = resolve(options.pidPath);
    if (!existsSync(pidPath)) {
      console.error('No running server found.');
      process.exit(1);
    }
    const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
    try {
      process.kill(pid, 'SIGTERM');
      unlinkSync(pidPath);
      console.log(`\x1b[32m\u2713\x1b[0m Server (PID ${pid}) stopped.`);
    } catch {
      console.error(
        `Failed to stop server (PID ${pid}). It may have already exited.`,
      );
      unlinkSync(pidPath);
    }
  });
