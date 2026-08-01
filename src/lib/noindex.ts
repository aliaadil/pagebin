/**
 * Single source of truth for the noindex/robots headers we stamp on every
 * paste-serving and API response. Pages on this site are private-by-link —
 * the share URL is the auth — so we ask well-behaved crawlers not to
 * follow or index anything.
 *
 * This is defense-in-depth, not access control. Don't rely on it.
 */
export const NOINDEX = 'noindex, nofollow, noarchive, noimageindex';

/** Apply NOINDEX and a couple of common companions to a Headers bag. */
export function applyNoIndex(headers: Headers): void {
  headers.set('X-Robots-Tag', NOINDEX);
}