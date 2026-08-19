#!/bin/sh
# ConnectHub backend entrypoint - chooses the safest available database
# sync strategy on every container start, and makes sure the mounted
# uploads volume is actually writable by the user the app runs as.
#
# Why the uploads-ownership fix exists: the Dockerfile's build-time
# `chown -R connecthub:connecthub /app` only affects files baked into the
# image layer. docker-compose.yml mounts a *named volume* over /app/uploads
# for persistence across restarts/redeploys, and Docker creates a fresh
# named volume owned by root — that mount happens after the image is built,
# so it overwrites whatever ownership the image had for that path. The
# container previously ran as the non-root `connecthub` user from the very
# start (via the Dockerfile's `USER connecthub`), so by the time this
# script ran it had no privileges left to fix a root-owned mount — hence
# uploads (avatars, files, the organization logo/favicon) failing with
# EACCES: permission denied. Fixed by having the Dockerfile leave the
# container as root, chown-ing the mounted volume here while we still can,
# and only then dropping to the unprivileged `connecthub` user (via
# su-exec) for the rest of this script and the actual Node process.
#
# Why the migration logic exists: `prisma db push --accept-data-loss` is
# fine for local development, but running it unconditionally on every
# production restart is dangerous - a future schema change that narrows or
# drops a column would silently destroy production data with no
# confirmation prompt, and there's no rollback path since db push keeps no
# migration history.
#
# This script prefers `prisma migrate deploy` (safe, versioned, no data
# loss, requires a committed prisma/migrations directory) and only falls
# back to `db push` when no migrations exist yet - e.g. on a fresh clone
# before anyone has run the one-time `prisma migrate dev --name init`
# step. See backend/README-MIGRATIONS.md for that one-time setup.

set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/uploads
  chown -R connecthub:connecthub /app/uploads
fi

run_as_app_user() {
  if [ "$(id -u)" = "0" ]; then
    su-exec connecthub:connecthub "$@"
  else
    # Already non-root (e.g. someone removed the volume mount, or this ran
    # outside Docker) - nothing to drop, just run it directly.
    "$@"
  fi
}

if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "Found prisma/migrations - applying versioned migrations with 'prisma migrate deploy'."
  run_as_app_user npx prisma migrate deploy
else
  if [ "$NODE_ENV" = "production" ]; then
    echo "WARNING: No prisma/migrations directory found, but NODE_ENV=production."
    echo "   Falling back to 'prisma db push --accept-data-loss' for this boot, but this"
    echo "   is NOT safe for an ongoing production database - a future schema change"
    echo "   could silently drop data. Generate a baseline migration ASAP:"
    echo "     npx prisma migrate dev --name init   (run against a dev DB, then commit"
    echo "     the generated prisma/migrations/ folder)."
  else
    echo "No prisma/migrations found - using 'prisma db push' for local development."
  fi
  run_as_app_user npx prisma db push --accept-data-loss
fi

run_as_app_user npm run seed

if [ "$(id -u)" = "0" ]; then
  exec su-exec connecthub:connecthub npm start
else
  exec npm start
fi