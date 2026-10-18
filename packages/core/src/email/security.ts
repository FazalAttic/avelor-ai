/**
 * Email security utilities: HTML sanitization, header injection prevention,
 * and email recipient validation.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes unsafe characters in dynamic text interpolated into HTML emails
 * to prevent HTML injection and email client XSS exploits.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe).replace(/[&<>"']/g, (char) => HTML_ENTITY_MAP[char] ?? char);
}

/**
 * Strips carriage returns and newlines to prevent SMTP/HTTP header injection (CRLF attacks).
 */
export function sanitizeHeader(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/[\r\n]+/g, " ")
    .trim();
}

/**
 * Validates that an email string conforms to basic format rules and contains
 * no illegal newline characters.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  if (/[\r\n]/.test(trimmed)) return false;

  // Standard practical email regex (RFC 5322 compatible subset)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Normalizes and validates single or multiple email recipient strings.
 */
export function normalizeRecipients(to: string | readonly string[]): string[] {
  const list = Array.isArray(to) ? to : [to];
  const validated: string[] = [];

  for (const item of list) {
    const trimmed = String(item).trim();
    if (!isValidEmail(trimmed)) {
      throw new Error(`Invalid email address: '${sanitizeHeader(trimmed)}'`);
    }
    validated.push(trimmed);
  }

  if (validated.length === 0) {
    throw new Error("At least one valid recipient email is required");
  }

  return validated;
}
