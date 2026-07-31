/**
 * Tiny CSP applied when serving uploaded HTML. Inline scripts and styles are
 * allowed (most pasted HTML needs them); external scripts and forms are
 * blocked so a malicious paste can't exfiltrate data from the pagebin origin.
 *
 * This is intentionally a *baseline* sandbox. Future phases will let the
 * publisher opt in to a stricter mode (no scripts at all, or same-origin only).
 */
export const PASTE_CSP = [
  "default-src 'none'",
  // Inline scripts/styles: most pasted pages need them
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  // Images from anywhere — pasted pages often inline base64 or use data: URLs
  "img-src * data: blob:",
  // No forms, no fetch to other origins, no framing
  "form-action 'none'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
].join('; ');
