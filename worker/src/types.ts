/**
 * Shared types for the multi-tenant form worker.
 */

export interface Env {
  CLIENT_CONFIG: KVNamespace;
  UPLOADS: R2Bucket;
  RESEND_API_KEY: string;
}

export interface ClientConfig {
  destinationEmail: string;
  r2Prefix: string;
  turnstileSecretKey?: string;
  businessName: string;
  senderEmail?: string;
  honeypotField?: string;
}

export interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export interface ParsedFormData {
  fields: Record<string, string>;
  files: FormFile[];
}

export interface FormFile {
  name: string;
  data: ArrayBuffer;
  type: string;
}

export interface UploadedFile {
  key: string;
  url: string;
  filename: string;
}

export interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export function jsonResponse(body: Record<string, unknown>, status: number, origin?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  return new Response(JSON.stringify(body), { status, headers });
}
