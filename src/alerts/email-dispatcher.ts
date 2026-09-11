import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || 're_test_12345';
const resend = new Resend(resendApiKey);

/**
 * Sends the Location Feasibility Dossier to a customer post-purchase.
 * In a real application, this might attach a PDF or a signed URL.
 * For now, we simulate delivery with a nicely formatted email and link.
 */
export async function sendDossierEmail(
  toEmail: string,
  cityId: string,
  categoryId: string
): Promise<boolean> {
  try {
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4F46E5;">Your Location Feasibility Dossier is Ready</h2>
        <p>Thank you for your purchase.</p>
        <p>We have compiled the requested market intelligence for <strong>${categoryId.replace(/_/g, ' ')}</strong> in <strong>${cityId.replace('CSD_', '')}</strong>.</p>
        
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="margin-top: 0;">Access Your Report</h3>
          <p style="margin-bottom: 24px;">Your secure digital dossier can be viewed and downloaded using the link below:</p>
          <a href="https://ontario-intelligence.example.com/dossier/unlock?city=${cityId}&category=${categoryId}" 
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
