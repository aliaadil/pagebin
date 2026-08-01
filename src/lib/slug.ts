/**
 * Hash-like, URL-safe identifier generator.
 *
 * Each new paste gets a 12-byte (96-bit) value drawn from a CSPRNG and
 * encoded with the URL-safe base64 alphabet (no padding). Output looks
 * like `aB3kZ_9mPqR7cD2x` — opaque to a casual guesser, but still safe
 * to drop into a path component.
 *
 * Collision handling lives outside this module: callers should pass an
 * `exists` predicate that returns true when an id is already taken, and
 * retry up to N times. A 96-bit id space is wide enough that 8 retries
 * give effective ~70-bit collision resistance up to billions of pastes.
 */
import { randomBytes } from 'node:crypto';

const ID_BYTES = 12; // 12 bytes -> 16 base64url chars -> 96 bits of entropy.

/**
 * Generate a fresh id. Returned value is URL-safe (A–Z, a–z, 0–9, '-', '_')
 * and contains neither '+' nor '/' nor padding.
 */
export function newId(): string {
  return randomBytes(ID_BYTES)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

const ID_RE = /^[A-Za-z0-9_-]{16}$/;

/**
 * Validate a candidate id. Rejects empty strings, anything with the wrong
 * shape, and obviously bogus input (path traversal etc.). Matches the
 * charset of newId() exactly so a freshly minted id always validates.
 */
export function isValidId(id: string): boolean {
  return ID_RE.test(id);
}

/**
 * Try to mint a fresh id that is not already taken.
 *
 * @param exists async predicate — returns true if the id is in use.
 * @param maxAttempts hard cap on attempts before we throw.
 * @throws Error if we can't find a free id in `maxAttempts` tries. With a
 *         96-bit id space this should never happen in practice.
 */
export async function mintUniqueId(
  exists: (id: string) => Promise<boolean> | boolean,
  maxAttempts = 8
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = newId();
    // eslint-disable-next-line no-await-in-loop
    if (!(await exists(id))) return id;
  }
  throw new Error(
    `Could not allocate a unique pagebin id in ${maxAttempts} attempts`
  );
}