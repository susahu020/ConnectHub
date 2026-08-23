# ---- Build stage -----------------------------------------------------
# Compiles TypeScript and generates the Prisma client with full
# devDependencies available (ts-node, typescript, @types/*, prisma CLI).
FROM node:20-alpine AS build


# now:
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate
RUN npm run build

# ---- Runtime stage -----------------------------------------------------
# Note: this still installs full dependencies (not --omit=dev) because
# `npm run seed` runs prisma/seed.ts via ts-node at container startup —
# stripping devDependencies here would break seeding. The multi-stage
# split still buys a cleaner build/runtime separation and, more
# importantly, lets the process run as a non-root user rather than root.
FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl python3 make g++ su-exec

# Run as a dedicated non-root user rather than root, standard container
# hardening practice — limits blast radius if the process is compromised.
# NOTE: intentionally NOT switching to this user with `USER connecthub`
# here. The container starts as root so docker-entrypoint.sh can chown the
# uploads volume (docker-compose.yml mounts a named volume over
# /app/uploads for persistence — that volume arrives owned by root
# regardless of this image's baked-in ownership, since the mount happens
# after the image is built) — the entrypoint itself drops to this user via
# su-exec immediately after, so the actual Node process still never runs
# as root. See docker-entrypoint.sh's top comment for the full story.
RUN addgroup -S connecthub && adduser -S connecthub -G connecthub

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && \
    mkdir -p /app/uploads && \
    chown -R connecthub:connecthub /app

EXPOSE 5000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
