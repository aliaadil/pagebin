# Pagebin: next-feature scope

Status: proposed scope for follow-up implementation.

## Evidence and scope boundary

The original request and project records identify the following requested capabilities:

- API-friendly posting to a generated share URL.
- Non-guessable, hash-like URL slugs.
- Optional password protection with a password prompt.
- Private-by-link behavior: prevent search-engine crawling/indexing.
- A clever pagebin logo/icon set and a livelier interface.
- Remove pastebin naming references.

The repository already contains a Phase 2 UI overhaul (drag/drop, tabs, animations, persisted dark mode) and public-origin URL handling. Separate Kanban tasks cover the naming audit and brand assets. No additional feature list was found in the scribe-owned Obsidian notes; the task history is the authoritative prior discussion available here.

## Recommendations

| Candidate | User value | Rough UX | Technical approach | Dependencies | Recommendation |
| --- | --- | --- | --- | --- | --- |
| API posting | Create pages from scripts and automation without using the UI. | Document `POST` to a stable API endpoint with content, optional expiry, and protection fields; return the canonical public URL and identifier as JSON. Show a copyable curl example in the README. | Extend the existing paste API with explicit request validation, bounded body size, content-type handling, and the same storage/expiry path as the UI. Return consistent 2xx/4xx JSON and avoid exposing internal storage details. | Existing storage model, origin resolver, and expiry validation. Authentication/rate limiting should be decided before exposing this beyond trusted/private use. | **include** |
| Hash-like slugs | Reduce accidental discovery by guessing another page name. | New pages receive an opaque, URL-safe identifier; shared links continue to be copied/displayed as today. Existing links remain readable. | Replace human/random-word generation with cryptographically secure random bytes encoded using a URL-safe alphabet (or retain the current random generator only if its entropy is demonstrated). Add collision retry and tests. Do not rename existing records in place. | Existing `/p/[id]` route, database lookup, and API response contract. | **include** |
| Password protection | Let a link owner restrict a page to people who know a secret. | Creation form has an optional password control. A protected link shows a focused password prompt; a correct password unlocks content, while failures do not reveal whether content exists. | Store a slow password hash, never plaintext. Mark records protected, verify server-side, and issue a short-lived, scoped access cookie/session after success. Return generic errors and avoid logging secrets. Define reset/removal behavior before release. | Storage schema migration, secure cookie configuration, expiry behavior, and abuse/rate-limit policy. | **include** |
| No search indexing/crawling | Keep pages private-by-link rather than discoverable via search. | No user-facing flow change; `robots.txt` disallows all paths and page responses emit `noindex, nofollow, noarchive` (including protected and error-sensitive routes). | Add `public/robots.txt` (or framework metadata route) with `User-agent: *` and `Disallow: /`; add response metadata headers/tags consistently. Treat this as defense-in-depth, not access control. | Deployment must serve robots at site root; verify proxy/CDN does not strip headers. | **include** |
| Brand logo and icon set | Make pagebin recognizable and make the product feel intentional. | Use the page/page-corner motif across wordmark, square mark, favicon, and social image; wire assets into layout metadata. | Add SVG lockups plus generated raster/favicon variants under `/assets/brand/`, then reference them from layout and static metadata. | Brand-asset task `t_f731ffcd`; design approval for final mark. | **defer** (separate task) |
| Livelier UI | Make creation and reading feel responsive and polished. | Retain drag/drop, tabs, animations, and dark-mode controls from Phase 2; only add UX needed by the included API/password flows. | Avoid another broad visual rewrite. Add focused states for API/password errors and loading/success feedback. | Existing Phase 2 implementation; accessibility review. | **defer** (Phase 2 already shipped) |
| Naming cleanup | Ensure the product is called pagebin everywhere. | Users should never see the old name in navigation, errors, docs, metadata, or package naming. | Use the dedicated repository-wide audit/rename task; preserve historical changelog context where needed. | Rename task `t_2b5cf847`; compatibility review for package/env/database identifiers. | **defer** (separate task) |

## Delivery order

1. **Hash-like slugs**: establish the identifier contract and backwards-compatible lookup before adding new creation paths.

2. **No-index controls**: ship immediately with the privacy-sensitive product surface; verify root robots delivery and representative page headers.

3. **Password protection**: add the schema migration, server verification, scoped access cookie, and prompt UI; test wrong-password, expiry, and protected-content cache behavior.

4. **API posting**: expose the stable contract after storage and protection fields exist, with body-size limits and a documented curl request. Reassess authentication and rate limiting before any public deployment.

## Open decisions

1. What authentication/rate limit policy should protect the posting API (shared secret, per-user token, or intentionally trusted/private deployment)?

2. Should password protection support removing/changing a password after creation, or only setting it once?

3. What maximum content size and expiry bounds should the API expose, and should API-created pages default to a shorter lifetime?


These decisions should be confirmed before implementation of the corresponding included items. The recommendations above are intentionally limited to capabilities evidenced by the original request and project history; no other “previously discussed” features are assumed.
