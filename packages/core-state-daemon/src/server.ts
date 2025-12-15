/**
 * State daemon HTTP server
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { InMemoryStateBroker } from '@kb-labs/core-state-broker';
import { JobsManager } from './jobs-manager';

export interface StateDaemonConfig {
  port?: number;
  host?: string;
  enableJobs?: boolean;
}

export class StateDaemonServer {
  private broker: InMemoryStateBroker;
  private jobsManager: JobsManager | null = null;
  private server: Server | null = null;
  private isShuttingDown = false;

  constructor(private config: StateDaemonConfig = {}) {
    this.broker = new InMemoryStateBroker();

    // Initialize jobs manager if enabled
    if (this.config.enableJobs !== false) {
      const createLogger = (prefix: string = '[jobs]'): import('@kb-labs/core-platform').ILogger => ({
        trace: (msg: string, meta?: Record<string, unknown>) => console.debug(prefix, '[trace]', msg, meta),
        debug: (msg: string, meta?: Record<string, unknown>) => console.debug(prefix, msg, meta),
        info: (msg: string, meta?: Record<string, unknown>) => console.log(prefix, msg, meta),
        warn: (msg: string, meta?: Record<string, unknown>) => console.warn(prefix, msg, meta),
        error: (msg: string, error?: Error, meta?: Record<string, unknown>) => console.error(prefix, msg, error, meta),
        child: (bindings: Record<string, unknown>) => createLogger(`${prefix}:${JSON.stringify(bindings)}`),
      });

      this.jobsManager = new JobsManager({
        logger: createLogger('[jobs]'),
      });
    }
  }

  async start(): Promise<void> {
    const port = this.config.port ?? 7777;
    const host = this.config.host ?? 'localhost';

    // Initialize jobs manager if enabled
    if (this.jobsManager) {
      await this.jobsManager.initialize();
    }

    this.server = createServer((req, res) => this.handleRequest(req, res));

    // Handle shutdown signals
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    return new Promise((resolve, reject) => {
      this.server!.listen(port, host, () => {
        console.log(`State daemon listening on ${host}:${port}`);
        if (this.jobsManager) {
          console.log('Jobs manager enabled - HTTP endpoints available at /jobs');
        }
        resolve();
      });

      this.server!.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    // Dispose jobs manager
    if (this.jobsManager) {
      await this.jobsManager.dispose();
    }

    await this.broker.stop();

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => resolve());
      });
    }
  }

  private async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    console.log('Shutting down state daemon...');
    await this.stop();
    process.exit(0);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);

    try {
      // GET /health
      if (req.method === 'GET' && url.pathname === '/health') {
        const health = await this.broker.getHealth();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
        return;
      }

      // GET /stats
      if (req.method === 'GET' && url.pathname === '/stats') {
        const stats = await this.broker.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
      }

      // GET /state/:key
      if (req.method === 'GET' && url.pathname.startsWith('/state/')) {
        const key = decodeURIComponent(url.pathname.slice(7));
        const value = await this.broker.get(key);

        if (value === null) {
          res.writeHead(404);
          res.end();
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(value));
        return;
      }

      // PUT /state/:key
      if (req.method === 'PUT' && url.pathname.startsWith('/state/')) {
        const key = decodeURIComponent(url.pathname.slice(7));
        const body = await this.readBody(req);
        const { value, ttl } = JSON.parse(body);

        await this.broker.set(key, value, ttl);

        res.writeHead(204);
        res.end();
        return;
      }

      // DELETE /state/:key
      if (req.method === 'DELETE' && url.pathname.startsWith('/state/')) {
        const key = decodeURIComponent(url.pathname.slice(7));
        await this.broker.delete(key);

        res.writeHead(204);
        res.end();
        return;
      }

      // POST /state/clear
      if (req.method === 'POST' && url.pathname === '/state/clear') {
        const pattern = url.searchParams.get('pattern') || undefined;
        await this.broker.clear(pattern);

        res.writeHead(204);
        res.end();
        return;
      }

      // GET /jobs - List all registered jobs
      if (req.method === 'GET' && url.pathname === '/jobs') {
        if (!this.jobsManager) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Jobs manager not enabled' }));
          return;
        }

        const jobs = this.jobsManager.listJobs();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jobs }));
        return;
      }

      // POST /jobs/:id/trigger - Manually trigger a job
      if (req.method === 'POST' && url.pathname.startsWith('/jobs/') && url.pathname.endsWith('/trigger')) {
        if (!this.jobsManager) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Jobs manager not enabled' }));
          return;
        }

        const id = decodeURIComponent(url.pathname.slice(6, -8)); // Remove "/jobs/" and "/trigger"

        try {
          await this.jobsManager.triggerJob(id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, message: `Job ${id} triggered successfully` }));
        } catch (error) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Job not found'
          }));
        }
        return;
      }

      // GET /jobs/stats - Get jobs statistics
      if (req.method === 'GET' && url.pathname === '/jobs/stats') {
        if (!this.jobsManager) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Jobs manager not enabled' }));
          return;
        }

        const stats = this.jobsManager.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
      }

      // 404 Not Found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      }));
    }
  }

  private async readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
  }
}
