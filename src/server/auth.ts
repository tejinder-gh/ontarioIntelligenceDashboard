import { Router } from 'express';
import { sql } from '../db/index.js';
import { sendMagicLinkEmail } from '../alerts/email-dispatcher.js';
import crypto from 'crypto';
import z from 'zod';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
});

// POST /api/auth/login
// Generates a magic link and sends it via email
authRouter.post('/login', async (req, res) => {
  try {
    const { email } = loginSchema.parse(req.body);

    // 1. Ensure user exists (or create)
    let [user] = await sql<{ id: string, email: string }[]>`
      SELECT id, email FROM users WHERE email = ${email};
    `;

    if (!user) {
      [user] = await sql<{ id: string, email: string }[]>`
        INSERT INTO users (email) VALUES (${email}) RETURNING id, email;
      `;
    }

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // 3. Save token
    await sql`
      INSERT INTO auth_tokens (token, user_id, expires_at)
      VALUES (${token}, ${user.id}, ${expiresAt});
    `;

    // 4. Send Email
    const emailSent = await sendMagicLinkEmail(user.email, token);

    if (!emailSent) {
      return res.status(500).json({ success: false, error: 'Failed to send login email' });
    }

    res.json({ success: true, message: 'Magic link sent' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.issues });
    }
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/auth/verify?token=...
// Validates token
authRouter.get('/verify', async (req, res) => {
  const token = req.query.token as string;
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token required' });
  }

  try {
    const [authToken] = await sql<{ user_id: string, used: boolean, expires_at: Date }[]>`
      SELECT user_id, used, expires_at FROM auth_tokens WHERE token = ${token};
    `;

    if (!authToken) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    if (authToken.used) {
      return res.status(401).json({ success: false, error: 'Token already used' });
    }

    if (new Date() > authToken.expires_at) {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }

    // Mark magic link token as used
    await sql`UPDATE auth_tokens SET used = TRUE WHERE token = ${token};`;

    // Update last login
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${authToken.user_id};`;

    // Issue a separate, secure 30-day session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await sql`
      INSERT INTO auth_tokens (token, user_id, expires_at, used)
      VALUES (${sessionToken}, ${authToken.user_id}, ${sessionExpiresAt}, FALSE);
    `;

    const [user] = await sql<{ id: string, email: string }[]>`
      SELECT id, email FROM users WHERE id = ${authToken.user_id};
    `;

    res.json({ success: true, user, sessionToken });

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware to protect routes that require authentication
 * Expects header: Authorization: Bearer <token>
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const [sessionRecord] = await sql<{ user_id: string, expires_at: Date, used: boolean }[]>`
      SELECT user_id, expires_at, used 
      FROM auth_tokens 
      WHERE token = ${token};
    `;

    if (!sessionRecord) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }

    if (new Date() > sessionRecord.expires_at) {
      return res.status(401).json({ success: false, error: 'Session expired' });
    }

    const [user] = await sql<{ id: string, email: string }[]>`
      SELECT id, email FROM users WHERE id = ${sessionRecord.user_id};
    `;

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
