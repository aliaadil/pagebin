import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPasswordPrompt } from './password-prompt.ts';

const ID = 'aB3kZ_9mPqR7cD2x';

test('renderPasswordPrompt emits a complete HTML5 document', () => {
  const out = renderPasswordPrompt({ id: ID });
  assert.match(out, /^<!doctype html>/i);
  assert.match(out, /<html lang="en">/);
  assert.match(out, /<\/html>$/);
});

test('renderPasswordPrompt includes the paste id in the form action', () => {
  const out = renderPasswordPrompt({ id: ID });
  assert.match(out, new RegExp(`action="/p/${ID}/unlock"`));
  assert.match(out, new RegExp(`pagebin / p / ${ID}`));
});

test('renderPasswordPrompt uses POST so the password never goes in a URL', () => {
  const out = renderPasswordPrompt({ id: ID });
  assert.match(out, /method="post"/i);
});

test('renderPasswordPrompt does not include the password in the form', () => {
  const out = renderPasswordPrompt({ id: ID });
  assert.ok(!/value="[^"]*password/i.test(out));
  assert.match(out, /type="password"/);
});

test('renderPasswordPrompt does not surface a banner by default', () => {
  const out = renderPasswordPrompt({ id: ID });
  assert.ok(!/Incorrect password/.test(out));
});

test('renderPasswordPrompt shows a banner after a failed attempt', () => {
  const out = renderPasswordPrompt({ id: ID, failed: true });
  assert.match(out, /Incorrect password\. Try again\./);
  assert.match(out, /role="alert"/);
});

test('renderPasswordPrompt sets noindex metadata', () => {
  const out = renderPasswordPrompt({ id: ID });
  assert.match(out, /name="robots" content="noindex/);
});

test('renderPasswordPrompt HTML-escapes the id', () => {
  // Use a deliberately hostile id to prove escaping works. (The id format
  // check upstream would normally reject this, but rendering must still
  // not let raw HTML through.)
  const evil = `"><script>alert(1)</script>`;
  const out = renderPasswordPrompt({ id: evil });
  assert.ok(!out.includes('<script>alert(1)</script>'));
  assert.ok(out.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});