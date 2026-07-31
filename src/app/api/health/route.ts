import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Liveness probe used by Docker HEALTHCHECK and load balancers.
 * Cheap — just verifies the DB file is reachable.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  try {
    getDb();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
