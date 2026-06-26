/**
 * Client-side form submission handler.
 * Coordinates validation, image compression, and POSTing to the CF Worker.
 *
 * No Astro-specific imports — runs client-side only.
 * No secrets — only uses the public Worker endpoint URL.
 *
 * Validates: Requirements 13.5, 13.6, 13.7, 14.4, 14.5, 14.6, 14.7, 10.6
 */
import { compressImages } from './image-compressor';

export interface FormConfig {
  workerEndpoint: string;
  turnstileSiteKey: string | null;
  honeypotFieldName: string;
  maxFileSize: number;
  maxFiles: number;
  acceptedTypes: string[];
  consentText: string;
}

export interface SubmitResult {
  success: boolean;
  message: string;
}

/**
 * Submit a form to the Cloudflare Worker endpoint.
 *
 * 1. Read all form fields into FormData
 * 2. Check honeypot field — silently reject if filled
 * 3. Get Turnstile response token (if present)
 * 4. Read file inputs, compress images via compressImages()
 * 5. Build multipart/form-data payload with text fields, compressed images,
 *    consent_timestamp, consent_text, and cf-turnstile-response
 * 6. POST to config.workerEndpoint
 * 7. Return structured result based on response status
 */
export async function submitForm(
  form: HTMLFormElement,
  config: FormConfig
): Promise<SubmitResult> {
  // Step 1: Read form fields
  const formData = new FormData(form);

  // Step 2: Honeypot check — if non-empty, silently reject
  const honeypotValue = formData.get(config.honeypotFieldName);
  if (honeypotValue && String(honeypotValue).trim() !== '') {
    return {
      success: false,
      message: 'Submission unsuccessful. Please try again.',
    };
  }

  // Step 3: Get Turnstile response token
  const turnstileInput = form.querySelector<HTMLInputElement>(
    'input[name="cf-turnstile-response"]'
  );
  const turnstileToken = turnstileInput?.value ?? '';

  // Step 4: Compress file inputs (if file upload is supported)
  const payload = new FormData();

  // Copy all text fields (excluding file inputs and honeypot)
  for (const [key, value] of formData.entries()) {
    if (key === config.honeypotFieldName) continue;
    if (value instanceof File) continue;
    payload.append(key, value);
  }

  // Process file inputs if supported
  if (config.maxFiles > 0) {
    const fileInputs = form.querySelectorAll<HTMLInputElement>('input[type="file"]');

    for (const fileInput of fileInputs) {
      if (fileInput.files && fileInput.files.length > 0) {
        try {
          const compressed = await compressImages(fileInput.files, {
            maxFileSize: config.maxFileSize,
          });
          for (const compressedFile of compressed) {
            payload.append('files', compressedFile.blob, compressedFile.name);
          }
        } catch (error) {
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : 'Submission unsuccessful. Please try again.',
          };
        }
      }
    }
  }

  // Step 5: Append consent data and Turnstile token
  payload.append('consent_timestamp', new Date().toISOString());
  payload.append('consent_text', config.consentText);

  if (turnstileToken) {
    payload.append('cf-turnstile-response', turnstileToken);
  }

  // Step 6: POST to the Worker endpoint
  try {
    const response = await fetch(config.workerEndpoint, {
      method: 'POST',
      body: payload,
    });

    // Step 7: Handle response
    if (response.ok) {
      return {
        success: true,
        message: "Your request has been received. We'll be in touch shortly.",
      };
    }

    return {
      success: false,
      message: 'Submission unsuccessful. Please try again.',
    };
  } catch {
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
}

/**
 * Initialize form handling on a page.
 *
 * Attaches a submit event listener to the form matching the selector,
 * calls submitForm, and manages UI state:
 * - Disables submit button during submission
 * - Shows success/error message
 * - Preserves data on failure
 * - Clears form on success
 */
export function initFormHandler(formSelector: string, config: FormConfig): void {
  const form = document.querySelector<HTMLFormElement>(formSelector);
  if (!form) return;

  form.addEventListener('submit', async (event: Event) => {
    event.preventDefault();

    const submitButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]'
    );

    // Disable button during submission
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
    }

    // Remove any previous status message
    const existingMessage = form.querySelector('[data-form-message]');
    if (existingMessage) {
      existingMessage.remove();
    }

    const result = await submitForm(form, config);

    // Create status message element
    const messageEl = document.createElement('div');
    messageEl.setAttribute('data-form-message', '');
    messageEl.setAttribute('role', 'alert');
    messageEl.textContent = result.message;

    if (result.success) {
      messageEl.setAttribute('data-status', 'success');
      form.reset();
    } else {
      messageEl.setAttribute('data-status', 'error');
      // Preserve form data on failure — no reset
    }

    form.appendChild(messageEl);

    // Re-enable button
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
    }
  });
}
