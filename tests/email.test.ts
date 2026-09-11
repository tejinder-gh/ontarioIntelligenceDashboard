import { describe, it, expect, vi } from 'vitest';

vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn(async () => {
          return { data: { id: 'test_email_123' }, error: null };
        })
      };
    }
  };
});

import { sendDossierEmail, sendMagicLinkEmail, sendAlertNotificationEmail, APP_BASE_URL } from '../src/alerts/email-dispatcher.js';

describe('Email Dispatcher Service (T-048 & T-054)', () => {
  it('reads APP_BASE_URL cleanly with default fallback', () => {
    expect(APP_BASE_URL).toBeDefined();
    expect(APP_BASE_URL.startsWith('http')).toBe(true);
  });

  it('sends a dossier fulfillment email with valid URL parameters', async () => {
    const success = await sendDossierEmail('customer@example.com', 'CSD_toronto', 'pizza_store');
    expect(success).toBe(true);
  });

  it('sends a magic link email with valid query token URL', async () => {
    const success = await sendMagicLinkEmail('user@example.com', 'sample_test_token_abc123');
    expect(success).toBe(true);
  });

  it('sends an alert notification email', async () => {
    const success = await sendAlertNotificationEmail(
      'subscriber@example.com',
      'Burlington Commercial Real Estate Change',
      'Price dropped 8%',
      new Date().toISOString()
    );
    expect(success).toBe(true);
  });
});
