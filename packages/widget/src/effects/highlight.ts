let highlightEl: HTMLElement | null = null;

export function showHighlight(target: HTMLElement): void {
  removeHighlight();

  const rect = target.getBoundingClientRect();
  highlightEl = document.createElement('div');
  highlightEl.setAttribute('data-agentshow', 'highlight');
  highlightEl.style.cssText = `
    position: fixed;
    left: ${rect.left - 2}px;
    top: ${rect.top - 2}px;
    width: ${rect.width + 4}px;
    height: ${rect.height + 4}px;
    border: 2px solid #0064BF;
    border-radius: 6px;
    box-shadow: 0 0 20px rgba(0, 100, 191, 0.4);
    pointer-events: none;
    z-index: 2147483646;
    transition: all 200ms ease-out;
    transform: scale(0.95);
    opacity: 0;
  `;
  document.body.appendChild(highlightEl);

  requestAnimationFrame(() => {
    if (highlightEl) {
      highlightEl.style.transform = 'scale(1)';
      highlightEl.style.opacity = '1';
    }
  });
}

export function removeHighlight(): void {
  if (highlightEl) {
    highlightEl.remove();
    highlightEl = null;
  }
}
