import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { NOINDEX } from '@/lib/noindex';

/**
 * Liveness probe used by Docker HEALTHCHECK and load balancers.
 * Cheap — just verifies the DB file is reachable.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  try {
    getDb();
    const res = NextResponse.json({ ok: true });
    res.headers.set('X-Robots-Tag', NOINDEX);
    return res;
  } catch (err) {
    const res = NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
    res.headers.set('X-Robots-Tag', NOINDEX);
    return res;
  }
}
