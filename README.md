# pagebin

> Self-hosted static HTML pagebin — drop an HTML file, get a random shareable URL.

Like `tiiny.host`, `surge.sh`, or Seol, but you own the box. Built for sharing
one-off HTML pages (reports, demos, AI-generated artifacts) with friends and
family without going through GitHub Pages or Vercel.

## Features

- **Paste or upload** — drop an `.html` file at `/`, or paste raw HTML at `/paste`.
- **Random short slugs** — URLs like `/p/aB3kZ_9mPqR7cD2x` (96-bit CSPRNG id, URL-safe base64).
- **Per-paste expiry** — auto-delete after 1h / 24h / 1w / never.
- **Optional password protection** — set a password at upload time; the page is locked behind a server-rendered prompt until a short-lived, HMAC-signed unlock cookie is presented.
- **Private by link** — `/robots.txt` disallows everything and every response carries `X-Robots-Tag: noindex, nofollow, noarchive, noimageindex`. Defense-in-depth, not access control.
- **No accounts, no API keys** to use. Optional admin token for management.
- **Sandboxing** — uploaded HTML is served in a sandboxed context (no cookies,
  no localStorage, no external scripts unless explicitly allowed).
- **Single Next.js binary** — runs anywhere Node 20+ runs.

## Quick start (Docker)

```bash
docker run -d --name pagebin \
  -p 3000:3000 \
  -v pagebin-data:/data \
  ghcr.io/aliaadil/pagebin:latest
```

Open http://localhost:3000 — drop or paste an HTML file, get a shareable URL.

## Quick start (from source)

```bash
npm install
npm run build
PAGEBIN_DATA_DIR=./data npm start
```

Requires Node 20+.

## Configuration

| Env var                  | Default     | Purpose                                                  |
|--------------------------|-------------|----------------------------------------------------------|
| `PORT`                   | `3000`      | HTTP listen port                                         |
| `PAGEBIN_DATA_DIR`       | `./data`    | Where the SQLite DB and uploaded HTML files are stored   |
| `PAGEBIN_MAX_UPLOAD_KB`  | `512`       | Max upload size in KB                                    |
| `PAGEBIN_ADMIN_TOKEN`    | _(unset)_   | If set, required to delete pastes via `/api/admin/...`  |
| `PAGEBIN_COOKIE_SECRET`  | _(unset)_   | HMAC secret for password-unlock cookies. Use a 32+ char random value in production; in dev a derived secret is used and the app logs a warning. |
| `PAGEBIN_PUBLIC_URL`     | _(unset)_   | **Recommended in production.** Canonical public origin (e.g. `https://pagebin.example.com`) used to build share URLs. Falls back to `x-forwarded-host` / `x-forwarded-proto` if your reverse proxy forwards them; otherwise `http://localhost:3000`. A one-time warning is logged in production if this is unset. |

### Behind a reverse proxy / Coolify

Share URLs are stamped with the public origin so links work even though the
app itself listens on `localhost:3000` inside the container. Three options:

1. **Set `PAGEBIN_PUBLIC_URL`** to your real origin — recommended.

   ```bash
   docker run -d --name pagebin \
     -p 3000:3000 \
     -e PAGEBIN_PUBLIC_URL=https://pagebin.example.com \
     -v pagebin-data:/data \
     ghcr.io/aliaadil/pagebin:latest
   ```

2. **Have your proxy forward `Host` and `X-Forwarded-Proto`** (Caddy, nginx,
   Traefik all do this by default). The app will pick them up automatically.

3. **Do neither** — the app logs a warning at boot and falls back to
   `http://localhost:3000` in share URLs. Fine for local dev only.

## API

### Upload

`POST /api/paste` accepts either form data or JSON. Every successful
response carries `X-Robots-Tag: noindex, nofollow, noarchive, noimageindex`.

Form upload (multipart):

```bash
curl -F file=@page.html -F expiry=24h -F password=hunter2 http://localhost:3000/api/paste
# => {"id":"aB3kZ_9mPqR7cD2x","url":"https://pagebin.example.com/p/aB3kZ_9mPqR7cD2x","path":"/p/aB3kZ_9mPqR7cD2x","expiry":"24h","bytes":28,"protected":true}
```

JSON upload (application/json):

```bash
curl -H 'Content-Type: application/json' \
  -d '{"html":"<h1>hi</h1>","expiry":"24h"}' \
  http://localhost:3000/api/paste
```

Request fields:

| Field      | Form                | JSON      | Notes                                          |
|------------|---------------------|-----------|------------------------------------------------|
| `file`     | required (File)     | —         | HTML file. Treated as text — must be UTF-8.    |
| `html`     | —                   | required  | Raw HTML string.                               |
| `expiry`   | optional (`1h`/`24h`/`1w`/`never`) | same | Defaults to `24h`.                            |
| `password` | optional (string)   | same      | Set to lock the page. Empty string is treated as "no password". Max length 256 chars. |

Response shape (200):

```json
{
  "id": "aB3kZ_9mPqR7cD2x",
  "url": "https://pagebin.example.com/p/aB3kZ_9mPqR7cD2x",
  "path": "/p/aB3kZ_9mPqR7cD2x",
  "expiry": "24h",
  "bytes": 28,
  "protected": false
}
```

`url` is absolute (ready to share). `path` is relative for clients that
want to resolve against their own origin. `protected` is `true` when a
password was set at creation time.

Error responses (JSON):

| Status | When                                                              |
|--------|-------------------------------------------------------------------|
| 400    | Missing `html` / `file`, oversized password, or malformed body.   |
| 413    | Body exceeds `PAGEBIN_MAX_UPLOAD_KB`.                             |
| 415    | Content-Type is neither `multipart/form-data` nor `application/json`. |

### Reading a paste

`GET /p/:id` returns the rendered HTML for any paste. Protected pastes
return a server-rendered password prompt instead, with a form posting to
`/p/:id/unlock`.

### Unlocking a protected paste

`POST /p/:id/unlock` accepts form-encoded `password=<value>` (or JSON
`{ password }`) and on success sets a scoped `pb_unlock_<id>` cookie
(`HttpOnly`, `SameSite=Lax`, 1-hour TTL, scoped to `/p/<id>`) and 303s
back to `/p/<id>`. On failure it re-renders the prompt with an "incorrect
password" banner — same response shape whether the paste doesn't exist
or the password was wrong, so existence can't be probed.

Cookies are HMAC-signed with `PAGEBIN_COOKIE_SECRET`. Setting that env
var in production is required — the app falls back to a derived dev
secret otherwise and warns at startup.

### List / delete (admin)

```bash
curl -H "Authorization: Bearer $PAGEBIN_ADMIN_TOKEN" http://localhost:3000/api/admin/pastes
curl -X DELETE -H "Authorization: Bearer $PAGEBIN_ADMIN_TOKEN" \
  http://localhost:3000/p/aB3kZ_9mPqR7cD2x
```

## Architecture

- **Next.js 15** App Router — one app, server-rendered pages.
- **better-sqlite3** — single SQLite file in `PAGEBIN_DATA_DIR/pagebin.db`.
- **No external services** — no Redis, no S3. Suitable for `docker compose`
  or Coolify deployments.

## Roadmap

| Phase | Feature                                  | Status   |
|-------|------------------------------------------|----------|
| 1     | Core: HTML paste/upload → random URL     | ✅ MVP   |
| 2     | Expiry (1h / 24h / 1w / never)           | ✅ MVP   |
| 2b    | Correct public-URL behind reverse proxy  | ✅ done  |
| 2c    | Pretty UI: drag-anywhere drop, animations, dark mode | ✅ done |
| 3     | Markdown paste + render                  | planned  |
| 4     | Password protection + shareable unlock   | planned  |
| 5     | Static-site zip upload (multi-file)      | planned  |
| 6     | Visit stats (count, last accessed)       | planned  |
| 7     | Rate limit + admin dashboard UI          | planned  |

## License

MIT
