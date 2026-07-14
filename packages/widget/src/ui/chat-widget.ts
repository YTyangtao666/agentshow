export class ChatWidget {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private button!: HTMLDivElement;
  private panel!: HTMLDivElement;
  private messagesEl!: HTMLDivElement;
  private inputEl!: HTMLInputElement;
  private sendBtn!: HTMLButtonElement;

  constructor(onSend: (text: string) => void) {
    this.host = document.createElement('div');
    this.host.setAttribute('data-agentshow', 'host');
    this.host.style.cssText =
      'all: initial; position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;';
    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

        .as-fab {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0064BF, #004c8f);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px;
          box-shadow: 0 4px 12px rgba(0, 100, 191, 0.4);
          transition: transform 200ms ease, box-shadow 200ms ease;
        }
        .as-fab:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0, 100, 191, 0.5); }
        .as-fab.thinking { animation: as-pulse 1s infinite; }
        .as-fab.executing { background: linear-gradient(135deg, #FFC400, #e6a800); }

        @keyframes as-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        .as-panel {
          position: absolute;
          bottom: 70px; right: 0;
          width: 360px; height: 500px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        .as-panel.open { display: flex; animation: as-slide-up 200ms ease-out; }

        @keyframes as-slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .as-header {
          background: linear-gradient(135deg, #0064BF, #004c8f);
          color: #fff;
          padding: 12px 16px;
          font-size: 15px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
        }
        .as-header .close-btn {
          margin-left: auto;
          background: none; border: none; color: #fff;
          cursor: pointer; font-size: 20px; opacity: 0.7;
        }
        .as-header .close-btn:hover { opacity: 1; }

        .as-messages {
          flex: 1; overflow-y: auto;
          padding: 12px;
          display: flex; flex-direction: column; gap: 8px;
          background: #f5f5f5;
        }

        .as-msg {
          max-width: 80%; padding: 8px 12px;
          border-radius: 12px; font-size: 14px; line-height: 1.5;
          word-break: break-word;
        }
        .as-msg.user { align-self: flex-end; background: #0064BF; color: #fff; }
        .as-msg.agent { align-self: flex-start; background: #fff; color: #333; border: 1px solid #e0e0e0; }
        .as-msg.system { align-self: center; background: transparent; color: #999; font-size: 12px; text-align: center; }

        .as-input-row {
          display: flex; padding: 8px; gap: 8px; background: #fff;
          border-top: 1px solid #e0e0e0;
        }
        .as-input {
          flex: 1; border: 1px solid #ddd; border-radius: 8px;
          padding: 8px 12px; font-size: 14px; outline: none;
        }
        .as-input:focus { border-color: #0064BF; }
        .as-send {
          background: #0064BF; color: #fff; border: none;
          border-radius: 8px; padding: 8px 16px; cursor: pointer;
          font-size: 14px; font-weight: 500;
        }
        .as-send:hover { background: #004c8f; }
      </style>

      <div class="as-fab" id="fab">\u{1F916}</div>
      <div class="as-panel" id="panel">
        <div class="as-header">
          \u{1F916} AgentShow
          <button class="close-btn" id="close">\u00d7</button>
        </div>
        <div class="as-messages" id="messages"></div>
        <div class="as-input-row">
          <input type="text" class="as-input" id="input" placeholder="\u8F93\u5165\u6307\u4EE4..." />
          <button class="as-send" id="send">\u53D1\u9001</button>
        </div>
      </div>
    `;

    this.button = this.shadow.getElementById('fab') as HTMLDivElement;
    this.panel = this.shadow.getElementById('panel') as HTMLDivElement;
    this.messagesEl = this.shadow.getElementById('messages') as HTMLDivElement;
    this.inputEl = this.shadow.getElementById('input') as HTMLInputElement;
    this.sendBtn = this.shadow.getElementById('send') as HTMLButtonElement;

    this.button.addEventListener('click', () => this.togglePanel());
    (this.shadow.getElementById('close') as HTMLButtonElement).addEventListener(
      'click',
      () => this.togglePanel(false),
    );

    const sendHandler = () => {
      const text = this.inputEl.value.trim();
      if (text) {
        onSend(text);
        this.inputEl.value = '';
      }
    };
    this.sendBtn.addEventListener('click', sendHandler);
    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') sendHandler();
    });
  }

  togglePanel(open?: boolean): void {
    const isOpen = open ?? !this.panel.classList.contains('open');
    this.panel.classList.toggle('open', isOpen);
    if (isOpen) this.inputEl.focus();
  }

  addUserMessage(text: string): void {
    this.addMessage(text, 'user');
  }

  addAgentMessage(text: string): void {
    this.addMessage(text, 'agent');
  }

  addSystemMessage(text: string): void {
    this.addMessage(text, 'system');
  }

  private addMessage(text: string, role: 'user' | 'agent' | 'system'): void {
    const msg = document.createElement('div');
    msg.className = `as-msg ${role}`;
    msg.textContent = text;
    this.messagesEl.appendChild(msg);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  setStatus(status: 'idle' | 'thinking' | 'executing' | 'error'): void {
    this.button.classList.remove('thinking', 'executing');
    switch (status) {
      case 'thinking':
        this.button.classList.add('thinking');
        break;
      case 'executing':
        this.button.classList.add('executing');
        break;
      default:
        break;
    }
  }
}
