import { NextRequest, NextResponse } from 'next/server';
import { getPaste, sweepExpired } from '@/lib/db';
import { isValidId } from '@/lib/slug';
import { renderPasswordPrompt } from '@/lib/password-prompt';
import { verifyPassword } from '@/lib/password';
import {
  mintUnlockCookie,
  setUnlockCookie,
  unlockCookieName,
  verifyUnlockCookie,
} from '@/lib/unlock-cookie';
import { applyNoIndex } from '@/lib/noindex';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /p/:id/unlock — verify a password for a protected paste and, on
 * success, set the unlock cookie and redirect to the paste. On failure
 * we always re-render the prompt (with a "incorrect password" banner)
 * so a caller can't distinguish "no such paste" from "wrong password".
 *
 * Accepts form-encoded (`password=<value>`) for the default UI flow and
 * application/json (`{ password }`) for scripted unlocks.
 *
 * We also accept GET so a visitor with a previously-set but expired
 * unlock cookie can be "carried" back to the prompt without resubmitting.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  sweepExpired();
  return handleUnlock(req, await ctx.params, false);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  sweepExpired();
  return handleUnlock(req, await ctx.params, true);
}

async function handleUnlock(
  req: NextRequest,
  params: { id: string },
  isGet: boolean
) {
  const { id } = params;
  if (!isValidId(id)) {
    return notFound();
  }
  const row = getPaste(id);
  if (!row || !row.password_hash) {
    // No such paste, or it's not protected — treat both as "wrong password"
    // to avoid leaking existence.
    return promptAgain(id);
  }

  // GET means we don't have a fresh password attempt; we just check whether
  // an unlock cookie already exists. If it does, redirect to the paste.
  // Otherwise re-render the prompt (no banner).
  if (isGet) {
    const cookieValue = req.cookies.get(unlockCookieName(id))?.value;
    if (verifyUnlockCookie(id, cookieValue)) {
      return NextResponse.redirect(new URL(`/p/${id}`, req.url), { status: 303 });
    }
    return promptAgain(id, false);
  }

  const contentType = req.headers.get('content-type') ?? '';
  let password = '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as { password?: unknown };
      if (typeof body.password === 'string') password = body.password;
    } else {
      const form = await req.formData();
      const pw = form.get('password');
      if (typeof pw === 'string') password = pw;
    }
  } catch {
    // Parse error — fall through and re-render the prompt as if failed.
  }

  if (!verifyPassword(row.password_hash, password)) {
    return promptAgain(id, true);
  }

  const cookieValue = mintUnlockCookie(id);
  const res = NextResponse.redirect(new URL(`/p/${id}`, req.url), {
    status: 303,
  });
  res.headers.append('Set-Cookie', setUnlockCookie(id, cookieValue));
  applyNoIndex(res.headers);
  return res;
}

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

function promptAgain(id: string, failed = false) {
  const html = renderPasswordPrompt({ id, failed });
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  applyNoIndex(headers);
  return new NextResponse(html, { status: 200, headers });
}