import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitForm, initFormHandler } from '@scripts/form-handler';
import type { FormConfig } from '@scripts/form-handler';

// Mock the image compressor module
vi.mock('@scripts/image-compressor', () => ({
  compressImages: vi.fn(),
}));

import { compressImages } from '@scripts/image-compressor';

const mockCompressImages = vi.mocked(compressImages);

function createConfig(overrides?: Partial<FormConfig>): FormConfig {
  return {
    workerEndpoint: 'https://forms.example.workers.dev',
    turnstileSiteKey: '0x4AAAAAEXAMPLE',
    honeypotFieldName: 'website_url',
    maxFileSize: 2 * 1024 * 1024,
    maxFiles: 5,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    consentText: 'I agree to the privacy policy.',
    ...overrides,
  };
}

function createFormElement(fields: Record<string, string> = {}): HTMLFormElement {
  const form = document.createElement('form');

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Submit';
  form.appendChild(submitBtn);

  document.body.appendChild(form);
  return form;
}

describe('form-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    // Default: fetch succeeds with 200
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200 })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('submitForm', () => {
    it('returns success on 200 response', async () => {
      const form = createFormElement({ name: 'John', email: 'john@test.com' });
      const config = createConfig();

      const result = await submitForm(form, config);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        "Your request has been received. We'll be in touch shortly."
      );
    });

    it('rejects silently when honeypot field is filled', async () => {
      const form = createFormElement({
        name: 'Bot',
        website_url: 'http://spam.com',
      });
      const config = createConfig();

      const result = await submitForm(form, config);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Submission unsuccessful. Please try again.');
      // fetch should NOT have been called
      expect(fetch).not.toHaveBeenCalled();
    });

    it('allows submission when honeypot field is empty', async () => {
      const form = createFormElement({
        name: 'Human',
        website_url: '',
      });
      const config = createConfig();

      const result = await submitForm(form, config);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalled();
    });

    it('includes Turnstile token in payload when present', async () => {
      const form = createFormElement({ name: 'Test' });
      const turnstileInput = document.createElement('input');
      turnstileInput.name = 'cf-turnstile-response';
      turnstileInput.value = 'TURNSTILE_TOKEN_123';
      form.appendChild(turnstileInput);

      const config = createConfig();
      await submitForm(form, config);

      expect(fetch).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = callArgs[1]?.body as FormData;
      expect(body.get('cf-turnstile-response')).toBe('TURNSTILE_TOKEN_123');
    });

    it('includes consent_timestamp and consent_text in payload', async () => {
      const form = createFormElement({ name: 'Test' });
      const config = createConfig({ consentText: 'I agree to be contacted.' });

      await submitForm(form, config);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = callArgs[1]?.body as FormData;
      expect(body.get('consent_text')).toBe('I agree to be contacted.');
      expect(body.get('consent_timestamp')).toBeTruthy();
      // consent_timestamp should be an ISO string
      const ts = body.get('consent_timestamp') as string;
      expect(() => new Date(ts)).not.toThrow();
      expect(new Date(ts).toISOString()).toBe(ts);
    });

    it('compresses files before upload', async () => {
      const form = createFormElement({ name: 'Test' });
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = 'photos';

      // Create a mock FileList
      const mockFile = new File(['image-data'], 'roof.jpg', {
        type: 'image/jpeg',
      });
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      // Simulate FileList length
      Object.defineProperty(fileInput.files, 'length', { value: 1 });
      form.appendChild(fileInput);

      const compressedBlob = new Blob(['compressed'], { type: 'image/jpeg' });
      mockCompressImages.mockResolvedValueOnce([
        {
          name: 'roof.jpg',
          blob: compressedBlob,
          originalSize: 5000000,
          compressedSize: 500000,
        },
      ]);

      const config = createConfig();
      await submitForm(form, config);

      expect(mockCompressImages).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = callArgs[1]?.body as FormData;
      expect(body.getAll('files')).toHaveLength(1);
    });

    it('skips file processing when maxFiles is 0', async () => {
      const form = createFormElement({ name: 'Test' });
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = 'photos';
      form.appendChild(fileInput);

      const config = createConfig({ maxFiles: 0 });
      await submitForm(form, config);

      expect(mockCompressImages).not.toHaveBeenCalled();
    });

    it('returns error message on compression failure', async () => {
      const form = createFormElement({ name: 'Test' });
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = 'photos';

      const mockFile = new File(['img'], 'huge.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      Object.defineProperty(fileInput.files, 'length', { value: 1 });
      form.appendChild(fileInput);

      mockCompressImages.mockRejectedValueOnce(
        new Error('Image could not be compressed below 2MB: huge.jpg')
      );

      const config = createConfig();
      const result = await submitForm(form, config);

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Image could not be compressed below 2MB: huge.jpg'
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    it('returns error message on 4xx/5xx response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 422 })
      );

      const form = createFormElement({ name: 'Test' });
      const config = createConfig();

      const result = await submitForm(form, config);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Submission unsuccessful. Please try again.');
    });

    it('returns network error message on fetch failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      );

      const form = createFormElement({ name: 'Test' });
      const config = createConfig();

      const result = await submitForm(form, config);

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it('POSTs to the configured worker endpoint', async () => {
      const form = createFormElement({ name: 'Test' });
      const config = createConfig({
        workerEndpoint: 'https://custom.worker.dev/submit',
      });

      await submitForm(form, config);

      expect(fetch).toHaveBeenCalledWith(
        'https://custom.worker.dev/submit',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('excludes honeypot field from payload sent to server', async () => {
      const form = createFormElement({
        name: 'John',
        website_url: '',
      });
      const config = createConfig();

      await submitForm(form, config);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = callArgs[1]?.body as FormData;
      expect(body.has('website_url')).toBe(false);
      expect(body.get('name')).toBe('John');
    });

    it('handles form with no file inputs gracefully', async () => {
      const form = createFormElement({
        name: 'Jane',
        email: 'jane@test.com',
        message: 'Need roof repair',
      });
      const config = createConfig();

      const result = await submitForm(form, config);

      expect(result.success).toBe(true);
      expect(mockCompressImages).not.toHaveBeenCalled();
    });
  });

  describe('initFormHandler', () => {
    it('attaches submit listener to matched form', async () => {
      const form = createFormElement({ name: 'Test' });
      form.id = 'contact-form';

      const config = createConfig();
      initFormHandler('#contact-form', config);

      // Trigger submit
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      // Wait for async handler
      await vi.waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('does nothing if form not found', () => {
      const config = createConfig();
      // Should not throw
      expect(() => initFormHandler('#nonexistent', config)).not.toThrow();
    });

    it('disables submit button during submission', async () => {
      const form = createFormElement({ name: 'Test' });
      form.id = 'test-form';
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

      // Delay the fetch response so we can check intermediate state
      let resolveFetch: (value: unknown) => void;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(
          () => new Promise((resolve) => { resolveFetch = resolve; })
        )
      );

      const config = createConfig();
      initFormHandler('#test-form', config);

      form.dispatchEvent(new Event('submit', { bubbles: true }));

      // Button should be disabled during submission
      await vi.waitFor(() => {
        expect(submitBtn.disabled).toBe(true);
        expect(submitBtn.getAttribute('aria-busy')).toBe('true');
      });

      // Resolve fetch
      resolveFetch!({ ok: true, status: 200 });

      // Button should be re-enabled after completion
      await vi.waitFor(() => {
        expect(submitBtn.disabled).toBe(false);
        expect(submitBtn.getAttribute('aria-busy')).toBeNull();
      });
    });

    it('shows success message and clears form on success', async () => {
      const form = createFormElement({ name: 'Test' });
      form.id = 'test-form';

      const config = createConfig();
      initFormHandler('#test-form', config);

      form.dispatchEvent(new Event('submit', { bubbles: true }));

      await vi.waitFor(() => {
        const msg = form.querySelector('[data-form-message]');
        expect(msg).not.toBeNull();
        expect(msg?.textContent).toBe(
          "Your request has been received. We'll be in touch shortly."
        );
        expect(msg?.getAttribute('data-status')).toBe('success');
        expect(msg?.getAttribute('role')).toBe('alert');
      });
    });

    it('shows error message and preserves form data on failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 500 })
      );

      const form = createFormElement({ name: 'KeepMe' });
      form.id = 'test-form';

      const config = createConfig();
      initFormHandler('#test-form', config);

      form.dispatchEvent(new Event('submit', { bubbles: true }));

      await vi.waitFor(() => {
        const msg = form.querySelector('[data-form-message]');
        expect(msg).not.toBeNull();
        expect(msg?.textContent).toBe(
          'Submission unsuccessful. Please try again.'
        );
        expect(msg?.getAttribute('data-status')).toBe('error');
      });

      // Form data should be preserved (not reset)
      const nameInput = form.querySelector('input[name="name"]') as HTMLInputElement;
      expect(nameInput.value).toBe('KeepMe');
    });

    it('removes previous message before new submission', async () => {
      const form = createFormElement({ name: 'Test' });
      form.id = 'test-form';

      const config = createConfig();
      initFormHandler('#test-form', config);

      // First submission
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      await vi.waitFor(() => {
        expect(form.querySelectorAll('[data-form-message]')).toHaveLength(1);
      });

      // Second submission
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      await vi.waitFor(() => {
        // Should still only have one message (old one removed)
        expect(form.querySelectorAll('[data-form-message]')).toHaveLength(1);
      });
    });
  });
});
