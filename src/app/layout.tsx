import type { Metadata } from 'next';
import './globals.css';

const themeBoot = `
(function() {
  try {
    var stored = localStorage.getItem('pagebin-theme');
    var theme = stored;
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  title: {
    default: 'pagebin',
    template: '%s · pagebin',
  },
  description: 'Self-hosted static HTML pastebin — drop a file, get a shareable URL.',
  applicationName: 'pagebin',
  authors: [{ name: 'Ali Adil' }],
  generator: 'pagebin',
  keywords: [
    'pagebin',
    'pastebin',
    'html paste',
    'share html',
    'self-hosted',
    'tiiny host alternative',
    'surge alternative',
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    title: 'pagebin',
    description: 'Self-hosted static HTML pastebin — drop a file, get a shareable URL.',
    url: 'https://pagebin.example.com',
    siteName: 'pagebin',
    images: [
      {
        url: '/og-card.png',
        width: 1200,
        height: 630,
        alt: 'pagebin — share a page, skip the paste.',
        type: 'image/png',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'pagebin',
    description: 'Self-hosted static HTML pastebin — drop a file, get a shareable URL.',
    images: ['/og-card.png'],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC-free theme bootstrap — runs before paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
