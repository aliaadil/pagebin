import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newId, isValidId, mintUniqueId } from './slug.ts';

test('newId always matches the expected 16-char base64url shape', () => {
  for (let i = 0; i < 100; i++) {
    const id = newId();
    assert.match(id, /^[A-Za-z0-9_-]{16}$/, `bad id: ${id}`);
  }
});

test('newId produces unique values across many calls', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 1000; i++) seen.add(newId());
  assert.equal(seen.size, 1000);
});

test('newId never contains +, /, or = padding', () => {
  for (let i = 0; i < 50; i++) {
    const id = newId();
    assert.ok(!id.includes('+'), `unexpected + in ${id}`);
    assert.ok(!id.includes('/'), `unexpected / in ${id}`);
    assert.ok(!id.includes('='), `unexpected = in ${id}`);
  }
});

test('isValidId accepts well-formed ids', () => {
  assert.equal(isValidId(newId()), true);
  assert.equal(isValidId('aB3kZ_9mPqR7cD2x'), true);
  assert.equal(isValidId('0123456789abcdef'), true);
});

test('isValidId rejects malformed and traversal attempts', () => {
  assert.equal(isValidId(''), false);
  assert.equal(isValidId('short'), false);
  assert.equal(isValidId('aB3kZ+9mPqR7cD2x'), false); // contains +
  assert.equal(isValidId('aB3kZ/9mPqR7cD2x'), false); // contains /
  assert.equal(isValidId('aB3kZ9mPqR7cD2x==='), false); // padded
  assert.equal(isValidId('../etc/passwd'), false);
  assert.equal(isValidId('foo/bar'), false);
  assert.equal(isValidId('quick-apple-42'), false); // legacy word-noun shape
});

test('mintUniqueId returns the first free id', async () => {
  const taken = new Set<string>();
  const id = await mintUniqueId(async (c) => taken.has(c));
  assert.ok(isValidId(id));
  assert.ok(!taken.has(id));
});

test('mintUniqueId retries when ids collide', async () => {
  const queue = ['aaa', 'bbb'];
  let i = 0;
  const id = await mintUniqueId((c) => {
    if (i < queue.length && queue[i] === c) {
      i++;
      return true;
    }
    return false;
  });
  assert.ok(isValidId(id));
});

test('mintUniqueId throws after maxAttempts', async () => {
  // Reject everything: forces exhaustion.
  await assert.rejects(
    () => mintUniqueId(() => true, 3),
    /Could not allocate a unique pagebin id/
  );
});