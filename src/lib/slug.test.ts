import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSlug, isValidSlug } from './slug.ts';

test('newSlug matches expected format', () => {
  for (let i = 0; i < 50; i++) {
    const s = newSlug();
    assert.match(s, /^[a-z]+-[a-z]+-\d{2}$/, `bad slug: ${s}`);
  }
});

test('isValidSlug accepts well-formed slugs', () => {
  assert.equal(isValidSlug('quick-apple-42'), true);
  assert.equal(isValidSlug('zesty-fjord-07'), true);
});

test('isValidSlug rejects malformed', () => {
  assert.equal(isValidSlug(''), false);
  assert.equal(isValidSlug('quick-apple'), false);
  assert.equal(isValidSlug('Quick-Apple-42'), false);
  assert.equal(isValidSlug('quick-apple-123'), false);
  assert.equal(isValidSlug('../etc/passwd'), false);
  assert.equal(isValidSlug('foo/bar'), false);
});
