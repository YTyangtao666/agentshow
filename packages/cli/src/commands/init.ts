import { Command } from 'commander';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const initCommand = new Command('init')
  .description('Initialize AgentShow in current project')
  .option('-f, --force', 'Overwrite existing config')
  .action((options) => {
    const configDir = '.agentshow';
    const configPath = join(configDir, 'config.json');
    const cacheDir = join(configDir, 'cache', 'plans');

    if (existsSync(configPath) && !options.force) {
      console.error('Config already exists. Use --force to overwrite.');
      process.exit(1);
    }

    mkdirSync(cacheDir, { recursive: true });

    const template = {
      name: 'My App',
      description: 'My awesome web application',
      version: '1.0.0',
      ai: {
        provider: 'deepseek',
        apiKey: '${DEEPSEEK_API_KEY}',
        model: 'deepseek-chat',
        language: 'zh-CN',
      },
      server: {
        port: 17890,
      },
      demo: {
        autoplay: false,
        tts: false,
        theme: 'auto',
        position: 'bottom-right',
      },
      features: [],
      playbooks: [],
    };

    writeFileSync(configPath, JSON.stringify(template, null, 2));
    console.log(`\x1b[32m\u2713\x1b[0m Created ${configPath}`);
    console.log(`\x1b[32m\u2713\x1b[0m Created ${cacheDir}/`);
    console.log('\nNext steps:');
    console.log('  1. Edit .agentshow/config.json with your API key');
    console.log('  2. Run: agentshow start');
  });
