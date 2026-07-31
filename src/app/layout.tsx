import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'pagebin',
  description: 'Self-hosted static HTML pastebin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#faf7f2',
          color: '#1a1a1a',
        }}
      >
        {children}
      </body>
    </html>
  );
}
