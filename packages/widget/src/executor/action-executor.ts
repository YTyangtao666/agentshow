import type { PlanStep } from '@agentshow/shared';
import { delay } from '@agentshow/core';
import { showHighlight, removeHighlight } from '../effects/highlight.js';
import { showRipple } from '../effects/ripple.js';
import { showNarrate, hideNarrate } from '../effects/narrate.js';

/**
 * Custom action handler function signature.
 * Receives the PlanStep and returns a Promise.
 */
export type CustomActionHandler = (step: PlanStep) => Promise<void>;

/**
 * Registry for custom action types.
 * Allows extending the executor without modifying core source.
 *
 * Usage:
 * ```ts
 * executor.registerAction('select', async (step) => {
 *   const el = document.querySelector(step.selector) as HTMLSelectElement;
 *   if (el) {
 *     el.value = step.value ?? '';
 *     el.dispatchEvent(new Event('change', { bubbles: true }));
 *   }
 * });
 * ```
 */
export class ActionExecutor {
  private customActions = new Map<string, CustomActionHandler>();

  /** Register a custom action handler */
  registerAction(name: string, handler: CustomActionHandler): void {
    this.customActions.set(name, handler);
  }

  /** Unregister a custom action handler */
  unregisterAction(name: string): void {
    this.customActions.delete(name);
  }

  /** Check if a custom action is registered */
  hasCustomAction(name: string): boolean {
    return this.customActions.has(name);
  }

  async execute(step: PlanStep): Promise<void> {
    if (step.narrate) {
      showNarrate(step.narrate, step.selector);
    }

    // Check custom actions first
    if (this.customActions.has(step.action)) {
      const handler = this.customActions.get(step.action)!;
      try {
        await handler(step);
      } finally {
        if (step.narrate) hideNarrate();
      }
      return;
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
          // For SPA apps that use pushState (same origin), the page won't reload.
          // Wait for either: a condition selector to appear, or a fixed delay.
          if (step.condition) {
            const condition = step.condition.replace(':visible', '');
            const timeout = step.timeout ?? 8000;
            const start = Date.now();
            while (Date.now() - start < timeout) {
              const el = document.querySelector(condition);
              if (el && this.isVisible(el as HTMLElement)) break;
              await delay(200);
            }
          } else {
            await delay(1500);
          }
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

      default: {
        // Unknown action — check if it was registered as custom (already checked above)
        // If we reach here, it's truly unknown
        console.warn(`[AgentShow] Unknown action: "${step.action}"`);
        break;
      }
    }

    if (step.narrate) {
      hideNarrate();
    }
  }

  private findElement(step: PlanStep): HTMLElement | null {
    if (step.selector) {
      // Defense-in-depth: reject selectors containing injection patterns
      const safe = step.selector.length <= 500
        && !/<[a-zA-Z\/!]|javascript:|expression\s*\(|url\s*\(/i.test(step.selector);
      if (!safe) {
        console.warn('[AgentShow] Rejected unsafe selector:', step.selector.slice(0, 80));
        return null;
      }
      try {
        return document.querySelector(step.selector);
      } catch (e) {
        console.warn('[AgentShow] Invalid selector:', step.selector.slice(0, 80), e);
        return null;
      }
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
