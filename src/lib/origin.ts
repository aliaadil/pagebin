/**
 * Origin resolution — turn a Next.js request into the public-facing
 * `<scheme>://<host>` we should stamp on every share URL we hand out.
 *
 * In production the container listens on `localhost:3000` behind a reverse
 * proxy (Coolify/Caddy/nginx). `req.url` only ever sees the internal origin,
 * so naively doing `new URL(req.url).origin` returns `http://localhost:3000`
 * and the share links are broken.
 *
 * Resolution priority:
 *   1. `PAGEBIN_PUBLIC_URL` env var (canonical override — recommended)
 *   2. `x-forwarded-host` + `x-forwarded-proto` headers (reverse proxy)
 *   3. `host` request header (direct connection)
 *   4. `new URL(req.url).origin` (last-resort dev fallback)
 *
 * The result is a URL whose `origin` field is what callers should use.
 *
 * On module load, in production we log a one-time warning if neither the env
 * var nor a forwarded host is present — silent localhost URLs in prod are the
 * exact bug this file exists to prevent.
 */

export interface OriginHeaders {
  host?: string | null;
  'x-forwarded-host'?: string | null;
  'x-forwarded-proto'?: string | null;
}

export interface OriginEnv {
  PAGEBIN_PUBLIC_URL?: string | null;
  NODE_ENV?: string | null;
}

export interface ResolveOriginInput {
  /** NextRequest.url — the raw URL the server received. */
  requestUrl: string;
  /** Header bag from the NextRequest (lowercased keys). */
  headers: OriginHeaders;
  /** Process env — PAGEBIN_PUBLIC_URL + NODE_ENV are read here. */
  env?: OriginEnv;
}

const ABS_URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Pure resolution function. No Next.js imports — easy to unit-test.
 *
 * Returns `{ origin, source }` where `source` is one of
 * `'env' | 'forwarded' | 'host' | 'request' | 'fallback'` — handy for tests
 * and for logging when the fallback path is taken in production.
 */
export function resolveOrigin(input: ResolveOriginInput): {
  origin: string;
  source: 'env' | 'forwarded' | 'host' | 'request' | 'fallback';
} {
  // 1. Env var — canonical override.
  const envUrl = input.env?.PAGEBIN_PUBLIC_URL?.trim();
  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, '');
    if (ABS_URL_RE.test(trimmed)) {
      return { origin: trimmed, source: 'env' };
    }
    // Malformed env var — fall through to header-based detection rather than
    // throwing; we'd rather produce a working URL than 500 the upload route.
  }

  // 2. Forwarded headers (Coolify / Caddy / nginx behind a reverse proxy).
  const fwdHost = input.headers['x-forwarded-host']?.trim();
  const fwdProto = input.headers['x-forwarded-proto']?.trim();
  if (fwdHost) {
    const proto =
      fwdProto && /^(https?|wss?)$/i.test(fwdProto)
        ? fwdProto.toLowerCase()
        : 'https'; // x-forwarded-proto is usually 'https' behind TLS-terminating proxies
    return { origin: `${proto}://${fwdHost}`, source: 'forwarded' };
  }

  // 3. Direct host header.
  const host = input.headers.host?.trim();
  if (host) {
    const proto =
      fwdProto && /^(https?|wss?)$/i.test(fwdProto)
        ? fwdProto.toLowerCase()
        : 'http';
    return { origin: `${proto}://${host}`, source: 'host' };
  }

  // 4. Last-resort: derive from request URL (dev fallback).
  try {
    const u = new URL(input.requestUrl);
    return { origin: u.origin, source: 'request' };
  } catch {
    return { origin: 'http://localhost:3000', source: 'fallback' };
  }
}

/** Has the one-time production warning already fired for this process? */
let warned = false;

/**
 * Resolve the public origin for a Next.js request and emit a one-time
 * production warning if neither the env var nor forwarded headers are
 * present. Safe to call on every request.
 */
export function resolvePublicOrigin(req: {
  url: string;
  headers: { get(name: string): string | null };
}): string {
  const env: OriginEnv = {
    PAGEBIN_PUBLIC_URL: process.env.PAGEBIN_PUBLIC_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  const headers: OriginHeaders = {
    host: req.headers.get('host'),
    'x-forwarded-host': req.headers.get('x-forwarded-host'),
    'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
  };

  const { origin, source } = resolveOrigin({
    requestUrl: req.url,
    headers,
    env,
  });

  if (
    !warned &&
    env.NODE_ENV === 'production' &&
    source !== 'env' &&
    source !== 'forwarded'
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      '[pagebin] No PAGEBIN_PUBLIC_URL or x-forwarded-host header set in production. ' +
        `Share URLs will fall back to ${origin}. Set PAGEBIN_PUBLIC_URL=https://your-host ` +
        'or configure your reverse proxy to forward the host header.'
    );
    warned = true;
  }

  return origin;
}