/**
 * Password hashing + verification for protected pastes.
 *
 * We use scrypt (Node's built-in password-based KDF) with a per-record
 * random salt. scrypt is memory-hard, slow enough to deter brute force
 * on the 512 KB uploads we already cap at, and ships with Node — no new
 * native deps.
 *
 * Stored shape on disk: <scrypt-params>:<salt-b64>:<hash-b64>.
 * The encoded params let us tune the cost later without breaking old
 * hashes (verifyPassword() reads them back out).
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 64; // 64-byte derived key, matches the SHA-256 / scrypt norm.
const SALT_LEN = 16;
const COST_N = 16384; // CPU/memory cost — Node's default.
const COST_R = 8; // block size.
const COST_P = 1; // parallelization.

/** Internal: encode scrypt params as a short string for storage. */
function paramsTag(): string {
  return `scrypt$${COST_N}$${COST_R}$${COST_P}`;
}

/** Internal: parse a params tag back into scrypt options. */
function parseTag(tag: string): { N: number; r: number; p: number } | null {
  const m = /^scrypt\$(\d+)\$(\d+)\$(\d+)$/.exec(tag);
  if (!m) return null;
  const N = Number(m[1]);
  const r = Number(m[2]);
  const p = Number(m[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return null;
  }
  return { N, r, p };
}

/**
 * Hash a plaintext password. Returns a self-describing string suitable
 * for storage in the pastes.password_hash column.
 *
 * Never returns null — if the input is empty, we still hash it so the
 * caller's "is this protected?" check stays a single column-not-null test.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(password, salt, KEY_LEN, {
    N: COST_N,
    r: COST_R,
    p: COST_P,
  });
  return [paramsTag(), salt.toString('base64'), hash.toString('base64')].join(
    ':'
  );
}

/**
 * Constant-time compare a plaintext password to a stored hash string.
 * Returns false for any parse failure or mismatch — never throws, so
 * callers can use this in a hot path without try/catch.
 */
export function verifyPassword(stored: string, password: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [tag, saltB64, hashB64] = parts;
  const params = parseTag(tag);
  if (!params) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, 'base64');
    expected = Buffer.from(hashB64, 'base64');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LEN) return false;
  const got = scryptSync(password, salt, expected.length, params);
  return got.length === expected.length && timingSafeEqual(got, expected);
}