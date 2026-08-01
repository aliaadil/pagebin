'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import clsx from 'clsx';

type Expiry = '1h' | '24h' | '1w' | 'never';
type Mode = 'file' | 'paste';
type Theme = 'light' | 'dark';

const EXPIRY_OPTIONS: { value: Expiry; label: string }[] = [
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '1w', label: '1 week' },
  { value: 'never', label: 'never' },
];

const ACCEPT = {
  'text/html': ['.html', '.htm'],
  'application/xhtml+xml': ['.xhtml'],
};

const CONFETTI_COLORS = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d9de0', '#c780fa'];

export default function HomeClient() {
  const [mode, setMode] = useState<Mode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [pastedHtml, setPastedHtml] = useState('');
  const [expiry, setExpiry] = useState<Expiry>('24h');
  const [password, setPassword] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; bytes: number } | null>(
    null
  );
  const [theme, setTheme] = useState<Theme>('light');
  const [themeReady, setThemeReady] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  // --- Theme bootstrap (matches the inline script in layout.tsx) ---
  useEffect(() => {
    const stored = window.localStorage.getItem('pagebin-theme');
    const initial: Theme =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    setThemeReady(true);
  }, []);

  // Listen for OS theme changes when the user hasn't explicitly picked one.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      const explicit = window.localStorage.getItem('pagebin-theme');
      if (explicit !== 'dark' && explicit !== 'light') {
        const next: Theme = e.matches ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      window.localStorage.setItem('pagebin-theme', next);
      return next;
    });
  }, []);

  // --- Window-level drag tracking so the overlay shows on ANY drop intent. ---
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const onDragEnter = (e: globalThis.DragEvent) => {
      if (!hasFiles(e as unknown as DragEvent)) return;
      dragCounter.current += 1;
      if (dragCounter.current === 1) setDragActive(true);
    };
    const onDragLeave = (e: globalThis.DragEvent) => {
      if (!hasFiles(e as unknown as DragEvent)) return;
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setDragActive(false);
    };
    const onDragOver = (e: globalThis.DragEvent) => {
      if (hasFiles(e as unknown as DragEvent)) e.preventDefault();
    };
    const onDrop = (e: globalThis.DragEvent) => {
      if (!hasFiles(e as unknown as DragEvent)) return;
      e.preventDefault();
      dragCounter.current = 0;
      setDragActive(false);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // --- Dropzone for the explicit drop zone (also accepts clicks). ---
  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const msg = rejections[0].errors[0]?.message ?? 'File rejected';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (accepted.length > 0) {
        setError(null);
        setFile(accepted[0]);
        setMode('file');
      }
    },
    []
  );
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: false,
    noClick: true, // we click via the dedicated button; prevents the input from being a focusable div
    noKeyboard: true,
  });

  // --- Submit pipeline (shared between file + paste) ---
  const canSubmit =
    !busy && ((file !== null && mode === 'file') || pastedHtml.trim().length > 0);

  async function submit() {
    setError(null);
    setResult(null);
    if (mode === 'file' && !file) {
      setError('Pick a file or paste HTML first.');
      return;
    }
    if (mode === 'paste' && !pastedHtml.trim()) {
      setError('Paste some HTML first.');
      return;
    }
    setBusy(true);
    try {
      let res: Response;
      const pw = passwordEnabled ? password : undefined;
      if (mode === 'file' && file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('expiry', expiry);
        if (pw) fd.append('password', pw);
        res = await fetch('/api/paste', { method: 'POST', body: fd });
      } else {
        res = await fetch('/api/paste', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: pastedHtml, expiry, ...(pw ? { password: pw } : {}) }),
        });
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = j.error ?? `Upload failed (${res.status})`;
        setError(msg);
        toast.error(msg);
        return;
      }
      const j = (await res.json()) as {
        url: string;
        path: string;
        bytes: number;
        protected?: boolean;
      };
      setResult({ url: j.url, bytes: j.bytes });
      setFile(null);
      setPastedHtml('');
      setPassword('');
      setPasswordEnabled(false);
      toast.success(
        j.protected
          ? 'Published — protected with a password.'
          : 'Published — share away.'
      );
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed — select the URL manually');
    }
  }, []);

  return (
    <>
      <Toaster
        theme={theme}
        position="bottom-center"
        toastOptions={{ className: 'pb-toast' }}
      />

      <main className="pb-shell">
        <header className="pb-header">
          <div className="pb-brand">
            <span className="pb-brand-dot" aria-hidden />
            <span className="pb-brand-name">pagebin</span>
          </div>
          {themeReady && (
            <button
              type="button"
              onClick={toggleTheme}
              className="pb-theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          )}
        </header>

        <section className="pb-hero">
          <motion.h1
            className="pb-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            Share an HTML page
            <br />
            <span className="pb-title-accent">in one drop.</span>
          </motion.h1>
          <motion.p
            className="pb-subtitle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            Drag a file anywhere, or paste HTML. You get a random shareable URL.
          </motion.p>
        </section>

        <motion.section
          className="pb-card"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div role="tablist" aria-label="Input mode" className="pb-tabs">
            <TabButton
              active={mode === 'file'}
              onClick={() => setMode('file')}
              id="tab-file"
              controls="panel-file"
            >
              Drop file
            </TabButton>
            <TabButton
              active={mode === 'paste'}
              onClick={() => setMode('paste')}
              id="tab-paste"
              controls="panel-paste"
            >
              Paste HTML
            </TabButton>
          </div>

          <div className="pb-panel">
            <div
              role="tabpanel"
              id="panel-file"
              aria-labelledby="tab-file"
              hidden={mode !== 'file'}
              {...getRootProps({
                className: clsx('pb-dropzone', isDragActive && 'pb-dropzone--active'),
              })}
            >
              <input {...getInputProps()} />
              <div className="pb-dropzone-icon" aria-hidden>
                <UploadIcon />
              </div>
              <p className="pb-dropzone-text">
                <strong>Drag &amp; drop</strong> an .html file here
              </p>
              <button
                type="button"
                onClick={open}
                className="pb-link-button"
                disabled={busy}
              >
                or choose a file
              </button>
              {file && (
                <p className="pb-dropzone-file">
                  <span aria-hidden>📎</span> {file.name} ·{' '}
                  {formatBytes(file.size)}
                </p>
              )}
            </div>

            <div
              role="tabpanel"
              id="panel-paste"
              aria-labelledby="tab-paste"
              hidden={mode !== 'paste'}
            >
              <label htmlFor="pb-html" className="pb-label">
                Paste your HTML
              </label>
              <textarea
                id="pb-html"
                value={pastedHtml}
                onChange={(e) => setPastedHtml(e.target.value)}
                placeholder="<!doctype html><h1>hi</h1>"
                rows={10}
                className="pb-textarea"
                spellCheck={false}
              />
              <p className="pb-hint">
                {formatBytes(pastedHtml.length)} · paste anything that renders in
                a browser.
              </p>
            </div>
          </div>

          <div className="pb-controls">
            <label className="pb-expiry">
              <span>Expiry</span>
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value as Expiry)}
                className="pb-select"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="pb-password">
              <label className="pb-password-toggle">
                <input
                  type="checkbox"
                  checked={passwordEnabled}
                  onChange={(e) => {
                    setPasswordEnabled(e.target.checked);
                    if (!e.target.checked) setPassword('');
                  }}
                  disabled={busy}
                />
                <span>password-protect</span>
              </label>
              {passwordEnabled && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="required to view"
                  className="pb-password-input"
                  autoComplete="new-password"
                  spellCheck={false}
                  disabled={busy}
                  aria-label="Page password"
                />
              )}
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="pb-submit"
            >
              {busy ? (
                <span className="pb-submit-busy">
                  <span className="pb-spinner" aria-hidden /> Uploading…
                </span>
              ) : (
                'Publish'
              )}
            </button>
          </div>
        </motion.section>

        <AnimatePresence>
          {busy && (
            <motion.section
              key="progress"
              className="pb-progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              aria-live="polite"
            >
              <div className="pb-progress-bar pb-shimmer" />
              <p className="pb-progress-text">Uploading your page…</p>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.section
              key="result"
              className="pb-result"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              aria-live="polite"
            >
              <Confetti />
              <h2 className="pb-result-title">Done — share this URL:</h2>
              <p className="pb-result-meta">
                {result.bytes.toLocaleString()} bytes
              </p>
              <div className="pb-result-row">
                <input
                  readOnly
                  value={result.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="pb-result-url"
                  aria-label="Share URL"
                />
                <button
                  type="button"
                  onClick={() => copy(result.url)}
                  className="pb-copy"
                >
                  Copy
                </button>
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="pb-open-link"
              >
                Open in new tab →
              </a>
            </motion.section>
          )}
        </AnimatePresence>

        <footer className="pb-footer">
          <p>
            Self-hosted HTML pagebin · files expire automatically
          </p>
        </footer>
      </main>

      <DragOverlay visible={dragActive} />
    </>
  );
}

// ---- Sub-components -------------------------------------------------------

function TabButton({
  active,
  onClick,
  id,
  controls,
  children,
}: {
  active: boolean;
  onClick: () => void;
  id: string;
  controls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={clsx('pb-tab', active && 'pb-tab--active')}
    >
      {children}
      {active && (
        <motion.span
          layoutId="pb-tab-underline"
          className="pb-tab-underline"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
    </button>
  );
}

function DragOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="drag-overlay"
          className="pb-drag-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          aria-hidden
        >
          <motion.div
            className="pb-drag-card"
            initial={{ scale: 0.92, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -4 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className="pb-drag-icon" aria-hidden>
              <UploadIcon />
            </div>
            <p className="pb-drag-title">Drop your HTML here</p>
            <p className="pb-drag-sub">Release to publish a shareable link</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        cx: (Math.random() - 0.5) * 280,
        cy: -120 - Math.random() * 80,
        delay: Math.random() * 120,
      })),
    []
  );
  return (
    <div className="pb-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="pb-confetti-piece"
          style={
            {
              '--pb-cx': `${p.cx}px`,
              '--pb-cy': `${p.cy}px`,
              '--pb-delay': `${p.delay}ms`,
              '--confetti-color': p.color,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ---- Icons (tiny inline SVGs, no extra dep) -------------------------------

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="M4.93 4.93l1.41 1.41" />
        <path d="M17.66 17.66l1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="M4.93 19.07l1.41-1.41" />
        <path d="M17.66 6.34l1.41-1.41" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V4M12 4l-4 4M12 4l4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- Utilities -----------------------------------------------------------

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}