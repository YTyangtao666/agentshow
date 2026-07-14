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

export class WSHandler {
  private planner: Planner;
  private config: AgentShowConfig;
  private cancelled = false;
  private resolveStep: (() => void) | null = null;

  constructor(config: AgentShowConfig, cache: PlanCache) {
    this.config = config;
    this.planner = new Planner(config, cache);
  }

  async handleMessage(
    ws: WebSocket,
    msg: ClientMessage,
    currentPage: CurrentPage,
  ): Promise<void> {
    this.cancelled = false;

    switch (msg.type) {
      case 'chat': {
        // 内部信号：step完成通知
        if (msg.content === '__step_complete__') {
          this.notifyStepComplete();
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
            if (this.cancelled) break;

            const step = result.steps[i];
            this.send(ws, {
              type: 'step-progress',
              current: i + 1,
              total: result.steps.length,
              status: 'executing',
              narrate: step.narrate ?? '',
            });

            this.send(ws, { type: 'execute', action: step });

            await this.waitForStepCompletion();

            this.send(ws, {
              type: 'step-progress',
              current: i + 1,
              total: result.steps.length,
              status: 'done',
              narrate: step.narrate ?? '',
            });
          }

          if (!this.cancelled) {
            this.send(ws, {
              type: 'complete',
              summary: '演示完成！',
            });
          }
          this.send(ws, { type: 'status', status: 'idle' });
        } catch (err: any) {
          this.send(ws, {
            type: 'error',
            message: err.message ?? 'Unknown error',
          });
          this.send(ws, { type: 'status', status: 'error' });
        }
        break;
      }

      case 'cancel': {
        this.cancelled = true;
        this.notifyStepComplete();
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
          if (this.cancelled) break;
          const step = allSteps[i];
          this.send(ws, {
            type: 'step-progress',
            current: i + 1,
            total: allSteps.length,
            status: 'executing',
            narrate: step.narrate ?? '',
          });
          this.send(ws, { type: 'execute', action: step });
          await this.waitForStepCompletion();
          this.send(ws, {
            type: 'step-progress',
            current: i + 1,
            total: allSteps.length,
            status: 'done',
            narrate: step.narrate ?? '',
          });
        }
        if (!this.cancelled) {
          this.send(ws, { type: 'complete', summary: '演示完成！' });
        }
        this.send(ws, { type: 'status', status: 'idle' });
        break;
      }
    }
  }

  notifyStepComplete(): void {
    if (this.resolveStep) {
      this.resolveStep();
      this.resolveStep = null;
    }
  }

  private waitForStepCompletion(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveStep = resolve;
      setTimeout(() => {
        if (this.resolveStep === resolve) {
          resolve();
          this.resolveStep = null;
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
