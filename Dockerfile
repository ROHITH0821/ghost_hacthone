# GHOST runs a persistent Node server (the audit runs as a background task and
# keeps state in memory) and uses Playwright/Chromium to crawl sites. That rules
# out serverless (Vercel functions) — deploy this container on a long-running
# host (Railway, Render, Fly.io, a VM, etc.).
#
# The Playwright base image ships Chromium + all system deps pinned to the same
# Playwright version, so no `playwright install` is needed.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

# Install deps (incl. dev deps — needed for `next build` + `prisma generate`).
# postinstall runs `prisma generate`, so the schema must exist before `npm ci`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Generate only reads these names; it does not connect. Real values come from
# the host at runtime. A declared ARG lets Railway override the placeholder.
ARG DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres
ARG DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres
RUN DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" npm ci

# Build: `npm run build` runs `prisma generate && next build`. Neither needs a
# live database, so no secrets are required at build time.
COPY . .
RUN DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" npm run build

ENV NODE_ENV=production
# Next respects the PORT env var; hosts inject it. Default to 3000.
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
