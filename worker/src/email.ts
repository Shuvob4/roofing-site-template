/**
 * Email notification via Resend API.
 * Sends form submission data to the client's configured destination email.
 */

import { ClientConfig, Env, UploadedFile } from './types';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface SendEmailParams {
  fields: Record<string, string>;
  files: UploadedFile[];
  clientConfig: ClientConfig;
  env: Env;
}

/**
 * Sends a notification email with form submission data via Resend.
 *
 * @returns true if email was sent successfully, false otherwise
 */
export async function sendNotificationEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const { fields, files, clientConfig, env } = params;

  const subject = buildSubject(fields, clientConfig);
  const html = buildEmailHtml(fields, files, clientConfig);
  const senderDomain = clientConfig.senderEmail || `noreply@${extractDomain(clientConfig.businessName)}`;

  const payload = {
    from: `${clientConfig.businessName} <${senderDomain}>`,
    to: clientConfig.destinationEmail,
    subject,
    html,
  };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Resend API error (${response.status}): ${errorBody}` };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Email send failed: ${message}` };
  }
}

/**
 * Builds the email subject based on form type and customer name.
 */
function buildSubject(fields: Record<string, string>, clientConfig: ClientConfig): string {
  const formType = fields['form_type'] || 'Contact';
  const customerName = fields['name'] || fields['customer_name'] || 'Unknown';

  const typeLabels: Record<string, string> = {
    quote: 'New Quote Request',
    booking: 'New Booking Request',
    contact: 'New Contact Message',
  };

  const label = typeLabels[formType.toLowerCase()] || `New ${formType} Submission`;
  return `${label} from ${customerName} — ${clientConfig.businessName}`;
}

/**
 * Builds the HTML email body with all form fields and file links.
 */
function buildEmailHtml(
  fields: Record<string, string>,
  files: UploadedFile[],
  clientConfig: ClientConfig
): string {
  const excludeFields = ['cf-turnstile-response', 'website_url', clientConfig.honeypotField || ''];

  const fieldRows = Object.entries(fields)
    .filter(([key]) => !excludeFields.includes(key))
    .map(
      ([key, value]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;vertical-align:top;white-space:nowrap;">${formatFieldName(key)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  const fileSection =
    files.length > 0
      ? `
    <h3 style="margin-top:24px;color:#333;">Uploaded Photos (${files.length})</h3>
    <ul style="padding-left:20px;">
      ${files.map((f) => `<li><a href="${escapeHtml(f.url)}" target="_blank">${escapeHtml(f.filename)}</a> (expires in 7 days)</li>`).join('')}
    </ul>`
      : '';

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#333;border-bottom:2px solid #0066cc;padding-bottom:8px;">
        ${escapeHtml(clientConfig.businessName)} — Form Submission
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        ${fieldRows}
      </table>
      ${fileSection}
      <p style="margin-top:24px;color:#666;font-size:13px;">
        This email was sent automatically from your website contact form.
      </p>
    </div>
  `;
}

/**
 * Formats a field name from snake_case/kebab-case to Title Case.
 */
function formatFieldName(name: string): string {
  return name
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Escapes HTML special characters to prevent injection.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extracts a domain-like string from a business name for the sender email fallback.
 */
function extractDomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .concat('.com');
}
