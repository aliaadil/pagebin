/**
 * Allowed expiry values. Stored as seconds-from-creation in the DB.
 * `never` => expires_at NULL.
 */
export type Expiry = '1h' | '24h' | '1w' | 'never';

const SECONDS: Record<Exclude<Expiry, 'never'>, number> = {
  '1h': 60 * 60,
  '24h': 24 * 60 * 60,
  '1w': 7 * 24 * 60 * 60,
};

export function isExpiry(v: unknown): v is Expiry {
  return v === '1h' || v === '24h' || v === '1w' || v === 'never';
}

export function expiryToUnix(expiry: Expiry, nowSec: number): number | null {
  if (expiry === 'never') return null;
  return nowSec + SECONDS[expiry];
}
