#!/bin/sh
# ConnectHub backend entrypoint â€” chooses the safest available database
# sync strategy on every container start.
#
# Why this exists: `prisma db push --accept-data-loss` is fine for local
# development, but running it unconditionally on every production restart
# is dangerous â€” a future schema change that narrows or drops a column
# would silently destroy production data with no confirmation prompt, and
# there's no rollback path since db push keeps no migration history.
#
# This script prefers `prisma migrate deploy` (safe, versioned, no data
# loss, requires a committed prisma/migrations directory) and only falls
# back to `db push` when no migrations exist yet â€” e.g. on a fresh clone
# before anyone has run the one-time `prisma migrate dev --name init`
# step. See backend/README-MIGRATIONS.md for that one-time setup.

set -e

if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "âœ… Found prisma/migrations â€” applying versioned migrations with 'prisma migrate deploy'."
  npx prisma migrate deploy
else
  if [ "$NODE_ENV" = "production" ]; then
    echo "ðŸ”´ WARNING: No prisma/migrations directory found, but NODE_ENV=production."
    echo "   Falling back to 'prisma db push --accept-data-loss' for this boot, but this"
    echo "   is NOT safe for an ongoing production database â€” a future schema change"
    echo "   could silently drop data. Generate a baseline migration ASAP:"
    echo "     npx prisma migrate dev --name init   (run against a dev DB, then commit"
    echo "     the generated prisma/migrations/ folder)."
  else
    echo "â„¹ï¸  No prisma/migrations found â€” using 'prisma db push' for local development."
  fi
  npx prisma db push --accept-data-loss
fi

npm run seed
exec npm start
