/**
 * Tiny HTML for the password prompt served in place of a protected paste.
 *
 * Server-rendered (no client JS, no external resources — the page itself
 * is what the visitor lands on before they have a cookie, so it has to
 * work with cookies disabled / JS off / the network flaky).
 *
 * Output is escaped and the form posts back to /p/:id/unlock which sets
 * the unlock cookie on success and redirects to the same paste URL.
 */
/**
 * Escape a value for safe inclusion inside HTML element content.
 * We don't need full attribute escaping because all interpolated values
 * here go inside element text content.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PromptOptions {
  id: string;
  /** True when the previous attempt failed; UI shows a banner. */
  failed?: boolean;
  /** Optional error code/message for analytics or accessibility. */
  reason?: string;
}

/** Render the password prompt page as a complete HTML5 document. */
export function renderPasswordPrompt(opts: PromptOptions): string {
  const { id, failed = false, reason = '' } = opts;
  const safeId = escapeHtml(id);
  const banner = failed
    ? `<div class="pb-prompt-banner" role="alert">Incorrect password. Try again.</div>`
    : '';
  const reasonAttr = reason ? ` data-reason="${escapeHtml(reason)}"` : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>password required — pagebin</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: #faf7f2;
      color: #1a1a1a;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #14110d; color: #f1ede5; }
      .pb-prompt-card { background: #1c1915; border-color: #2c2823; }
      .pb-prompt-input { background: #14110d; border-color: #2c2823; color: #f1ede5; }
      .pb-prompt-input:focus { border-color: #c780fa; }
      .pb-prompt-submit { background: #f1ede5; color: #14110d; }
      .pb-prompt-banner { background: #2a1414; border-color: #5a2424; color: #ffb0b0; }
    }
    .pb-prompt-card {
      width: min(360px, calc(100vw - 32px));
      padding: 28px;
      border-radius: 14px;
      background: #fff;
      border: 1px solid #e0dcd6;
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
    }
    .pb-prompt-title { margin: 0 0 6px; font-size: 18px; font-weight: 600; }
    .pb-prompt-sub { margin: 0 0 18px; font-size: 13px; opacity: 0.7; }
    .pb-prompt-banner {
      margin-bottom: 14px; padding: 10px 12px; border-radius: 8px;
      background: #fff0f0; border: 1px solid #f0c0c0; color: #a02020; font-size: 13px;
    }
    .pb-prompt-form { display: grid; gap: 12px; }
    .pb-prompt-label { font-size: 12px; opacity: 0.7; }
    .pb-prompt-input {
      width: 100%; box-sizing: border-box; padding: 10px 12px;
      border: 1px solid #c9c4ba; border-radius: 8px; font-size: 14px;
      font-family: inherit; background: #fff; color: inherit;
    }
    .pb-prompt-input:focus { outline: none; border-color: #1a1a1a; }
    .pb-prompt-submit {
      padding: 10px 14px; border: 0; border-radius: 8px; cursor: pointer;
      background: #1a1a1a; color: #fff; font-size: 14px; font-weight: 600;
      font-family: inherit;
    }
    .pb-prompt-submit:focus-visible { outline: 2px solid #c780fa; outline-offset: 2px; }
    .pb-prompt-id { display: block; margin-top: 18px; font-size: 11px; opacity: 0.5;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace; text-align: center; }
  </style>
</head>
<body>
  <main class="pb-prompt-card" role="main"${reasonAttr}>
    <h1 class="pb-prompt-title">password required</h1>
    <p class="pb-prompt-sub">this pagebin page is locked. enter the password to view it.</p>
    ${banner}
    <form class="pb-prompt-form" method="post" action="/p/${safeId}/unlock" autocomplete="off">
      <label class="pb-prompt-label" for="pb-pw">password</label>
      <input class="pb-prompt-input" type="password" name="password" id="pb-pw" required autofocus>
      <button class="pb-prompt-submit" type="submit">unlock</button>
    </form>
    <code class="pb-prompt-id">pagebin / p / ${safeId}</code>
  </main>
</body>
</html>`;
}