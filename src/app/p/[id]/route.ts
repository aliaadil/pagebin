import { NextRequest, NextResponse } from 'next/server';
import { deletePaste, getPaste, sweepExpired } from '@/lib/db';
import { readPaste, deletePasteFile } from '@/lib/storage';
import { isValidId } from '@/lib/slug';
import { PASTE_CSP } from '@/lib/csp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /p/:id — serve the rendered HTML for a paste.
 * Apply a strict CSP so pasted pages can't exfiltrate against the pagebin origin.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  sweepExpired();
  const { id } = await ctx.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const row = getPaste(id);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const html = readPaste(row.html_path);
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': PASTE_CSP,
      // Don't let a paste set its own cookies that the pagebin origin can read
      'Cache-Control': 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * DELETE /p/:id — admin-only. Requires PAGEBIN_ADMIN_TOKEN.
 * Returns 404 to non-admins (no existence leak).
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const adminToken = process.env.PAGEBIN_ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const row = getPaste(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  deletePasteFile(row.html_path);
  deletePaste(id);
  return NextResponse.json({ ok: true });
}
