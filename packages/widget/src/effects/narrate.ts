let narrateEl: HTMLElement | null = null;

export function showNarrate(text: string, selector?: string): void {
  hideNarrate();

  narrateEl = document.createElement('div');
  narrateEl.setAttribute('data-agentshow', 'narrate');
  narrateEl.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 300px;
    z-index: 2147483646;
    pointer-events: none;
    opacity: 0;
    transform: translateY(10px);
    transition: all 200ms ease-out;
  `;
  narrateEl.textContent = text;

  // 定位到目标元素附近
  let positioned = false;
  if (selector) {
    const target = document.querySelector(selector);
    if (target) {
      const rect = (target as HTMLElement).getBoundingClientRect();
      const above = rect.top > 60;
      narrateEl.style.left = `${Math.max(10, Math.min(rect.left, window.innerWidth - 310))}px`;
      narrateEl.style.top = above
        ? `${rect.top - 45}px`
        : `${rect.bottom + 10}px`;
      positioned = true;
    }
  }
  if (!positioned) {
    narrateEl.style.bottom = '100px';
    narrateEl.style.right = '20px';
  }

  document.body.appendChild(narrateEl);

  requestAnimationFrame(() => {
    if (narrateEl) {
      narrateEl.style.opacity = '1';
      narrateEl.style.transform = 'translateY(0)';
    }
  });
}

export function hideNarrate(): void {
  if (narrateEl) {
    narrateEl.style.opacity = '0';
    const el = narrateEl;
    setTimeout(() => el.remove(), 150);
    narrateEl = null;
  }
}
