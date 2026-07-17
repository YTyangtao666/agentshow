import type { ClientMessage, ServerMessage } from '@agentshow/shared';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners = new Map<string, Set<(msg: ServerMessage) => void>>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private reconnectAttempts = 0;
  private maxReconnect = Infinity; // unlimited reconnects
  private baseDelay = 1000; // 1s initial backoff
  private maxDelay = 30000; // cap at 30s
  private destroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(port: number, token: string) {
    this.url = `ws://localhost:${port}/?token=${token}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.destroyed) {
        reject(new Error('WSClient destroyed'));
        return;
      }
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[AgentShow] WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyStatus('connected');
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
        if (!this.destroyed) {
          this.attemptReconnect();
        }
      };
    });
  }

  private attemptReconnect(): void {
    if (this.destroyed) return;
    if (this.reconnectAttempts >= this.maxReconnect) {
      this.notifyStatus('disconnected');
      return;
    }

    this.reconnectAttempts++;
    this.notifyStatus('reconnecting');

    // Exponential backoff with jitter: min(base * 2^(n-1), max) + random 0-500ms
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxDelay,
    );
    const jitter = Math.random() * 500;
    const delay = exponentialDelay + jitter;

    console.log(
      `[AgentShow] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${this.reconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error already handled by onclose -> attemptReconnect cycle
      });
    }, delay);
  }

  /** Gracefully destroy the client — stop all reconnection attempts */
  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect loop
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus('disconnected');
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

  /** Listen for connection status changes */
  onStatus(handler: (status: ConnectionStatus) => void): void {
    this.statusListeners.add(handler);
  }

  private notifyStatus(status: ConnectionStatus): void {
    this.statusListeners.forEach((fn) => fn(status));
  }

  private emit(msg: ServerMessage): void {
    this.listeners.get(msg.type)?.forEach((fn) => fn(msg));
  }
}
