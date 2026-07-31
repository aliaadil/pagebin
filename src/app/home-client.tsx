'use client';

import { useState } from 'react';

type Expiry = '1h' | '24h' | '1w' | 'never';

export default function HomeClient({ origin }: { origin: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [pastedHtml, setPastedHtml] = useState('');
  const [expiry, setExpiry] = useState<Expiry>('24h');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; bytes: number } | null>(
    null
  );

  async function submit() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('expiry', expiry);
        res = await fetch('/api/paste', { method: 'POST', body: fd });
      } else if (pastedHtml.trim()) {
        res = await fetch('/api/paste', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: pastedHtml, expiry }),
        });
      } else {
        setError('Pick a file or paste HTML first.');
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `Upload failed (${res.status})`);
        return;
      }
      const j = (await res.json()) as { url: string; bytes: number };
      const absolute = j.url.startsWith('http') ? j.url : `${origin}${j.url}`;
      setResult({ url: absolute, bytes: j.bytes });
      setFile(null);
      setPastedHtml('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '4rem auto',
        padding: '0 1.5rem',
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        color: '#1a1a1a',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '2.4rem', letterSpacing: '-0.02em' }}>
        pagebin
      </h1>
      <p style={{ color: '#555', marginTop: '0.5rem' }}>
        Drop or paste an HTML file. Get a random shareable URL.
      </p>

      <section
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          border: '1px solid #e0dcd6',
          borderRadius: 12,
          background: '#faf7f2',
        }}
      >
        <label
          style={{
            display: 'block',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          Upload .html
        </label>
        <input
          type="file"
          accept=".html,.htm,text/html"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ display: 'block', marginBottom: '1rem' }}
        />

        <label
          style={{
            display: 'block',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          …or paste HTML
        </label>
        <textarea
          value={pastedHtml}
          onChange={(e) => setPastedHtml(e.target.value)}
          placeholder="<!doctype html><h1>hi</h1>"
          rows={8}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 14,
            padding: '0.6rem',
            border: '1px solid #d8d3ca',
            borderRadius: 6,
            background: 'white',
          }}
        />

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label>
            Expiry:&nbsp;
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value as Expiry)}
            >
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
              <option value="1w">1 week</option>
              <option value="never">never</option>
            </select>
          </label>

          <button
            onClick={submit}
            disabled={busy}
            style={{
              padding: '0.55rem 1.1rem',
              border: 0,
              borderRadius: 6,
              background: busy ? '#888' : '#1a1a1a',
              color: 'white',
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? 'Uploading…' : 'Publish'}
          </button>
        </div>
      </section>

      {error && (
        <p
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#fff0f0',
            color: '#a02020',
            borderRadius: 6,
          }}
        >
          {error}
        </p>
      )}

      {result && (
        <section
          style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            border: '1px solid #c9e3c5',
            borderRadius: 12,
            background: '#f3faf0',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Done — share this URL:</p>
          <p style={{ margin: '0.5rem 0', fontSize: 13, color: '#555' }}>
            {result.bytes.toLocaleString()} bytes
          </p>
          <input
            readOnly
            value={result.url}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: '100%',
              padding: '0.6rem',
              fontFamily: 'ui-monospace, monospace',
              border: '1px solid #c2d8be',
              borderRadius: 6,
              background: 'white',
            }}
          />
        </section>
      )}
    </main>
  );
}
