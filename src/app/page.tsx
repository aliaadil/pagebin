import type { Metadata } from 'next';
import HomeClient from './home-client';

// Title is set here at the leaf so the parent layout's title.template has no
// effect on the home page (the original product treated the home as the
// landing page). The layout still owns icons, OpenGraph, Twitter, and robots
// metadata, which merge through Next.js's deep metadata merge.
export const metadata: Pick<Metadata, 'title'> = {
  title: 'pagebin — share an HTML page',
};

/**
 * Server component. The API now stamps absolute URLs via resolvePublicOrigin,
 * so the client doesn't need the origin pre-computed.
 */
export default function Home() {
  return <HomeClient />;
}
