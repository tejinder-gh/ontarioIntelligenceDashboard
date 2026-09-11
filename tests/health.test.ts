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

  it('sets security headers and suppresses x-powered-by (T-034)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('throttles excessive requests on rate-limited endpoints when tested (T-034)', async () => {
    const limiterUrl = `${baseUrl}/api/checkout/dossier`;
    let lastStatus = 200;

    // Send rapid requests with x-test-rate-limit header
    for (let i = 0; i < 35; i++) {
      const res = await fetch(limiterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-rate-limit': 'true',
        },
        body: JSON.stringify({ email: 'test@example.com', cityId: 'CSD_burlington', categoryId: 'pizza_store' }),
      });
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).toBe(429);
  });
});

