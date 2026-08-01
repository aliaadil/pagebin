import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOINDEX, applyNoIndex } from './noindex.ts';

test('NOINDEX lists the directives we want bots to honor', () => {
  // Defense-in-depth — exact list matters because crawlers diff on commas.
  assert.equal(NOINDEX, 'noindex, nofollow, noarchive, noimageindex');
});

test('applyNoIndex sets X-Robots-Tag', () => {
  const h = new Headers();
  applyNoIndex(h);
  assert.equal(h.get('X-Robots-Tag'), NOINDEX);
});

test('applyNoIndex is idempotent', () => {
  const h = new Headers();
  applyNoIndex(h);
  applyNoIndex(h);
  assert.equal(h.get('X-Robots-Tag'), NOINDEX);
});

test('applyNoIndex does not overwrite unrelated headers', () => {
  const h = new Headers({ 'Content-Type': 'text/html' });
  applyNoIndex(h);
  assert.equal(h.get('Content-Type'), 'text/html');
  assert.equal(h.get('X-Robots-Tag'), NOINDEX);
});