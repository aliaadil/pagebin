import { NextResponse } from 'next/server';
import { listPastes } from '@/lib/db';
import { NOINDEX } from '@/lib/noindex';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin: list recent pastes. Requires PAGEBIN_ADMIN_TOKEN.
 * Returns 404 (not 401) to avoid leaking that the endpoint exists.
 */
export function GET(req: Request) {
  const adminToken = process.env.PAGEBIN_ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const rows = listPastes().map((r) => ({
    id: r.id,
    url: `/p/${r.id}`,
    bytes: r.byte_size,
    created_at: r.created_at,
    expires_at: r.expires_at,
  }));
  const res = NextResponse.json({ pastes: rows });
  res.headers.set('X-Robots-Tag', NOINDEX);
  return res;
}
