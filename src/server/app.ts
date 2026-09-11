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

// In-memory sliding-window IP rate limiter for sensitive endpoints (T-034)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitMap.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // In test suite, skip unless explicitly testing rate limiter
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.baseUrl || ''}${req.path}:${ip}`;
    const now = Date.now();
    let bucket = rateLimitMap.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 1, resetAt: now + options.windowMs };
      rateLimitMap.set(key, bucket);
      return next();
    }

    bucket.count++;
    if (bucket.count > options.max) {
      const retrySec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retrySec.toString());
      return res.status(429).json({
        success: false,
        error: options.message || 'Too many requests, please try again later.'
      });
    }

    next();
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
