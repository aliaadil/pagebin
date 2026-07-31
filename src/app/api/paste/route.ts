import { NextRequest, NextResponse } from 'next/server';
import { insertPaste, sweepExpired } from '@/lib/db';
import { writePaste } from '@/lib/storage';
import { newSlug } from '@/lib/slug';
import { expiryToUnix, isExpiry, type Expiry } from '@/lib/expiry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_KB = Number(process.env.PAGEBIN_MAX_UPLOAD_KB ?? '512');
const MAX_BYTES = MAX_KB * 1024;

/**
 * Accept either:
 *   - multipart/form-data with a `file` field (drag-and-drop or file picker)
 *   - application/json { html, expiry? } (raw paste)
 */
export async function POST(req: NextRequest) {
  sweepExpired();

  const contentType = req.headers.get('content-type') ?? '';
  let html: string;
  let expiry: Expiry = '24h';

  try {
    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      const expForm = form.get('expiry');
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
    } else if (contentType.includes('application/json')) {
      const body = (await req.json()) as { html?: unknown; expiry?: unknown };
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

  const id = newSlug();
  const htmlPath = writePaste(id, html);
  const nowSec = Math.floor(Date.now() / 1000);
  insertPaste({
    id,
    html_path: htmlPath,
    title: null,
    byte_size: html.length,
    created_at: nowSec,
    expires_at: expiryToUnix(expiry, nowSec),
  });

  const base = new URL(req.url).origin;
  return NextResponse.json({
    id,
    url: `${base}/p/${id}`,
    expiry,
    bytes: html.length,
  });
}
