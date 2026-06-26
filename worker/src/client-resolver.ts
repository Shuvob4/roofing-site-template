/**
 * Client resolution from Origin header via KV lookup.
 * Sets CORS headers for the matched origin.
 */

import { ClientConfig, Env } from './types';

export interface ClientResolution {
  config: ClientConfig;
  origin: string;
}

/**
 * Resolves client configuration from the request Origin header.
 * Returns null if the origin is not found in KV.
 */
export async function resolveClient(
  request: Request,
  env: Env
): Promise<ClientResolution | null> {
  const origin = request.headers.get('Origin');

  if (!origin) {
    return null;
  }

  const config = await env.CLIENT_CONFIG.get<ClientConfig>(origin, 'json');

  if (!config) {
    return null;
  }

  return { config, origin };
}

/**
 * Returns CORS headers for the given origin.
 */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
