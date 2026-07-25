# Database Migrations

## Current state

This project currently has **no versioned migrations** (`prisma/migrations/`
doesn't exist yet). On every container start, `docker-entrypoint.sh` falls
back to `prisma db push --accept-data-loss`, which syncs the database schema
to match `schema.prisma` directly — no history, no rollback path, and
`--accept-data-loss` means a future schema change that narrows or drops a
column will proceed **without asking**, silently discarding data in that
column.

This is fine for local development. **It is not safe to run against an
ongoing production database.**

## One-time setup: generate the baseline migration

Before deploying to production, run this once against a real (non-production)
database with connectivity — this sandbox/CI environment can't do it because
it has no database connection and can't reach `binaries.prisma.sh` to
download the Prisma engine:

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
1. Create `prisma/migrations/<timestamp>_init/migration.sql` from the
   current schema
2. Apply it to whatever `DATABASE_URL` you're pointed at
3. Mark it as applied in the `_prisma_migrations` tracking table

**Commit the generated `prisma/migrations/` folder to git.** It's currently
gitignored-safe to commit (it contains no secrets — just SQL DDL statements).

## After that

Once `prisma/migrations/` exists and is committed, `docker-entrypoint.sh`
automatically switches to the safe path: `prisma migrate deploy` instead of
`db push`. No further action needed — every future schema change just needs
its own `prisma migrate dev --name <description>` run locally, with the
resulting migration file committed alongside the code change.

## Making a schema change going forward

```bash
# 1. Edit backend/prisma/schema.prisma
# 2. Generate + apply the migration locally:
cd backend
npx prisma migrate dev --name add_some_field

# 3. Commit both the schema.prisma change AND the new
#    prisma/migrations/<timestamp>_add_some_field/ folder together.
# 4. Deploy as normal — docker-entrypoint.sh will run
#    `prisma migrate deploy` automatically on the next container start.
```
