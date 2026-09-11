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

// Important: import after mocking
import { sendDossierEmail } from '../src/alerts/email-dispatcher.js';

describe('Email Dispatcher Service (T-048)', () => {
  it('sends a dossier fulfillment email via Resend', async () => {
    const success = await sendDossierEmail('customer@example.com', 'CSD_toronto', 'pizza_store');
    expect(success).toBe(true);
  });
});
