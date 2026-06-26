/**
 * Multi-tenant form submission worker.
 * Resolves client from Origin header → KV lookup for per-client config.
 * Handles: Turnstile verification → honeypot check → R2 file upload → email via Resend.
 *
 * Secrets (via wrangler secret put):
 *   RESEND_API_KEY — Resend API key for email delivery
 *
 * KV (CLIENT_CONFIG) per-client entry structure:
 *   key: origin URL (e.g., "https://apexroofing.ca")
 *   value: JSON { destinationEmail, r2Prefix, turnstileSecretKey, businessName }
 */

import { Env, ParsedFormData, FormFile, jsonResponse } from './types';
import { resolveClient, corsHeaders } from './client-resolver';
import { verifyTurnstile } from './turnstile';
import { isHoneypotTriggered } from './honeypot';
import { uploadFiles } from './r2-upload';
import { sendNotificationEmail } from './email';

export type { Env } from './types';
export type { ClientConfig } from './types';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      if (origin) {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin),
        });
      }
      return new Response(null, { status: 204 });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // Resolve client from Origin header via KV
    const client = await resolveClient(request, env);
    if (!client) {
      return jsonResponse({ error: 'Unknown origin' }, 403);
    }

    const { config: clientConfig, origin } = client;

    try {
      // Parse multipart/form-data body
      let formData: ParsedFormData;
      try {
        formData = await parseMultipartForm(request);
      } catch {
        return jsonResponse({ error: 'Malformed request body' }, 400, origin);
      }

      // Step 1: Turnstile verification
      const turnstileToken = formData.fields['cf-turnstile-response'] || null;
      const remoteIp = request.headers.get('CF-Connecting-IP');
      const turnstileResult = await verifyTurnstile(
        turnstileToken,
        clientConfig.turnstileSecretKey,
        remoteIp
      );

      if (!turnstileResult.success) {
        return jsonResponse({ error: 'Verification failed' }, 403, origin);
      }

      // Step 2: Honeypot check
      if (isHoneypotTriggered(formData.fields, clientConfig)) {
        // Silently succeed to not tip off bots
        return jsonResponse({ success: true, message: 'Submission received' }, 200, origin);
      }

      // Step 3: Upload files to R2
      let uploadedFiles = [];
      try {
        uploadedFiles = await uploadFiles(formData.files, clientConfig, env);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'File upload failed';
        return jsonResponse({ error: `Upload failed: ${message}` }, 500, origin);
      }

      // Step 4: Send email notification via Resend
      const emailResult = await sendNotificationEmail({
        fields: formData.fields,
        files: uploadedFiles,
        clientConfig,
        env,
      });

      if (!emailResult.success) {
        // Log the error but still return success since data was stored in R2
        console.error('Email send failed:', emailResult.error);
      }

      return jsonResponse({ success: true, message: 'Submission received' }, 200, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      console.error('Worker error:', message);
      return jsonResponse({ error: 'Internal server error' }, 500, origin);
    }
  },
};

/**
 * Parses a multipart/form-data request into fields and files.
 */
async function parseMultipartForm(request: Request): Promise<ParsedFormData> {
  const contentType = request.headers.get('Content-Type') || '';

  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
    throw new Error('Unsupported content type');
  }

  const formData = await request.formData();
  const fields: Record<string, string> = {};
  const files: FormFile[] = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      fields[key] = value;
    } else {
      // value is a File object
      const file = value as unknown as File;
      const arrayBuffer = await file.arrayBuffer();
      files.push({
        name: file.name,
        data: arrayBuffer,
        type: file.type,
      });
    }
  }

  return { fields, files };
}
