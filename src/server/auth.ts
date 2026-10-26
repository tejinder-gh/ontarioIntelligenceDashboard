import { Router, Request, Response, NextFunction } from 'express';
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
    let [user] = await sql<{ id: string; email: string }[]>`
      SELECT id, email FROM users WHERE email = ${email};
    `;

    if (!user) {
      [user] = await sql<{ id: string; email: string }[]>`
        INSERT INTO users (email) VALUES (${email}) RETURNING id, email;
      `;
    }

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // 3. Save magic-link token with explicit token_type
    await sql`
      INSERT INTO auth_tokens (token, user_id, expires_at, used, token_type)
      VALUES (${token}, ${user.id}, ${expiresAt}, FALSE, 'MAGIC_LINK');
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
// Validates magic link token and atomically exchanges for a session token
authRouter.get('/verify', async (req, res) => {
  const token = req.query.token as string;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token required' });
  }

  try {
    // Atomic Compare-And-Swap (CAS) to prevent concurrent replay attacks
    const [authToken] = await sql<{ user_id: string }[]>`
      UPDATE auth_tokens
      SET used = TRUE
      WHERE token = ${token}
        AND used = FALSE
        AND token_type = 'MAGIC_LINK'
        AND expires_at > NOW()
      RETURNING user_id;
    `;

    if (!authToken) {
      // Diagnostic check to report exact failure reason
      const [existing] = await sql<{ user_id: string; used: boolean; expires_at: Date; token_type: string }[]>`
        SELECT user_id, used, expires_at, token_type FROM auth_tokens WHERE token = ${token};
      `;

      if (!existing) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
      if (existing.token_type !== 'MAGIC_LINK') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token purpose: cannot verify non-magic-link token'
        });
      }
      if (existing.used) {
        return res.status(401).json({ success: false, error: 'Token already used' });
      }
      if (new Date() > existing.expires_at) {
        return res.status(401).json({ success: false, error: 'Token expired' });
      }
      return res.status(401).json({ success: false, error: 'Invalid or consumed token' });
    }

    // Update last login
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${authToken.user_id};`;

    // Issue a separate, secure 30-day session token with token_type = 'SESSION'
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await sql`
      INSERT INTO auth_tokens (token, user_id, expires_at, used, token_type)
      VALUES (${sessionToken}, ${authToken.user_id}, ${sessionExpiresAt}, FALSE, 'SESSION');
    `;

    const [user] = await sql<{ id: string; email: string }[]>`
      SELECT id, email FROM users WHERE id = ${authToken.user_id};
    `;

    res.json({ success: true, user, sessionToken });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/logout
// Revokes the caller's active session token
authRouter.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    await sql`UPDATE auth_tokens SET used = TRUE WHERE token = ${token};`;
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

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
 * Expects header: Authorization: Bearer <session-token>
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const [sessionRecord] = await sql<{ user_id: string; expires_at: Date; used: boolean; token_type: string }[]>`
      SELECT user_id, expires_at, used, token_type 
      FROM auth_tokens 
      WHERE token = ${token};
    `;

    if (!sessionRecord) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }

    if (sessionRecord.token_type !== 'SESSION') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token purpose: magic-link tokens cannot be used as session bearer tokens'
      });
    }

    if (sessionRecord.used) {
      return res.status(401).json({ success: false, error: 'Session has been revoked' });
    }

    if (new Date() > sessionRecord.expires_at) {
      return res.status(401).json({ success: false, error: 'Session expired' });
    }

    const [user] = await sql<{ id: string; email: string }[]>`
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
