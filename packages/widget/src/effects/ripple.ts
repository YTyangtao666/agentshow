export function showRipple(x: number, y: number): void {
  const ripple = document.createElement('div');
  ripple.setAttribute('data-agentshow', 'ripple');
  ripple.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 20px;
    height: 20px;
    margin-left: -10px;
    margin-top: -10px;
    border-radius: 50%;
    background: rgba(255, 196, 0, 0.6);
    pointer-events: none;
    z-index: 2147483646;
    animation: as-ripple 400ms ease-out forwards;
  `;

  // 注入keyframes（只注入一次）
  if (!document.getElementById('as-ripple-style')) {
    const style = document.createElement('style');
    style.id = 'as-ripple-style';
    style.textContent = `
      @keyframes as-ripple {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(3); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 400);
}
