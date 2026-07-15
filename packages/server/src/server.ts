import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AgentShowConfig,
  ClientMessage,
  PageElement,
} from '@agentshow/shared';
import { generateToken, isAllowedOrigin } from '@agentshow/core';
import { WSHandler } from './ws/handler.js';
import { PlanCache } from './cache/plan-cache.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function startServer(
  config: AgentShowConfig,
): Promise<{ port: number; token: string }> {
  const port = config.server.port;
  const token = generateToken();
  const allowedOrigins = [
    'http://localhost:5175',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const reqUrl = (req.url ?? '/').split('?')[0];

    if (reqUrl === '/widget.js') {
      // Try to read widget bundle
      const widgetPaths = [
        resolve(__dirname, '../../widget/dist/entry-browser.global.js'),
        resolve(process.cwd(), 'packages/widget/dist/entry-browser.global.js'),
      ];
      for (const wp of widgetPaths) {
        try {
          const code = readFileSync(wp, 'utf-8');
          res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(code);
          return;
        } catch {
          // try next
        }
      }
      res.writeHead(404);
      res.end('// Widget not built. Run npm run build:widget first.');
      return;
    }

    if (reqUrl === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, port, version: '0.1.0' }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  const wss = new WebSocketServer({ server });
  const cache = new PlanCache(process.cwd());
  let currentPage: { url: string; title: string; elements: PageElement[] } = {
    url: '',
    title: '',
    elements: [],
  };
  let handler: WSHandler | null = null;

  wss.on('connection', (ws: WebSocket, req: import('node:http').IncomingMessage) => {
    // Token鉴权（dev模式允许空token）
    const url = new URL(req.url ?? '/', `http://localhost`);
    const clientToken = url.searchParams.get('token');
    if (token && clientToken !== token) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Origin校验
    const origin = req.headers.origin;
    if (origin && !isAllowedOrigin(origin, allowedOrigins)) {
      ws.close(4003, 'Forbidden');
      return;
    }

    console.log('[AgentShow] Widget connected');
    handler = new WSHandler(config, cache);

    ws.on('message', async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;

        if (msg.type === 'page-state') {
          currentPage = {
            url: msg.url,
            title: msg.title,
            elements: msg.elements,
          };
          return;
        }

        if (handler) {
          await handler.handleMessage(ws, msg, currentPage);
        }
      } catch (err) {
        console.error('[AgentShow] WS error:', err);
      }
    });

    ws.on('close', () => {
      console.log('[AgentShow] Widget disconnected');
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ port, token });
    });
  });
}
