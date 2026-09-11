import { Resend } from 'resend';

export const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const resendApiKey = process.env.RESEND_API_KEY || 're_test_12345';
const resend = new Resend(resendApiKey);

function isMockEnvironment(): boolean {
  return process.env.NODE_ENV !== 'production' && (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_test_') || process.env.RESEND_API_KEY === 're_mock_key_for_development');
}

/**
 * Sends the Location Feasibility Dossier to a customer post-purchase.
 */
export async function sendDossierEmail(
  toEmail: string,
  cityId: string,
  categoryId: string
): Promise<boolean> {
  const dossierUrl = `${APP_BASE_URL}/?city=${encodeURIComponent(cityId)}&category=${encodeURIComponent(categoryId)}&view=dossier`;

  if (isMockEnvironment()) {
    console.log(`[Dev/Test Email Dispatcher] Dossier email simulated to ${toEmail}`);
    console.log(`[Dev/Test Email Dispatcher] Access URL: ${dossierUrl}`);
    return true;
  }

  try {
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4F46E5;">Your Location Feasibility Dossier is Ready</h2>
        <p>Thank you for your purchase.</p>
        <p>We have compiled the requested market intelligence for <strong>${categoryId.replace(/_/g, ' ')}</strong> in <strong>${cityId.replace('CSD_', '')}</strong>.</p>
        
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="margin-top: 0;">Access Your Report</h3>
          <p style="margin-bottom: 24px;">Your secure digital dossier can be viewed and downloaded using the link below:</p>
          <a href="${dossierUrl}" 
             style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Full Dossier
          </a>
        </div>
        
        <p style="font-size: 12px; color: #6B7280; margin-top: 40px;">
          If you have any questions or require support, please reply to this email.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Ontario Intelligence <noreply@ontario-intelligence.example.com>',
      to: [toEmail],
      subject: 'Your Location Feasibility Dossier',
      html: htmlContent,
    });

    if (error) {
      console.error('Failed to send dossier email:', error);
      return false;
    }

    console.log(`Dossier email sent to ${toEmail} [ID: ${data?.id}]`);
    return true;
  } catch (err) {
    console.error('Exception sending dossier email:', err);
    return false;
  }
}

/**
 * Sends a Magic Link login email to the user.
 */
export async function sendMagicLinkEmail(toEmail: string, token: string): Promise<boolean> {
  const magicLinkUrl = `${APP_BASE_URL}/?token=${encodeURIComponent(token)}`;

  if (isMockEnvironment()) {
    console.log(`[Dev/Test Email Dispatcher] Magic link email simulated to ${toEmail}`);
    console.log(`[Dev/Test Email Dispatcher] Login URL: ${magicLinkUrl}`);
    return true;
  }

  try {
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4F46E5;">Log In to Ontario Intelligence</h2>
        <p>Click the secure link below to log in to your account. This link will expire in 15 minutes.</p>
        
        <div style="margin: 32px 0;">
          <a href="${magicLinkUrl}" 
             style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Log In Now
          </a>
        </div>
        
        <p style="font-size: 12px; color: #6B7280;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Ontario Intelligence Auth <noreply@ontario-intelligence.example.com>',
      to: [toEmail],
      subject: 'Your Login Link for Ontario Intelligence',
      html: htmlContent,
    });

    if (error) {
      console.error('Failed to send magic link email:', error);
      return false;
    }

    console.log(`Magic link sent to ${toEmail} [ID: ${data?.id}]`);
    return true;
  } catch (err) {
    console.error('Exception sending magic link:', err);
    return false;
  }
}

/**
 * Sends an Alert Notification to a subscriber.
 */
export async function sendAlertNotificationEmail(
  toEmail: string,
  eventTitle: string,
  eventDescription: string,
  occurredAt: string
): Promise<boolean> {
  if (isMockEnvironment()) {
    console.log(`[Dev/Test Email Dispatcher] Alert simulated to ${toEmail}: ${eventTitle}`);
    return true;
  }

  try {
    const dateStr = new Date(occurredAt).toLocaleString();
    
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #F59E0B;">Ontario Intelligence Alert Triggered</h2>
        <p>One of your active watches has recorded a new event:</p>
        
        <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0;">
          <h3 style="margin-top: 0;">${eventTitle}</h3>
          <p>${eventDescription}</p>
          <p style="font-size: 12px; color: #9CA3AF; margin-bottom: 0;">Recorded: ${dateStr}</p>
        </div>
        
        <p style="font-size: 12px; color: #6B7280;">
          You are receiving this because you set up an active watch on the Ontario Intelligence platform.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Ontario Intelligence Alerts <alerts@ontario-intelligence.example.com>',
      to: [toEmail],
      subject: `Alert: ${eventTitle}`,
      html: htmlContent,
    });

    if (error) {
      console.error('Failed to send alert email:', error);
      return false;
    }

    console.log(`Alert sent to ${toEmail} [ID: ${data?.id}]`);
    return true;
  } catch (err) {
    console.error('Exception sending alert:', err);
    return false;
  }
}
