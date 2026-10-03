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
COPY package.json package-lock.json ./
RUN npm ci

# Build: `npm run build` runs `prisma generate && next build`. Neither needs a
# live database, so no secrets are required at build time.
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Next respects the PORT env var; hosts inject it. Default to 3000.
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
