import type { WebSocket } from 'ws';
import type {
  ClientMessage,
  ServerMessage,
  AgentShowConfig,
  PageElement,
  PlanStep,
} from '@agentshow/shared';
import { Planner } from '../planner/planner.js';
import type { PlanCache } from '../cache/plan-cache.js';

interface CurrentPage {
  url: string;
  title: string;
  elements: PageElement[];
}

/**
 * Per-connection session state.
 * Each WS connection gets its own cancel flag + step resolver,
 * preventing concurrent demos from interfering with each other.
 */
interface SessionState {
  cancelled: boolean;
  resolveStep: (() => void) | null;
}

export class WSHandler {
  private planner: Planner;
  private config: AgentShowConfig;
  /** Keyed by the WebSocket instance for per-connection isolation */
  private sessions = new WeakMap<WebSocket, SessionState>();

  constructor(config: AgentShowConfig, cache: PlanCache) {
    this.config = config;
    this.planner = new Planner(config, cache);
  }

  /** Get or create session state for a given WS connection */
  private getSession(ws: WebSocket): SessionState {
    let state = this.sessions.get(ws);
    if (!state) {
      state = { cancelled: false, resolveStep: null };
      this.sessions.set(ws, state);
    }
    return state;
  }

  /** Clean up session state when a connection closes */
  cleanupSession(ws: WebSocket): void {
    const state = this.sessions.get(ws);
    if (state) {
      state.cancelled = true;
      if (state.resolveStep) {
        state.resolveStep();
        state.resolveStep = null;
      }
      this.sessions.delete(ws);
    }
  }

  async handleMessage(
    ws: WebSocket,
    msg: ClientMessage,
    currentPage: CurrentPage,
  ): Promise<void> {
    const session = this.getSession(ws);
    session.cancelled = false;

    switch (msg.type) {
      case 'chat': {
        // 内部信号：step完成通知
        if (msg.content === '__step_complete__') {
          this.notifyStepComplete(ws);
          return;
        }

        this.send(ws, { type: 'status', status: 'thinking' });

        try {
          const result = await this.planner.plan(
            msg.content,
            currentPage.url,
            currentPage.title,
            currentPage.elements,
          );

          this.send(ws, {
            type: 'chat',
            content: result.reply,
            sender: 'agent',
          });
          this.send(ws, { type: 'plan', steps: result.steps });

          // 逐步执行
          for (let i = 0; i < result.steps.length; i++) {
            if (session.cancelled) break;

            const step = result.steps[i];
            this.send(ws, {
              type: 'step-progress',
              current: i + 1,
              total: result.steps.length,
              status: 'executing',
              narrate: step.narrate ?? '',
            });

            this.send(ws, { type: 'execute', action: step });

            await this.waitForStepCompletion(ws);

            this.send(ws, {
              type: 'step-progress',
              current: i + 1,
              total: result.steps.length,
              status: 'done',
              narrate: step.narrate ?? '',
            });
          }

          if (!session.cancelled) {
            this.send(ws, {
              type: 'complete',
              summary: '演示完成！',
            });
          }
          this.send(ws, { type: 'status', status: 'idle' });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.send(ws, {
            type: 'error',
            message: message ?? 'Unknown error',
          });
          this.send(ws, { type: 'status', status: 'error' });
        }
        break;
      }

      case 'cancel': {
        const s = this.getSession(ws);
        s.cancelled = true;
        this.notifyStepComplete(ws);
        break;
      }

      case 'play': {
        const playbook = this.config.playbooks?.find(
          (p) => p.id === msg.playbookId,
        );
        if (!playbook) {
          this.send(ws, {
            type: 'error',
            message: `Playbook not found: ${msg.playbookId}`,
          });
          return;
        }
        const allSteps: PlanStep[] = [];
        for (const featureId of playbook.features) {
          const feature = this.config.features?.find(
            (f) => f.id === featureId,
          );
          if (feature) allSteps.push(...feature.steps);
        }
        this.send(ws, { type: 'plan', steps: allSteps });

        for (let i = 0; i < allSteps.length; i++) {
          if (session.cancelled) break;
          const step = allSteps[i];
          this.send(ws, {
            type: 'step-progress',
            current: i + 1,
            total: allSteps.length,
            status: 'executing',
            narrate: step.narrate ?? '',
          });
          this.send(ws, { type: 'execute', action: step });
          await this.waitForStepCompletion(ws);
          this.send(ws, {
            type: 'step-progress',
            current: i + 1,
            total: allSteps.length,
            status: 'done',
            narrate: step.narrate ?? '',
          });
        }
        if (!session.cancelled) {
          this.send(ws, { type: 'complete', summary: '演示完成！' });
        }
        this.send(ws, { type: 'status', status: 'idle' });
        break;
      }
    }
  }

  notifyStepComplete(ws: WebSocket): void {
    const session = this.sessions.get(ws);
    if (session?.resolveStep) {
      session.resolveStep();
      session.resolveStep = null;
    }
  }

  private waitForStepCompletion(ws: WebSocket): Promise<void> {
    const session = this.getSession(ws);
    return new Promise((resolve) => {
      session.resolveStep = resolve;
      setTimeout(() => {
        if (session.resolveStep === resolve) {
          resolve();
          session.resolveStep = null;
        }
      }, 20000);
    });
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}
