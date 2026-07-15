import type { ServerMessage } from '@agentshow/shared';
import { WSClient } from './ws-client.js';
import { ChatWidget } from './ui/chat-widget.js';
import { ActionExecutor } from './executor/action-executor.js';
import { scanDOM } from './scanner/dom-scanner.js';

interface InitOptions {
  port: number;
  token: string;
}

export class AgentShowApp {
  private ws: WSClient;
  private widget: ChatWidget;
  private executor: ActionExecutor;
  private domSyncTimer: number | null = null;

  constructor(options: InitOptions) {
    this.ws = new WSClient(options.port, options.token);
    this.widget = new ChatWidget((text) => this.handleUserInput(text));
    this.executor = new ActionExecutor();
    this.init();
  }

  private registerWsHandlers(): void {
    // 监听Server消息
    this.ws.on('chat', (msg: ServerMessage) => {
      if (msg.type === 'chat' && 'sender' in msg && msg.sender === 'agent') {
        this.widget.addAgentMessage(msg.content);
      }
    });

    this.ws.on('status', (msg: ServerMessage) => {
      if (msg.type === 'status') {
        this.widget.setStatus(msg.status);
      }
    });

    this.ws.on('execute', async (msg: ServerMessage) => {
      if (msg.type === 'execute') {
        try {
          await this.executor.execute(msg.action);
        } catch (err) {
          console.error('[AgentShow] Execute error:', err);
        }
        // 通知Server执行完成
        this.ws.send({ type: 'chat', content: '__step_complete__' });
      }
    });

    this.ws.on('step-progress', (msg: ServerMessage) => {
      if (msg.type === 'step-progress') {
        const emoji =
          msg.status === 'done' ? '\u2713' : msg.status === 'error' ? '\u2717' : '\u25C9';
        this.widget.addSystemMessage(
          `${emoji} \u6B65\u9AA4 ${msg.current}/${msg.total}: ${msg.narrate}`,
        );
      }
    });

    this.ws.on('complete', (msg: ServerMessage) => {
      if (msg.type === 'complete') {
        this.widget.addSystemMessage('\u2705 ' + msg.summary);
      }
    });

    this.ws.on('error', (msg: ServerMessage) => {
      if (msg.type === 'error') {
        this.widget.addSystemMessage('\u274C ' + msg.message);
      }
    });
  }

  private async init(): Promise<void> {
    // 立即显示Widget UI（不等WS连接）
    this.widget.addSystemMessage('AgentShow \u6B63\u5728\u8FDE\u63A5...');
    this.widget.togglePanel(true);

    // 注册WS消息监听（在连接前注册，避免竞态）
    this.registerWsHandlers();

    try {
      await this.ws.connect();
      this.widget.addSystemMessage('AgentShow \u5DF2\u8FDE\u63A5');

      // 定期同步页面状态
      this.syncPageState();
      this.domSyncTimer = window.setInterval(() => this.syncPageState(), 5000);

    } catch (err) {
      console.error('[AgentShow] Init failed:', err);
      this.widget.addSystemMessage(
        '\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4AgentShow Server\u6B63\u5728\u8FD0\u884C',
      );
    }
  }

  private handleUserInput(text: string): void {
    this.widget.addUserMessage(text);
    this.ws.send({ type: 'chat', content: text });
  }

  private syncPageState(): void {
    const elements = scanDOM();
    this.ws.send({
      type: 'page-state',
      url: window.location.href,
      title: document.title,
      elements,
    });
  }
}
