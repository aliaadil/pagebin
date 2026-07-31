import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expiryToUnix, isExpiry } from './expiry.ts';

test('isExpiry recognizes valid values', () => {
  for (const v of ['1h', '24h', '1w', 'never']) {
    assert.equal(isExpiry(v), true, `should accept ${v}`);
  }
  for (const v of ['1d', '2h', '', 'NEVER', null, undefined, 42]) {
    assert.equal(isExpiry(v), false, `should reject ${JSON.stringify(v)}`);
  }
});

test('expiryToUnix returns null for never', () => {
  assert.equal(expiryToUnix('never', 1000), null);
});

test('expiryToUnix adds correct seconds', () => {
  assert.equal(expiryToUnix('1h', 1000), 1000 + 3600);
  assert.equal(expiryToUnix('24h', 1000), 1000 + 86400);
  assert.equal(expiryToUnix('1w', 1000), 1000 + 7 * 86400);
});
