import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes.js';
import path from 'path';

export const app = express();

// Security headers & banner suppression (T-034)
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors());

// Stripe Webhook needs raw body
import { handleStripeWebhook } from './stripe-webhook.js';
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

import { sql } from '../db/index.js';

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // In test suite, skip unless explicitly testing rate limiter
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const endpoint = `${req.baseUrl || ''}${req.path}`;
    
    // Align window to the block size
    const nowMs = Date.now();
    const windowStartMs = Math.floor(nowMs / options.windowMs) * options.windowMs;
    const windowStart = new Date(windowStartMs);

    try {
      const [record] = await sql<{ request_count: number }[]>`
        INSERT INTO rate_limits (ip_address, endpoint, window_start, request_count)
        VALUES (${ip}, ${endpoint}, ${windowStart}, 1)
        ON CONFLICT (ip_address, endpoint, window_start)
        DO UPDATE SET request_count = rate_limits.request_count + 1
        RETURNING request_count;
      `;

      if (record.request_count > options.max) {
        const resetAtMs = windowStartMs + options.windowMs;
        const retrySec = Math.ceil((resetAtMs - nowMs) / 1000);
        res.setHeader('Retry-After', retrySec.toString());
        return res.status(429).json({
          success: false,
          error: options.message || 'Too many requests, please try again later.'
        });
      }

      next();
    } catch (err) {
      console.error('[RateLimiter Error]', err);
      // Fail open so we don't block requests if DB drops
      next();
    }
  };
}

const sensitivePostLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests to this endpoint, please retry in 1 minute.'
});

app.post('/api/checkout/dossier', sensitivePostLimiter);
app.post('/api/alerts/watches', sensitivePostLimiter);

// Request logging & persistence audit
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms) [Read: Local Persistent DB]`);
    }
  });
  next();
});

// API routes
app.use('/api', apiRouter);

// Serve static build in production
const clientDist = path.resolve(process.cwd(), 'dist');
app.use(express.static(clientDist));

// Fallback for SPA routing in production
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});
