# syntax=docker/dockerfile:1.7
# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev

# ---- build ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install
COPY tsconfig.json next.config.mjs next-env.d.ts src ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PAGEBIN_DATA_DIR=/data
# IMPORTANT (Coolify / reverse-proxy deployments):
# Set PAGEBIN_PUBLIC_URL to the public origin your users will hit, e.g.
#   ENV PAGEBIN_PUBLIC_URL=https://pagebin.example.com
# Without it, share URLs fall back to x-forwarded-host / x-forwarded-proto
# (if your proxy forwards them) or to http://localhost:3000 in dev.
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
RUN groupadd --gid 1001 pagebin && useradd --uid 1001 --gid pagebin --shell /bin/sh --create-home pagebin

COPY --from=builder --chown=pagebin:pagebin /app/.next ./.next
COPY --from=builder --chown=pagebin:pagebin /app/node_modules ./node_modules
COPY --from=builder --chown=pagebin:pagebin /app/public ./public
COPY --from=builder --chown=pagebin:pagebin /app/package.json ./package.json

# Persistent storage for the SQLite DB and uploaded HTML
RUN mkdir -p /data && chown -R pagebin:pagebin /data
VOLUME /data
USER pagebin
EXPOSE 3000

# Lightweight healthcheck using node so we don't need curl/wget
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start"]
