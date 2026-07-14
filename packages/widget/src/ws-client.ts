import type { ClientMessage, ServerMessage } from '@agentshow/shared';

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners = new Map<string, Set<(msg: ServerMessage) => void>>();
  private reconnectAttempts = 0;
  private maxReconnect = 5;

  constructor(port: number, token: string) {
    this.url = `ws://localhost:${port}/?token=${token}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[AgentShow] WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = () => {
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage;
          this.emit(msg);
        } catch (e) {
          console.error('[AgentShow] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[AgentShow] WebSocket closed');
        this.attemptReconnect();
      };
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnect) return;
    this.reconnectAttempts++;
    setTimeout(
      () => this.connect().catch(() => {}),
      2000 * this.reconnectAttempts,
    );
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  on(type: ServerMessage['type'], handler: (msg: ServerMessage) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
  }

  private emit(msg: ServerMessage): void {
    this.listeners.get(msg.type)?.forEach((fn) => fn(msg));
  }
}
