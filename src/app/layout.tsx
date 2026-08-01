import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'pagebin',
  description: 'Self-hosted static HTML pagebin',
};

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