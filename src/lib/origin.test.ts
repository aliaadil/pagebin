import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveOrigin, resolvePublicOrigin } from './origin.ts';

const baseEnv = (overrides: Record<string, string | null> = {}) => ({
  PAGEBIN_PUBLIC_URL: null,
  NODE_ENV: null,
  ...overrides,
});

test('env var wins over everything', () => {
  const got = resolveOrigin({
    requestUrl: 'http://localhost:3000/api/paste',
    headers: {
      host: 'localhost:3000',
      'x-forwarded-host': 'pagebin.example.com',
      'x-forwarded-proto': 'https',
    },
    env: baseEnv({ PAGEBIN_PUBLIC_URL: 'https://pagebin.example.com/' }),
  });
  assert.equal(got.origin, 'https://pagebin.example.com');
  assert.equal(got.source, 'env');
});

test('env var with trailing slash is normalized', () => {
  const got = resolveOrigin({
    requestUrl: 'http://localhost:3000/api/paste',
    headers: {},
    env: baseEnv({ PAGEBIN_PUBLIC_URL: 'https://pagebin.example.com///' }),
  });
  assert.equal(got.origin, 'https://pagebin.example.com');
});

test('forwarded headers used when env var is missing', () => {
  const got = resolveOrigin({
    requestUrl: 'http://localhost:3000/api/paste',
    headers: {
      host: 'localhost:3000',
      'x-forwarded-host': 'pagebin.example.com',
      'x-forwarded-proto': 'https',
    },
    env: baseEnv(),
  });
  assert.equal(got.origin, 'https://pagebin.example.com');
  assert.equal(got.source, 'forwarded');
});

test('forwarded host without proto defaults to https', () => {
  const got = resolveOrigin({
    requestUrl: 'http://localhost:3000/api/paste',
    headers: {
      'x-forwarded-host': 'pagebin.example.com',
    },
    env: baseEnv(),
  });
  assert.equal(got.origin, 'https://pagebin.example.com');
  assert.equal(got.source, 'forwarded');
});

test('host header used when no env or forwarding', () => {
  const got = resolveOrigin({
    requestUrl: 'http://example.com/api/paste',
    headers: { host: 'example.com' },
    env: baseEnv(),
  });
  assert.equal(got.origin, 'http://example.com');
  assert.equal(got.source, 'host');
});

test('host header with x-forwarded-proto picks up scheme', () => {
  const got = resolveOrigin({
    requestUrl: 'http://example.com/api/paste',
    headers: {
      host: 'example.com',
      'x-forwarded-proto': 'https',
    },
    env: baseEnv(),
  });
  assert.equal(got.origin, 'https://example.com');
  assert.equal(got.source, 'host');
});

test('falls back to request URL origin in dev', () => {
  const got = resolveOrigin({
    requestUrl: 'http://localhost:3000/api/paste',
    headers: {},
    env: baseEnv(),
  });
  assert.equal(got.origin, 'http://localhost:3000');
  assert.equal(got.source, 'request');
});

test('final fallback when request URL is unparseable', () => {
  const got = resolveOrigin({
    requestUrl: 'not a url',
    headers: {},
    env: baseEnv(),
  });
  assert.equal(got.origin, 'http://localhost:3000');
  assert.equal(got.source, 'fallback');
});

test('malformed env var falls through to forwarded/host', () => {
  const got = resolveOrigin({
    requestUrl: 'http://localhost:3000/api/paste',
    headers: { host: 'real.example.com' },
    env: baseEnv({ PAGEBIN_PUBLIC_URL: 'not a url' }),
  });
  assert.equal(got.origin, 'http://real.example.com');
  assert.equal(got.source, 'host');
});

test('resolvePublicOrigin logs a warning in production when no env/forwarded', () => {
  const env = process.env as Record<string, string | undefined>;
  const saved = { NODE_ENV: env.NODE_ENV, PAGEBIN_PUBLIC_URL: env.PAGEBIN_PUBLIC_URL };
  env.NODE_ENV = 'production';
  delete env.PAGEBIN_PUBLIC_URL;

  const captured: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    captured.push(args.map(String).join(' '));
  };
  try {
    const req = {
      url: 'http://localhost:3000/api/paste',
      headers: {
        get(name: string) {
          const lower = name.toLowerCase();
          if (lower === 'host') return 'localhost:3000';
          if (lower === 'x-forwarded-host') return null;
          if (lower === 'x-forwarded-proto') return null;
          return null;
        },
      },
    };
    const origin = resolvePublicOrigin(req);
    assert.equal(origin, 'http://localhost:3000');
    assert.ok(
      captured.some((m) => m.includes('PAGEBIN_PUBLIC_URL')),
      `expected warning about PAGEBIN_PUBLIC_URL, got: ${JSON.stringify(captured)}`
    );
  } finally {
    console.warn = originalWarn;
    if (saved.NODE_ENV === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = saved.NODE_ENV;
    if (saved.PAGEBIN_PUBLIC_URL === undefined) delete env.PAGEBIN_PUBLIC_URL;
    else env.PAGEBIN_PUBLIC_URL = saved.PAGEBIN_PUBLIC_URL;
  }
});

test('resolvePublicOrigin does not warn when forwarded host is present', () => {
  const env = process.env as Record<string, string | undefined>;
  const saved = { NODE_ENV: env.NODE_ENV, PAGEBIN_PUBLIC_URL: env.PAGEBIN_PUBLIC_URL };
  env.NODE_ENV = 'production';
  delete env.PAGEBIN_PUBLIC_URL;

  const captured: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    captured.push(args.map(String).join(' '));
  };
  try {
    const req = {
      url: 'http://localhost:3000/api/paste',
      headers: {
        get(name: string) {
          const lower = name.toLowerCase();
          if (lower === 'host') return 'localhost:3000';
          if (lower === 'x-forwarded-host') return 'pagebin.example.com';
          if (lower === 'x-forwarded-proto') return 'https';
          return null;
        },
      },
    };
    const origin = resolvePublicOrigin(req);
    assert.equal(origin, 'https://pagebin.example.com');
    assert.equal(
      captured.length,
      0,
      `should not warn when forwarded headers present, got: ${JSON.stringify(captured)}`
    );
  } finally {
    console.warn = originalWarn;
    if (saved.NODE_ENV === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = saved.NODE_ENV;
    if (saved.PAGEBIN_PUBLIC_URL === undefined) delete env.PAGEBIN_PUBLIC_URL;
    else env.PAGEBIN_PUBLIC_URL = saved.PAGEBIN_PUBLIC_URL;
  }
});