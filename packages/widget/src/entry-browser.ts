// AgentShow Widget Bundle Entry (browser IIFE wrapper)
// This file is the real entry point that tsup bundles.
// It wraps everything in a self-executing function and exposes to window.

import { AgentShowApp } from './app.js';

export interface InitOptions {
  port: number;
  token: string;
}

function initAgentShow(options: InitOptions): void {
  if (typeof window === 'undefined') return;
  if ((window as any).__agentshow_initialized) return;
  (window as any).__agentshow_initialized = true;
  new AgentShowApp(options);
}

// Expose to window explicitly
if (typeof window !== 'undefined') {
  (window as any).initAgentShow = initAgentShow;
  (window as any).__agentshow_entry_loaded = true;

  // Auto-init
  if ((window as any).__AGENTSHOW__) {
    const cfg = (window as any).__AGENTSHOW__;
    initAgentShow({ port: cfg.port, token: cfg.token || '' });
  }
}

// Also expose as global (for tsup IIFE)
;(globalThis as any).initAgentShow = initAgentShow;
