# Production Readiness — Changes Made & What's Left

This document is the honest record of a code-level review and fix pass on
ConnectHub. Read the "What I could NOT verify" section before deploying —
it matters as much as the fixes below.

## 🔴 Fixed: leaked credentials

`backend/.env` and `backend/.env.example` had **real, working credentials**
committed to git: a personal Gmail address + app password (SMTP), a real
Google OAuth client ID/secret, and the live JWT signing secrets. A
hardcoded fallback to the same personal Gmail address also existed in
`auth.controller.ts` (`sendContactMessage`).

Done:
- Replaced all real values with placeholders in `.env.example`.
- Replaced `backend/.env` with placeholders + freshly generated JWT secrets
  (safe for local dev only — see below).
- Removed the hardcoded email fallback; the contact form now fails closed
  with a clear error if no support email is configured, instead of
  silently emailing a stranger's personal Gmail.
- Ran `git rm --cached` on both `.env` files so they stop being tracked
  going forward (`.gitignore` already excluded them, but that doesn't
  retroactively untrack a file already committed).

**You still must do this yourself — I have no way to do it for you:**
1. **Revoke the Gmail app password** that was exposed (Google Account →
   Security → App passwords).
2. **Revoke/rotate the Google OAuth client secret** (Google Cloud Console →
   APIs & Services → Credentials) and issue a new client ID/secret if you
   want Google SSO.
3. **Scrub git history.** Untracking only stops *future* commits from
   including the file — the old secrets are still sitting in every prior
   commit anyone has already cloned. Use `git filter-repo` (or BFG Repo-
   Cleaner) to purge `backend/.env` and `frontend/.env` from all history,
   then force-push and have every collaborator re-clone. I didn't do this
   here because it rewrites commit hashes and requires coordinating with
   your team/remote — not something to do silently on your behalf.
4. Put real production secrets in your platform's secret manager (not a
   committed file) and never reuse the rotated dev values above in prod.

## 🔴 Fixed: silent local-disk fallback for file storage

`backend/src/config/validateEnv.ts` (the existing startup security check)
now also hard-fails server boot in production if `CLOUDINARY_CLOUD_NAME` /
`CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` aren't all set, the same way
it already did for weak JWT secrets. Previously this was a silent fallback
to local disk — fine for dev, but a real deployment would lose every
uploaded file on the next restart/redeploy, or have files invisible to
other instances behind a load balancer.

**You still must do:** create a Cloudinary account (or swap in your
preferred object storage — S3, GCS, etc., which would need a small change
to `config/cloudinary.ts` and `file.controller.ts`) and set those three
env vars in production.

## 🟠 Fixed: auth endpoints only had a shared 100 req/min global limit

Added a dedicated, stricter `authRateLimiter` (10 requests / 15 minutes per
IP) and applied it to `/auth/register`, `/auth/login`, `/auth/forgot-password`,
`/auth/reset-password`, and `/auth/contact` — on top of the account-level
lockout that already existed for login. See `backend/src/middleware/rateLimiter.ts`.

## 🟠 Fixed: no server-side page gating on the frontend

Added `frontend/src/middleware.ts`. This is explicitly a **UX / defense-in-
depth layer, not the security boundary** — the real authorization boundary
remains the backend's `authenticate`/`authorize`/`checkPermission`
middleware, which independently re-checks every request. What this closes:
an unauthenticated visitor no longer briefly sees the dashboard shell (and
fires off doomed API calls) before a client-side redirect kicks in, and a
signed-in user hitting `/login` gets bounced to `/dashboard` immediately.

It reads a new non-secret `ch_session` cookie (auth flag + role only, set/
cleared in `lib/store.ts` alongside the existing localStorage token) — the
actual bearer token never leaves localStorage and is never sent to this
middleware. **I did not duplicate role-specific gating (e.g. admin-only)
into this middleware** — the admin page's client-side check plus the
backend's independent ADMIN-only enforcement already cover it, and a
second, subtly different role list here would just be one more place for
the two to drift out of sync.

## 🟠 Added: regression tests for the RBAC privilege-escalation fix

Your working tree already contained an uncommitted fix (visible in
`git diff` before I touched anything) closing a real bug: `authorize()`
used to also accept a `CustomRole`'s *name* as a fallback, so an EMPLOYEE
assigned a custom role literally named "Admin" could pass admin-only route
checks without ever holding the real ADMIN enum role. That fix was already
in your code — I did not need to make it — but there was no test locking
it in place, so a future edit could silently reintroduce it.

Added:
- `backend/src/middleware/__tests__/role.middleware.test.ts` — covers the
  401/403/200 paths and specifically pins the "custom role name can't
  widen access" behavior.
- `backend/src/middleware/__tests__/rbac.middleware.test.ts` — covers the
  `checkPermission` middleware wrapper (401 / 403 with module-specific
  message / error passthrough), which had no direct test before (only the
  underlying `hasPermission` service function did).

## What I could NOT verify — read this before deploying

I do not have network access or a running Postgres/Redis/Node environment
in this sandbox, so I could not run `npm install`, `npm run typecheck`,
`npm test`, `npm run build`, or actually boot the app and click through it
with the three seeded accounts. What I *did* do instead:
- Full static read-through of the auth, RBAC, session, rate-limiting, and
  storage code paths.
- Syntax-checked every file I created or edited with a standalone `tsc`
  pass (only missing-type-declaration noise remained, e.g. `@types/node`/
  `@types/jest` not being installed here — no actual syntax errors).
- Grepped the entire tree for the specific leaked credential strings to
  confirm zero remaining occurrences.

**Before this goes live, please actually run:**
```bash
cd backend && npm install && npm run typecheck && npm test && npm run build
cd ../frontend && npm install && npm run build
```
and do one manual pass logging in as `admin@connecthub.com`,
`manager@connecthub.com`, and `employee@connecthub.com` (seeded, password
`password123` — **change or remove these seeded accounts before real
production use**) to confirm the middleware/rate-limiter changes don't
regress any flow. Your existing CI workflow (`.github/workflows/ci.yml`)
already runs typecheck/test/build on every push — make sure it's green on
this branch before merging.

## Still open (not addressed in this pass — flagged for prioritization)

- **No Prisma migration history exists yet** (`backend/prisma/migrations/`
  doesn't exist — confirmed via `backend/README-MIGRATIONS.md`, which
  already documents this exact gap and the one-time fix). Right now
  `docker-entrypoint.sh` falls back to `prisma db push --accept-data-loss`
  on every boot, which has no rollback path and will silently drop data on
  a future narrowing schema change. I could not generate the baseline
  migration myself — it requires a live database connection and the
  ability to download the Prisma engine binary, neither of which this
  sandbox has. **Before production, run this once against a real
  (non-production) database:**
  ```bash
  cd backend && npx prisma migrate dev --name init
  ```
  then commit the generated `prisma/migrations/` folder. This is
  especially relevant now since the schema picked up new `isSuspended`/
  `isActive` fields on `User` in this pass's changes.
- Backend test coverage is still thin outside of RBAC/permissions (no
  integration tests for chat, tasks, files, HR/payroll flows). Worth
  budgeting for before this holds real HR/payroll data at scale.
- No frontend automated tests at all.
- Consider a per-account (not just per-IP) rate limit dimension for login,
  since the current `authRateLimiter` is IP-keyed and a distributed
  attempt from many IPs against one account still relies solely on the
  existing account lockout.
