import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mintUnlockCookie,
  verifyUnlockCookie,
  unlockCookieName,
  setUnlockCookie,
  clearUnlockCookie,
} from './unlock-cookie.ts';

test('mintUnlockCookie produces a value that verifies for the same id', () => {
  const id = 'aB3kZ_9mPqR7cD2x';
  const v = mintUnlockCookie(id);
  assert.equal(verifyUnlockCookie(id, v), true);
});

test('verifyUnlockCookie rejects a tampered id', () => {
  const id = 'aB3kZ_9mPqR7cD2x';
  const v = mintUnlockCookie(id);
  assert.equal(verifyUnlockCookie('aDifferentId12345', v), false);
});

test('verifyUnlockCookie rejects a tampered signature', () => {
  const id = 'aB3kZ_9mPqR7cD2x';
  const v = mintUnlockCookie(id);
  const dot = v.indexOf('.');
  const tampered = `${v.slice(0, dot)}.AAAAAAAAAAAA`;
  assert.equal(verifyUnlockCookie(id, tampered), false);
});

test('verifyUnlockCookie rejects malformed values', () => {
  const id = 'aB3kZ_9mPqR7cD2x';
  assert.equal(verifyUnlockCookie(id, undefined), false);
  assert.equal(verifyUnlockCookie(id, ''), false);
  assert.equal(verifyUnlockCookie(id, 'no-dot-here'), false);
  assert.equal(verifyUnlockCookie(id, 'abc.'), false);
  assert.equal(verifyUnlockCookie(id, '.sigonly'), false);
  assert.equal(verifyUnlockCookie(id, 'notanumber.sig'), false);
});

test('verifyUnlockCookie rejects expired cookies', () => {
  const id = 'aB3kZ_9mPqR7cD2x';
  const v = mintUnlockCookie(id);
  // Synthesize an expired cookie by replacing the timestamp.
  const dot = v.indexOf('.');
  const sig = v.slice(dot + 1);
  const expired = `1.${sig}`; // 1 second after epoch — long expired.
  assert.equal(verifyUnlockCookie(id, expired), false);
});

test('unlockCookieName is namespaced per paste id', () => {
  assert.equal(unlockCookieName('abc'), 'pb_unlock_abc');
});

test('setUnlockCookie includes scope + httponly + samesite', () => {
  const out = setUnlockCookie('aB3kZ_9mPqR7cD2x', '123.abc');
  assert.match(out, /^pb_unlock_aB3kZ_9mPqR7cD2x=123\.abc/);
  assert.match(out, /Path=\/p\/aB3kZ_9mPqR7cD2x/);
  assert.match(out, /HttpOnly/);
  assert.match(out, /SameSite=Lax/);
  assert.match(out, /Max-Age=3600/);
});

test('clearUnlockCookie sets Max-Age=0 and scopes the path', () => {
  const out = clearUnlockCookie('aB3kZ_9mPqR7cD2x');
  assert.match(out, /^pb_unlock_aB3kZ_9mPqR7cD2x=/);
  assert.match(out, /Max-Age=0/);
  assert.match(out, /Path=\/p\/aB3kZ_9mPqR7cD2x/);
});