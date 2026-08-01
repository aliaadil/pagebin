import { NextRequest, NextResponse } from 'next/server';
import { getPaste, insertPaste, sweepExpired } from '@/lib/db';
import { writePaste } from '@/lib/storage';
import { mintUniqueId } from '@/lib/slug';
import { expiryToUnix, isExpiry, type Expiry } from '@/lib/expiry';
import { NOINDEX } from '@/lib/noindex';
import { hashPassword } from '@/lib/password';
import { resolvePublicOrigin } from '@/lib/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_KB = Number(process.env.PAGEBIN_MAX_UPLOAD_KB ?? '512');
const MAX_BYTES = MAX_KB * 1024;
// Cap password length server-side so a hostile caller can't park a 1MB
// password through the scrypt KDF. 256 chars is well above anything a human
// will type and still gives plenty of entropy.
const MAX_PASSWORD_LEN = 256;

/**
 * Accept either:
 *   - multipart/form-data with `file` + optional `expiry` + optional `password`
 *   - application/json { html, expiry?, password? }
 */
export async function POST(req: NextRequest) {
  sweepExpired();

  const contentType = req.headers.get('content-type') ?? '';
  let html: string;
  let expiry: Expiry = '24h';
  let password: string | undefined;

  try {
    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      const expForm = form.get('expiry');
      const pwForm = form.get('password');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `File too large (max ${MAX_KB} KB)` },
          { status: 413 }
        );
      }
      html = await file.text();
      if (typeof expForm === 'string' && isExpiry(expForm)) expiry = expForm;
      if (typeof pwForm === 'string') password = pwForm;
    } else if (contentType.includes('application/json')) {
      const body = (await req.json()) as {
        html?: unknown;
        expiry?: unknown;
        password?: unknown;
      };
      if (typeof body.html !== 'string' || body.html.length === 0) {
        return NextResponse.json({ error: 'html field required' }, { status: 400 });
      }
      if (body.html.length > MAX_BYTES) {
        return NextResponse.json(
          { error: `HTML too large (max ${MAX_KB} KB)` },
          { status: 413 }
        );
      }
      html = body.html;
      if (typeof body.expiry === 'string' && isExpiry(body.expiry)) {
        expiry = body.expiry;
      }
      if (typeof body.password === 'string') password = body.password;
    } else {
      return NextResponse.json(
        { error: 'Use multipart/form-data or application/json' },
        { status: 415 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Bad request: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  let passwordHash: string | null = null;
  if (password !== undefined) {
    if (password.length === 0) {
      // An empty string is treated as "no password" rather than as a real
      // password — protects callers who accidentally submit "" from locking
      // themselves out forever.
      passwordHash = null;
    } else if (password.length > MAX_PASSWORD_LEN) {
      return NextResponse.json(
        { error: `Password too long (max ${MAX_PASSWORD_LEN} chars)` },
        { status: 400 }
      );
    } else {
      passwordHash = hashPassword(password);
    }
  }

  const id = await mintUniqueId((c) => getPaste(c) !== undefined);
  const htmlPath = writePaste(id, html);
  const nowSec = Math.floor(Date.now() / 1000);
  insertPaste({
    id,
    html_path: htmlPath,
    title: null,
    byte_size: html.length,
    created_at: nowSec,
    expires_at: expiryToUnix(expiry, nowSec),
    password_hash: passwordHash,
  });

  const path = `/p/${id}`;
  const origin = resolvePublicOrigin(req);
  const res = NextResponse.json({
    id,
    url: `${origin}${path}`,
    path,
    expiry,
    bytes: html.length,
    protected: passwordHash !== null,
  });
  res.headers.set('X-Robots-Tag', NOINDEX);
  return res;
}