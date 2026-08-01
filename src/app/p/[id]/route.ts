import { NextRequest, NextResponse } from 'next/server';
import { deletePaste, getPaste, sweepExpired } from '@/lib/db';
import { readPaste, deletePasteFile } from '@/lib/storage';
import { isValidId } from '@/lib/slug';
import { PASTE_CSP } from '@/lib/csp';
import { NOINDEX, applyNoIndex } from '@/lib/noindex';
import { renderPasswordPrompt } from '@/lib/password-prompt';
import {
  unlockCookieName,
  verifyUnlockCookie,
} from '@/lib/unlock-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /p/:id — serve the rendered HTML for a paste.
 * Apply a strict CSP so pasted pages can't exfiltrate against the pagebin origin.
 *
 * Protected pastes (those with a password_hash) render the password prompt
 * instead of the content until the visitor presents a valid unlock cookie.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  sweepExpired();
  const { id } = await ctx.params;
  if (!isValidId(id)) {
    return notFound();
  }
  const row = getPaste(id);
  if (!row) {
    return notFound();
  }
  if (row.password_hash) {
    const cookieValue = req.cookies.get(unlockCookieName(id))?.value;
    if (!verifyUnlockCookie(id, cookieValue)) {
      return promptPage(id, false);
    }
  }
  const html = readPaste(row.html_path);
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': PASTE_CSP,
    // Don't let a paste set its own cookies that the pagebin origin can read
    'Cache-Control': 'public, max-age=60',
    'X-Content-Type-Options': 'nosniff',
  });
  applyNoIndex(headers);
  return new NextResponse(html, { status: 200, headers });
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
    return notFound();
  }
  const adminToken = process.env.PAGEBIN_ADMIN_TOKEN;
  if (!adminToken) {
    return notFound();
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${adminToken}`) {
    return notFound();
  }
  const row = getPaste(id);
  if (!row) return notFound();
  deletePasteFile(row.html_path);
  deletePaste(id);
  const res = NextResponse.json({ ok: true });
  res.headers.set('X-Robots-Tag', NOINDEX);
  return res;
}

function notFound() {
  const res = NextResponse.json({ error: 'Not found' }, { status: 404 });
  res.headers.set('X-Robots-Tag', NOINDEX);
  return res;
}

function promptPage(id: string, failed: boolean) {
  const html = renderPasswordPrompt({ id, failed });
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  applyNoIndex(headers);
  return new NextResponse(html, { status: 200, headers });
}