# Pagebin: deferred features

This doc tracks items deferred from the [features-next.md](./features-next.md)
scope. They are explicitly NOT in the current implementation PR — each one
already has a dedicated Kanban task or is already shipped under a separate
PR. This file is here so the next scoping pass can confirm none have been
silently lost.

## Status (as of August 2026)

| Deferred item           | Reason                                  | Status / next-step pointer |
|-------------------------|-----------------------------------------|----------------------------|
| Brand logo + icon set   | Needs final design sign-off             | Shipped in `feat/t_f731ffcd-pagebin-brand-assets` (PR merged into `feat/initial-scaffold`). |
| Naming cleanup          | Repo-wide rename, preserve changelog    | Shipped in `refactor/t_2b5cf847-pastebin-to-pagebin` (PR #4, merged 2026-08-01). |
| Livelier UI overhaul    | Already covered by Phase 2              | Phase 2 (`feat/t_f3659220-phase-2-url-and-ui`) shipped drag-anywhere drop, animations, dark mode. PR #2 merged. |

No items are currently open or unowned.

## What "include" covered (already in this PR)

1. Hash-like, CSPRNG-sampled paste ids (replaces adjective-noun-NN slugs).
2. `robots.txt` Disallow: / + `X-Robots-Tag: noindex, nofollow, noarchive, noimageindex` on every paste-serving and API response.
3. Optional password protection at upload time, with a server-rendered prompt and a scoped HMAC-signed unlock cookie.
4. Stable, documented `POST /api/paste` contract — form + JSON, with `id`/`url`/`path`/`expiry`/`bytes`/`protected` in the response.

## Next scoping pass

If/when a fresh features-next doc is written, consider:

- Authentication / rate-limiting for the public `POST /api/paste` (currently trusted-private deployment only).
- Removing or rotating a password on an existing paste (currently settable once at creation).
- Multi-file static site upload (zip → unpacked site with relative asset paths).

These came up during the scoping discussion but were out of scope for the
current PR.