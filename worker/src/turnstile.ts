/**
 * Turnstile server-side verification.
 * Uses per-client secret key from KV config.
 */

import { TurnstileVerifyResponse } from './types';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifies a Turnstile token with Cloudflare's siteverify API.
 *
 * @param token - The cf-turnstile-response token from the form
 * @param secretKey - Per-client Turnstile secret key from KV
 * @param remoteIp - Client IP from CF-Connecting-IP header
 * @returns true if verification passes, false otherwise
 */
export async function verifyTurnstile(
  token: string | null,
  secretKey: string | undefined,
  remoteIp: string | null
): Promise<{ success: boolean; error?: string }> {
  // If no secret key configured, skip verification (Turnstile disabled for this client)
  if (!secretKey) {
    return { success: true };
  }

  // If secret key is configured but token is missing, reject
  if (!token) {
    return { success: false, error: 'Turnstile token missing' };
  }

  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (remoteIp) {
    formData.append('remoteip', remoteIp);
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const result = await response.json<TurnstileVerifyResponse>();

    if (!result.success) {
      return {
        success: false,
        error: `Verification failed: ${(result['error-codes'] || []).join(', ')}`,
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Turnstile verification request failed' };
  }
}
