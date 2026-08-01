import type { Metadata } from 'next';
import HomeClient from './home-client';

export const metadata: Metadata = {
  title: 'pagebin — share an HTML page',
  description: 'Drop or paste an HTML file, get a random shareable URL.',
};

/**
 * Server component. The API now stamps absolute URLs via resolvePublicOrigin,
 * so the client doesn't need the origin pre-computed.
 */
export default function Home() {
  return <HomeClient />;
}