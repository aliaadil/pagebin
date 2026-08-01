import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password.ts';

test('hashPassword produces a self-describing string', () => {
  const h = hashPassword('hunter2');
  assert.match(h, /^scrypt\$\d+\$\d+\$\d+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
});

test('hashPassword uses a fresh salt each call', () => {
  const a = hashPassword('hunter2');
  const b = hashPassword('hunter2');
  assert.notEqual(a, b, 'same password should produce different hashes');
});

test('verifyPassword accepts the right password', () => {
  const h = hashPassword('correct horse battery staple');
  assert.equal(verifyPassword(h, 'correct horse battery staple'), true);
});

test('verifyPassword rejects the wrong password', () => {
  const h = hashPassword('correct horse battery staple');
  assert.equal(verifyPassword(h, 'wrong'), false);
  assert.equal(verifyPassword(h, ''), false);
  assert.equal(verifyPassword(h, 'CORRECT HORSE BATTERY STAPLE'), false);
});

test('verifyPassword returns false on malformed stored values', () => {
  assert.equal(verifyPassword('not-a-hash', 'x'), false);
  assert.equal(verifyPassword('scrypt$bad$1$1:!!:!!', 'x'), false);
  assert.equal(verifyPassword('scrypt$16384$8$1:short', 'x'), false);
});

test('verifyPassword never throws on garbage input', () => {
  // Should return false, not throw — important for the hot path.
  for (const bad of ['', ':', ':::', 'scrypt$abc$def$ghi:zz:zz']) {
    assert.equal(verifyPassword(bad, 'whatever'), false);
  }
});