import type { Metadata } from 'next';
import { headers } from 'next/headers';
import HomeClient from './home-client';

export const metadata: Metadata = {
  title: 'pagebin — share an HTML page',
  description: 'Drop or paste an HTML file, get a random shareable URL.',
};

/**
 * Server component. Reads the request origin so the client can construct
 * absolute URLs without needing window/document on the server.
 */
export default async function Home() {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;
  return <HomeClient origin={origin} />;
}
