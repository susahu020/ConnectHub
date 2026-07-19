# Deploying ConnectHub for testing on free-tier resources

Read `SECURITY_NOTICE.md` first if you haven't.

ConnectHub is 4 separate deployables in production (frontend, backend,
Postgres, Redis) instead of one `docker-compose` stack. Here's a free-tier
combination that gets you the closest to full functionality, and what
still won't be perfect.

## 1. Postgres — Supabase or Neon (free tier)

Your `docker-compose.yml`'s commented-out config already points at Supabase,
so that's the path of least resistance. Get the pooled connection string
from your project's Database settings and set it as `DATABASE_URL` on the
backend service. Run `npx prisma migrate deploy` once against it (the
backend's Docker image now does this automatically on boot — see the
Dockerfile changes below).

## 2. Redis — Upstash (free tier)

Render's free tier no longer offers managed Redis. Create a free Upstash
Redis database and set its connection string as `REDIS_URL` on the backend.
This is also what makes the new Socket.IO Redis adapter and the background
worker locks actually do something on a hosted deployment.

## 3. File storage — Cloudinary (free tier)

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` on
the backend. Without these, uploads fall back to local disk, and Render's
filesystem is ephemeral — every redeploy/restart wipes uploaded files. The
backend now logs a loud warning on startup if it's in production without
these set.

## 4. Email — Gmail app password or Resend/Brevo (free tier)

Set `SMTP_USER` / `SMTP_PASS` (and `SMTP_HOST`/`SMTP_PORT` if not using
Gmail). Without these, verification emails only get logged to the console —
new signups register but can never verify and get walled off from most of
the app (`USER_NOT_VERIFIED`, 403). A dedicated transactional provider
(Resend, Brevo) is more reliable for this than a personal Gmail account.

## 5. Backend — Render free web service

Set all the env vars above, plus:
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate real random values
  (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
  The app now refuses to start in production without these set (see
  `backend/src/config/env.ts`) instead of silently falling back to a
  hardcoded default.
- `FRONTEND_URL` — must exactly match your deployed frontend URL (used for
  CORS and the Socket.IO CORS origin).
- `NODE_ENV=production`

## 6. Frontend — Render free web service or Vercel

Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to your deployed
backend's URL. These are baked in at **build time** in Next.js, so if you
change them you need to trigger a rebuild, not just a restart. The updated
`frontend/Dockerfile` accepts them as build args if you're building the
image yourself rather than using Render's native Next.js build.

## What you can't fully avoid on a truly free tier

Render's free web services sleep after ~15 min idle and take 30–60s to
cold-start. That kills any open Socket.IO connections, so live chat,
presence, and meetings will look flaky after idle periods no matter how
correctly everything else is configured. The only real fix is an always-on
paid instance (Render's cheapest paid tier, or a small VPS). Worth knowing
going in rather than debugging it as if it were a config mistake.

## What changed in this round of fixes (so free-tier testing reflects them)

- `backend/src/config/env.ts` — JWT secrets now come from one place, and
  the app fails fast in production if they're missing instead of using a
  hardcoded default.
- `backend/src/services/socket.service.ts` — Socket.IO now uses a Redis
  adapter, so broadcasts work correctly if you ever run more than one
  backend instance. (In-memory presence Maps are still single-instance —
  see the comment in that file.)
- `backend/src/services/lock.service.ts` + `backend/src/index.ts` — the
  scheduled-message and due-date-reminder background loops are now
  wrapped in a Redis-based lock, so running 2+ backend instances won't
  double-send.
- `backend/Dockerfile` / `frontend/Dockerfile` — both are now multi-stage
  builds that run as a non-root user and don't ship devDependencies or
  source in the final image.
- `docker-compose.yml` — the backend's default command now runs
  `prisma migrate deploy` (safe, additive) instead of
  `prisma db push --accept-data-loss && seed` on every boot. That
  dev-only convenience now lives in `docker-compose.override.yml`, which
  `docker compose up` still applies automatically for local dev — nothing
  changes for your local workflow, but a bare `docker compose -f
  docker-compose.yml up` (closer to what you'd run against a real
  environment) is now safe.
- `backend/.env.example`, `frontend/.env.example` — sanitized templates
  for the env vars above.

## Remaining npm install step

`backend/package.json` now lists `@socket.io/redis-adapter` as a new
dependency, and moves `prisma` (the CLI) from `devDependencies` to
`dependencies` — it needs to be present in the production image for
`prisma migrate deploy` to run there (see the Dockerfile changes above).
`package-lock.json` wasn't regenerated (no network access in this
environment). Run `npm install` inside `backend/` once before your next
build/deploy so the lockfile picks up both changes.
