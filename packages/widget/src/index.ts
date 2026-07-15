import { AgentShowApp } from './app.js';

export interface InitOptions {
  port: number;
  token: string;
  config?: Record<string, unknown>;
}

export function initAgentShow(options: InitOptions): void {
  if (typeof window === 'undefined') {
    console.warn('[AgentShow] Not in browser environment');
    return;
  }

  if ((window as any).__agentshow_initialized) {
    console.warn('[AgentShow] Already initialized');
    return;
  }
  (window as any).__agentshow_initialized = true;

  new AgentShowApp(options);
}

// Auto-init from global var
if (typeof window !== 'undefined' && (window as any).__AGENTSHOW__) {
  const cfg = (window as any).__AGENTSHOW__;
  initAgentShow({ port: cfg.port, token: cfg.token });
}
