import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { app } from '../src/server/app.js';
import { sql } from '../src/db/index.js';

// Mock Resend to bypass actual email sending with invalid API key
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: vi.fn().mockResolvedValue({ data: { id: 'test_123' }, error: null })
      };
    }
  };
});

describe('User Authentication & Magic Links', () => {
  let server: any;
  let baseUrl: string;
  let issuedSessionToken: string;

  beforeAll(async () => {
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
    
    // Clear out any previous test data
    await sql`DELETE FROM users WHERE email = 'test.auth@example.com'`;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await sql`DELETE FROM users WHERE email = 'test.auth@example.com'`;
  });

  it('generates a magic link and creates a user record', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.auth@example.com' })
    });
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    
    // Verify user was created in DB
    const [user] = await sql`SELECT * FROM users WHERE email = 'test.auth@example.com'`;
    expect(user).toBeDefined();
    
    // Verify token was created
    const [token] = await sql`SELECT * FROM auth_tokens WHERE user_id = ${user.id}`;
    expect(token).toBeDefined();
    expect(token.used).toBe(false);
  });

  it('verifies a valid token and issues a 30-day session token', async () => {
    // Get the token we just created
    const [user] = await sql`SELECT * FROM users WHERE email = 'test.auth@example.com'`;
    const [tokenRec] = await sql`SELECT * FROM auth_tokens WHERE user_id = ${user.id} AND used = false`;
    
    const res = await fetch(`${baseUrl}/api/auth/verify?token=${tokenRec.token}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.user.email).toBe('test.auth@example.com');
    expect(json.sessionToken).toBeDefined();
    expect(typeof json.sessionToken).toBe('string');
    issuedSessionToken = json.sessionToken;
    
    // Verify it was marked as used
    const [updatedToken] = await sql`SELECT used FROM auth_tokens WHERE token = ${tokenRec.token}`;
    expect(updatedToken.used).toBe(true);
  });
  
  it('rejects an already used token', async () => {
    const [user] = await sql`SELECT * FROM users WHERE email = 'test.auth@example.com'`;
    const [tokenRec] = await sql`SELECT * FROM auth_tokens WHERE user_id = ${user.id} AND used = true`;
    
    const res = await fetch(`${baseUrl}/api/auth/verify?token=${tokenRec.token}`);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Token already used');
  });

  it('allows access to protected routes with valid session token', async () => {
    const res = await fetch(`${baseUrl}/api/user/dossiers`, {
      headers: {
        'Authorization': `Bearer ${issuedSessionToken}`
      }
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.dossiers)).toBe(true);
  });

  it('rejects expired session tokens in requireAuth', async () => {
    const [user] = await sql`SELECT * FROM users WHERE email = 'test.auth@example.com'`;
    const expiredToken = 'test_expired_token_12345';
    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago

    await sql`
      INSERT INTO auth_tokens (token, user_id, expires_at, used)
      VALUES (${expiredToken}, ${user.id}, ${pastDate}, false);
    `;

    const res = await fetch(`${baseUrl}/api/user/dossiers`, {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Session expired');

    await sql`DELETE FROM auth_tokens WHERE token = ${expiredToken};`;
  });
});
