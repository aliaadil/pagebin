# pagebin

> Self-hosted static HTML pastebin — drop an HTML file, get a random shareable URL.

Like `tiiny.host`, `surge.sh`, or Seol, but you own the box. Built for sharing
one-off HTML pages (reports, demos, AI-generated artifacts) with friends and
family without going through GitHub Pages or Vercel.

## Features

- **Paste or upload** — drop an `.html` file at `/`, or paste raw HTML at `/paste`.
- **Random short slugs** — URLs like `/p/quick-apple-42`.
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

## API

### Upload

```bash
curl -F file=@page.html http://localhost:3000/api/paste
# => {"id":"abc123","url":"http://localhost:3000/p/abc123"}
```

```bash
curl -H 'Content-Type: application/json' \
  -d '{"html":"<h1>hi</h1>","expiry":"24h"}' \
  http://localhost:3000/api/paste
```

### List / delete (admin)

```bash
curl -H "Authorization: Bearer $PAGEBIN_ADMIN_TOKEN" http://localhost:3000/api/admin/pastes
curl -X DELETE -H "Authorization: Bearer $PAGEBIN_ADMIN_TOKEN" \
  http://localhost:3000/api/admin/pastes/abc123
```

## Architecture

- **Next.js 14** App Router — one app, server-rendered pages.
- **better-sqlite3** — single SQLite file in `PAGEBIN_DATA_DIR/pagebin.db`.
- **No external services** — no Redis, no S3. Suitable for `docker compose`
  or Coolify deployments.

## Roadmap

| Phase | Feature                                  | Status   |
|-------|------------------------------------------|----------|
| 1     | Core: HTML paste/upload → random URL     | ✅ MVP   |
| 2     | Expiry (1h / 24h / 1w / never)           | ✅ MVP   |
| 3     | Markdown paste + render                  | planned  |
| 4     | Password protection + shareable unlock   | planned  |
| 5     | Static-site zip upload (multi-file)      | planned  |
| 6     | Visit stats (count, last accessed)       | planned  |
| 7     | Rate limit + admin dashboard UI          | planned  |

## License

MIT
