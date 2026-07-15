// AgentShow Widget Auto-Injector (served by server)
// This script is injected into the target page via script tag
(function () {
  const port = new URLSearchParams(window.location.search).get('agentshow_port') || '9100';
  const token = new URLSearchParams(window.location.search).get('agentshow_token') || '';

  (window as any).__AGENTSHOW__ = { port, token };

  // Load the widget module
  const script = document.createElement('script');
  script.type = 'module';
  script.src = `http://localhost:${port}/widget.js`;
  document.head.appendChild(script);
})();
