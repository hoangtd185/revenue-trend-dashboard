# ADR 0002: Same-origin API proxy and httpOnly cookie sessions

## Status
Accepted — 2026-10-20

## Context
The Next.js app (port 3000) and the Express API (port 4000) run as separate processes. Admin pages need authenticated API calls; the public page must always show the latest data.

## Decision
- `next.config.mjs` rewrites `/api/*` to the API, so the browser only ever talks to its own origin.
- Login returns a JWT that the API also sets as an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production). JavaScript never reads it.
- `middleware.ts` redirects `/admin/*` to login when the cookie is missing (a UX gate only); the API verifies the JWT on every admin request (the real check).
- The public page is a server component that fetches with `cache: 'no-store'`, and the client calls `router.refresh()` on focus/every 30 s.

## Alternatives considered
- **Token in `localStorage` + CORS** – simpler server, but any XSS can steal the token, and cross-origin cookies/CORS add setup for reviewers.
- **NextAuth** – more than needed for a single seeded admin account.

## Consequences
- No CORS configuration is needed in normal use; `CORS_ORIGIN` exists only for direct browser→API calls.
- The login brute-force limit is in-memory, so it only works for a single API process (fine here; would move to Redis when scaled out).
