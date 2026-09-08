import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes.js';
import path from 'path';

export const app = express();

app.use(cors());
app.use(express.json());

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
