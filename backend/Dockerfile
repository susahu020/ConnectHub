# ---- deps: install all deps (incl. dev) needed to build ----
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --legacy-peer-deps

# ---- build: compile TypeScript + generate Prisma client ----
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- prod-deps: install ONLY production deps ----
FROM node:20-alpine AS prod-deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev --legacy-peer-deps
RUN npx prisma generate

# ---- runtime: minimal image, non-root user ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# Non-root user (alpine's default 'node' user/group already exist)
RUN mkdir -p /app/uploads && chown -R node:node /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package*.json ./

USER node

EXPOSE 5000

CMD ["node", "dist/index.js"]
