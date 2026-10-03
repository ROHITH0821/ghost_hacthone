# Ghost

Ghost audits accessible website content, simulates customer journeys, and produces prioritized findings and draft fixes. Business owners can track implementation and compare later audits; agencies can organize clients and brand PDF reports. Scores and shopper perspectives are diagnostic AI outputs, not measured conversion or revenue data.

## Stack and architecture

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, TanStack Query, Prisma/PostgreSQL, Anthropic structured outputs, Tavily, Playwright, Resend and Supabase Storage.

- `src/app`: public/auth pages, protected workspace, mission/report pages, API handlers and cron recovery.
- `src/components`: shared primitives, landing, dashboard, mission and report UI.
- `src/lib/ghost-engine`: crawl → context synthesis → flows → simulated journeys → aggregation → fixes → deterministic scoring. `prompts.ts` owns stable behavior and bounded evidence composition.
- `src/lib/competitor-intelligence`: candidate search/ranking, evidence extraction, theme scoring and market gaps.
- `src/lib/db`: ownership-scoped persistence, entitlements, agency/client and fix workflow.
- `src/lib/report`: PDF rendering, storage and report delivery.

## Local setup

Use Node 22 and an isolated development PostgreSQL database.

```sh
npm install
cp .env.example .env
# Configure database, auth, Resend, Anthropic and storage values.
npm run db:push
npx playwright install chromium
npm run dev
```

`db:push` changes the configured database schema; point it at a development database. `DATABASE_URL` is the runtime pooled PostgreSQL connection; `DIRECT_URL` is the direct schema connection. The backend is live, not mocked. Starting an audit can incur model/search costs and trigger report delivery.

Resend requires an API key and verified sender. `/login` uses a six-digit email code. New accounts are pending until their `User.accessStatus` is approved; pending users see `/early-access`. Approval is an operational action, not a client-side bypass. The submitted website is preserved through sign-in and approval, then reviewed in audit setup.

Approved users currently have early-access deep audit access while payments are offline. Purchase/subscription endpoints are development-only. Existing plan entitlements, quotas and report access remain enforced on the server.

`NEXT_PUBLIC_APP_URL` and `CRON_SECRET` configure background run/finalize triggers. `vercel.json` contains mission and finalize recovery schedules. See `.env.example` for optional crawl, model, search and PDF settings. `GHOST_SWARM_CONCURRENCY` defaults to 6 and is capped at 12.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The deterministic suite covers prompt composition, evidence separation, owner context, schema and aggregation invariants, missing simulations, report access adaptation, competitor evidence/ranking, URL/redirect handling, contrast, and the audit pipeline with a mocked model transport. It does not establish real-model accuracy.

For browser QA, start a local dev server on port 3010, then run:

```sh
npm run dev -- --hostname 127.0.0.1 --port 3010
# In a second terminal:
node scripts/ui-review.mjs
```

The review mounts the real client components with synthetic data in a temporary route, intercepts all browser API requests, and removes the route in `finally`. No authentication bypass is shipped and no real account, email or audit is used. It refuses to overwrite an existing fixture route. Screenshots go to `/tmp/ghost-ui-review`. If the process is forcibly terminated, remove its `src/app/qa-review-temp` directory before building. Fixture navigation retains the default Overview shell heading; real route titles are pathname-driven.

The [product audit and design decisions](docs/product-redesign.md) document the research, scope, prompt map, verification and release risks. Before deploying, validate real audit quality and review crawler network isolation, confidential PDF storage access, early-access policy and payment readiness.

After `npm run build`, start `npm run start -- --hostname 127.0.0.1 --port 3010`
and run `node scripts/production-smoke.mjs` for read-only public rendering and
unauthenticated access checks against the production bundle.
