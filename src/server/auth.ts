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

    // Mark used
    await sql`UPDATE auth_tokens SET used = TRUE WHERE token = ${token};`;

    // Update last login
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${authToken.user_id};`;

    const [user] = await sql<{ id: string, email: string }[]>`
      SELECT id, email FROM users WHERE id = ${authToken.user_id};
    `;

    res.json({ success: true, user });

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
