/**
 * Honeypot check for spam detection.
 * If the honeypot field is filled, the submission is from a bot.
 * We silently return 200 to avoid tipping off the bot.
 */

import { ClientConfig } from './types';

const DEFAULT_HONEYPOT_FIELD = 'website_url';

/**
 * Checks the honeypot field in form data.
 *
 * @param fields - Parsed form fields
 * @param clientConfig - Client configuration (may specify custom honeypot field name)
 * @returns true if the submission is from a bot (honeypot filled), false otherwise
 */
export function isHoneypotTriggered(
  fields: Record<string, string>,
  clientConfig: ClientConfig
): boolean {
  const honeypotFieldName = clientConfig.honeypotField || DEFAULT_HONEYPOT_FIELD;
  const honeypotValue = fields[honeypotFieldName];

  // If the field has any non-empty value, it's a bot
  return !!honeypotValue && honeypotValue.trim().length > 0;
}
