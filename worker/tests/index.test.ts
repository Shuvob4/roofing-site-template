import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHoneypotTriggered } from '../src/honeypot';
import { resolveClient, corsHeaders } from '../src/client-resolver';
import { jsonResponse } from '../src/types';
import type { ClientConfig, Env } from '../src/types';

// --- Honeypot Tests ---
describe('Honeypot Check', () => {
  const baseConfig: ClientConfig = {
    destinationEmail: 'test@example.com',
    r2Prefix: 'test-client',
    businessName: 'Test Roofing',
  };

  it('returns true when default honeypot field is filled', () => {
    const fields = { name: 'John', website_url: 'http://spam.com' };
    expect(isHoneypotTriggered(fields, baseConfig)).toBe(true);
  });

  it('returns false when default honeypot field is empty', () => {
    const fields = { name: 'John', website_url: '' };
    expect(isHoneypotTriggered(fields, baseConfig)).toBe(false);
  });

  it('returns false when honeypot field is absent', () => {
    const fields = { name: 'John', email: 'john@test.com' };
    expect(isHoneypotTriggered(fields, baseConfig)).toBe(false);
  });

  it('uses custom honeypot field name from config', () => {
    const config: ClientConfig = { ...baseConfig, honeypotField: 'company_fax' };
    const fields = { name: 'John', company_fax: 'filled by bot' };
    expect(isHoneypotTriggered(fields, config)).toBe(true);
  });

  it('returns false when custom honeypot field is empty', () => {
    const config: ClientConfig = { ...baseConfig, honeypotField: 'company_fax' };
    const fields = { name: 'John', company_fax: '' };
    expect(isHoneypotTriggered(fields, config)).toBe(false);
  });

  it('returns false when honeypot field is whitespace only', () => {
    const fields = { name: 'John', website_url: '   ' };
    expect(isHoneypotTriggered(fields, baseConfig)).toBe(false);
  });
});

// --- Client Resolver Tests ---
describe('Client Resolver', () => {
  const mockConfig: ClientConfig = {
    destinationEmail: 'owner@apexroofing.ca',
    r2Prefix: 'apex',
    turnstileSecretKey: 'test-secret',
    businessName: 'Apex Roofing',
  };

  function createMockEnv(kvData: Record<string, ClientConfig | null> = {}): Env {
    return {
      CLIENT_CONFIG: {
        get: vi.fn(async (key: string) => kvData[key] || null),
      } as unknown as KVNamespace,
      UPLOADS: {} as unknown as R2Bucket,
      RESEND_API_KEY: 'test-api-key',
    };
  }

  it('resolves client for known origin', async () => {
    const env = createMockEnv({ 'https://apexroofing.ca': mockConfig });
    const request = new Request('https://worker.example.com/submit', {
      method: 'POST',
      headers: { Origin: 'https://apexroofing.ca' },
    });

    const result = await resolveClient(request, env);
    expect(result).not.toBeNull();
    expect(result!.config).toEqual(mockConfig);
    expect(result!.origin).toBe('https://apexroofing.ca');
  });

  it('returns null for unknown origin', async () => {
    const env = createMockEnv({});
    const request = new Request('https://worker.example.com/submit', {
      method: 'POST',
      headers: { Origin: 'https://unknown-site.com' },
    });

    const result = await resolveClient(request, env);
    expect(result).toBeNull();
  });

  it('returns null when Origin header is missing', async () => {
    const env = createMockEnv({ 'https://apexroofing.ca': mockConfig });
    const request = new Request('https://worker.example.com/submit', {
      method: 'POST',
    });

    const result = await resolveClient(request, env);
    expect(result).toBeNull();
  });
});

// --- CORS Headers Tests ---
describe('CORS Headers', () => {
  it('returns correct CORS headers for origin', () => {
    const headers = corsHeaders('https://apexroofing.ca');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://apexroofing.ca');
    expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type');
  });
});

// --- JSON Response Helper Tests ---
describe('jsonResponse', () => {
  it('returns correct status and content-type', () => {
    const response = jsonResponse({ error: 'test' }, 403);
    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('includes CORS headers when origin provided', () => {
    const response = jsonResponse({ success: true }, 200, 'https://example.com');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
  });

  it('omits CORS headers when no origin', () => {
    const response = jsonResponse({ error: 'test' }, 405);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

// --- Main Handler Integration Tests ---
describe('Worker Fetch Handler', () => {
  let worker: { fetch: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> };
  let mockEnv: Env;
  const mockConfig: ClientConfig = {
    destinationEmail: 'owner@apexroofing.ca',
    r2Prefix: 'apex',
    turnstileSecretKey: 'test-secret',
    businessName: 'Apex Roofing',
  };

  beforeEach(async () => {
    const mod = await import('../src/index');
    worker = mod.default;
    mockEnv = {
      CLIENT_CONFIG: {
        get: vi.fn(async (key: string) => {
          if (key === 'https://apexroofing.ca') return mockConfig;
          return null;
        }),
      } as unknown as KVNamespace,
      UPLOADS: {
        put: vi.fn(async () => ({})),
        head: vi.fn(async () => ({ key: 'test' })),
      } as unknown as R2Bucket,
      RESEND_API_KEY: 'test-resend-key',
    };
  });

  const mockCtx: ExecutionContext = {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;

  it('returns 405 for GET requests', async () => {
    const request = new Request('https://worker.example.com/submit', {
      method: 'GET',
    });
    const response = await worker.fetch(request, mockEnv, mockCtx);
    expect(response.status).toBe(405);
    const body = await response.json() as Record<string, string>;
    expect(body.error).toBe('Method not allowed');
  });

  it('returns 405 for PUT requests', async () => {
    const request = new Request('https://worker.example.com/submit', {
      method: 'PUT',
    });
    const response = await worker.fetch(request, mockEnv, mockCtx);
    expect(response.status).toBe(405);
  });

  it('returns 403 for unknown origin', async () => {
    const request = new Request('https://worker.example.com/submit', {
      method: 'POST',
      headers: { Origin: 'https://unknown-site.com', 'Content-Type': 'multipart/form-data' },
    });
    const response = await worker.fetch(request, mockEnv, mockCtx);
    expect(response.status).toBe(403);
    const body = await response.json() as Record<string, string>;
    expect(body.error).toBe('Unknown origin');
  });

  it('returns 403 when Origin header is missing', async () => {
    const request = new Request('https://worker.example.com/submit', {
      method: 'POST',
    });
    const response = await worker.fetch(request, mockEnv, mockCtx);
    expect(response.status).toBe(403);
    const body = await response.json() as Record<string, string>;
    expect(body.error).toBe('Unknown origin');
  });

  it('handles OPTIONS preflight with CORS headers', async () => {
    const request = new Request('https://worker.example.com/submit', {
      method: 'OPTIONS',
      headers: { Origin: 'https://apexroofing.ca' },
    });
    const response = await worker.fetch(request, mockEnv, mockCtx);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://apexroofing.ca');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
  });
});
