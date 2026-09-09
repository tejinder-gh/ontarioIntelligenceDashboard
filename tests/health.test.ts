import { describe, it, expect, beforeAll } from 'bun:test';
import { app } from '../src/server/app.js';

describe('Production Health & Liveness Probe', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  it('GET /api/health returns 200 OK with database connectivity status and uptime', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('healthy');
    expect(json.database).toBe('connected');
    expect(typeof json.uptime).toBe('number');
    expect(json.version).toBe('1.0.0');
    expect(json.timestamp).toBeDefined();
  });
});
