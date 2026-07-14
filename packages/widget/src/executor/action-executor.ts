import type { PlanStep } from '@agentshow/shared';
import { delay } from '@agentshow/core';
import { showHighlight, removeHighlight } from '../effects/highlight.js';
import { showRipple } from '../effects/ripple.js';
import { showNarrate, hideNarrate } from '../effects/narrate.js';

export class ActionExecutor {
  async execute(step: PlanStep): Promise<void> {
    if (step.narrate) {
      showNarrate(step.narrate, step.selector);
    }

    switch (step.action) {
      case 'click': {
        const el = this.findElement(step);
        if (!el) throw new Error(`Element not found: ${step.selector ?? step.elementIndex}`);
        showHighlight(el);
        await delay(300);
        const rect = el.getBoundingClientRect();
        showRipple(rect.x + rect.width / 2, rect.y + rect.height / 2);
        (el as HTMLElement).click();
        await delay(400);
        removeHighlight();
        break;
      }

      case 'type': {
        const el = this.findElement(step) as HTMLInputElement | null;
        if (!el) throw new Error(`Element not found: ${step.selector ?? step.elementIndex}`);
        showHighlight(el);
        await delay(300);
        el.focus();
        el.value = step.value ?? '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        await delay(400);
        removeHighlight();
        break;
      }

      case 'wait': {
        const timeout = step.timeout ?? 5000;
        const start = Date.now();
        const condition = step.condition?.replace(':visible', '') ?? '';
        while (Date.now() - start < timeout) {
          if (condition) {
            const el = document.querySelector(condition);
            if (el && this.isVisible(el as HTMLElement)) break;
          }
          await delay(200);
        }
        break;
      }

      case 'navigate': {
        if (step.url) {
          window.location.href = step.url;
          await delay(1500);
        }
        break;
      }

      case 'highlight': {
        const el = this.findElement(step);
        if (el) {
          showHighlight(el);
          await delay(step.duration ?? 3000);
          removeHighlight();
        }
        break;
      }

      case 'scroll': {
        const el = this.findElement(step);
        if (el) {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
          await delay(800);
        } else {
          window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
          await delay(800);
        }
        break;
      }
    }

    if (step.narrate) {
      hideNarrate();
    }
  }

  private findElement(step: PlanStep): HTMLElement | null {
    if (step.selector) {
      return document.querySelector(step.selector);
    }
    if (step.elementIndex !== undefined) {
      return document.querySelector(`[data-agentshow-index="${step.elementIndex}"]`);
    }
    return null;
  }

  private isVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }
}
