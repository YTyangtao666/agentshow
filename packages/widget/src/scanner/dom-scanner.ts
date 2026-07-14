import type { PageElement } from '@agentshow/shared';
import { generateSelector } from '@agentshow/core';

const INTERACTIVE_SELECTORS = [
  'button', 'a', 'input', 'select', 'textarea',
  '[role="button"]', '[role="link"]', '[role="tab"]',
  '[onclick]', '[tabindex]',
];

export function scanDOM(): PageElement[] {
  const elements: PageElement[] = [];
  const seen = new Set<Element>();
  let index = 0;

  function processElements(root: Document | ShadowRoot | Element): void {
    let found: NodeListOf<Element>;
    try {
      found = root.querySelectorAll(INTERACTIVE_SELECTORS.join(', '));
    } catch {
      return;
    }

    for (const el of found) {
      if (seen.has(el)) continue;
      seen.add(el);

      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const visible = isVisible(htmlEl);

      // 跳过Widget自己的元素
      if (htmlEl.closest('[data-agentshow]')) continue;

      const elIndex = index++;
      // 给元素打索引标记（临时属性）
      htmlEl.setAttribute('data-agentshow-index', String(elIndex));

      elements.push({
        index: elIndex,
        tag: htmlEl.tagName.toLowerCase(),
        type: (htmlEl as HTMLInputElement).type ?? '',
        text: (htmlEl.textContent ?? '').trim().slice(0, 50),
        placeholder: (htmlEl as HTMLInputElement).placeholder ?? '',
        role: htmlEl.getAttribute('role') ?? '',
        ariaLabel: htmlEl.getAttribute('aria-label') ?? '',
        id: htmlEl.id,
        selector: generateSelector(htmlEl),
        visible,
        rect: {
          x: rect.x, y: rect.y,
          width: rect.width, height: rect.height,
        },
      });
    }

    // 穿透Shadow DOM
    try {
      root.querySelectorAll('*').forEach((el) => {
        if ((el as HTMLElement).shadowRoot) {
          processElements((el as HTMLElement).shadowRoot!);
        }
      });
    } catch { /* */ }

    // 穿透同域iframe
    try {
      root.querySelectorAll('iframe').forEach((iframe) => {
        try {
          const doc = (iframe as HTMLIFrameElement).contentDocument;
          if (doc) processElements(doc);
        } catch { /* 跨域iframe */ }
      });
    } catch { /* */ }
  }

  processElements(document);
  return elements;
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return true;
}
