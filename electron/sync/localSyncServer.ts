/**
 * Minimal local sync server for development/testing.
 * Run with: npx ts-node -p tsconfig.electron.json electron/sync/localSyncServer.ts
 * Or: node dist-electron/electron/sync/localSyncServer.js
 *
 * Stores ciphertext in memory. Supports optional X-Sync-Token for placeholder auth.
 */
import { createServer, IncomingMessage, ServerResponse } from 'http';

const PORT = 3456;
let stored: string | null = null;

function getBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (ch) => chunks.push(ch));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  if (url.startsWith('/vault')) {
    if (req.method === 'GET') {
      if (stored) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(stored);
      } else {
        res.writeHead(404);
        res.end();
      }
      return;
    }
    if (req.method === 'POST') {
      const body = await getBody(req);
      stored = body;
      res.writeHead(200);
      res.end();
      return;
    }
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Local sync server at http://localhost:${PORT}`);
  console.log('Configure sync with: { serverUrl: "http://localhost:' + PORT + '", deviceName: "local" }');
});
