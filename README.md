# pagebin

> Self-hosted static HTML pagebin — drop an HTML file, get a random shareable URL.

Like `tiiny.host`, `surge.sh`, or Seol, but you own the box. Built for sharing
one-off HTML pages (reports, demos, AI-generated artifacts) with friends and
family without going through GitHub Pages or Vercel.

## Features

- **Paste or upload** — drop an `.html` file at `/`, or paste raw HTML at `/paste`.
- **Random short slugs** — URLs like `/p/aB3kZ_9mPqR7cD2x` (96-bit CSPRNG id, URL-safe base64).
- **Per-paste expiry** — auto-delete after 1h / 24h / 1w / never.
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

```bash
curl -F file=@page.html http://localhost:3000/api/paste
# => {"id":"aB3kZ_9mPqR7cD2x","url":"https://pagebin.example.com/p/aB3kZ_9mPqR7cD2x","path":"/p/aB3kZ_9mPqR7cD2x","expiry":"24h","bytes":28}
```

```bash
curl -H 'Content-Type: application/json' \
  -d '{"html":"<h1>hi</h1>","expiry":"24h"}' \
  http://localhost:3000/api/paste
```

The response always includes both `url` (absolute, ready to share) and
`path` (relative, for clients that want to resolve against their own origin).

### List / delete (admin)

```bash
curl -H "Authorization: Bearer $PAGEBIN_ADMIN_TOKEN" http://localhost:3000/api/admin/pastes
curl -X DELETE -H "Authorization: Bearer $PAGEBIN_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/pastes/abc123
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
