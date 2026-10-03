# Ghost product audit and redesign

## Repository analysis (before implementation)

Ghost is a website conversion-audit workspace for small-business owners, marketers,
and agencies. Its value is turning public website evidence into prioritized fixes.
The customer journey is landing → email OTP → manual early-access approval → audit
setup → live progress → report → fix tracking → verification / market comparison.

The repository contains a Next.js App Router application (installed Next 15.5.20),
React 19, Tailwind 4, Framer Motion, Lucide, TanStack Query, Prisma/PostgreSQL,
Anthropic structured outputs, Tavily search, Resend, and Supabase Storage. There is
no separate backend: route handlers schedule audit and finalize invocations, with
cron recovery. JWT cookies and mission ownership checks protect app routes and
reports. Dashboard lists use query caching, prefetch, filters and narrow selects.
PDFs have a separate print stylesheet and server Chromium rendering. The README's
SQLite and mock-backend descriptions are stale. No automated test suite is wired.
Baseline typecheck passes; lint has five hook-dependency warnings.

Reviewed route families: public landing/login/early-access; overview, sites, audits,
fixes, comparisons, clients/client detail, branding, plan and settings; profile
redirect; mission and results. Reviewed shared UI, all component export/import
structure, API authorization/validation, Prisma models, auth/session/OTP, access
and pricing, audit config snapshots, crawling, scoring, competitor evidence,
report export, background execution, environment example and existing docs.
No applicable AGENTS.md was found. Existing uncommitted auth/crawl/config/copy
changes are retained. Secrets and production data are not used for test fixtures.

## Main findings

- Oversized GHOST hero and >10 animated sections hide the actual output and value.
- Unsupported customer counts, timing guarantees, social-profile support, team
  sharing and bulk-queue claims damage trust. Footer contacts are placeholders.
- Pricing promises full reports for all plans despite a free teaser contract.
  Purchases are dev-only; approved early-access users receive deep audit access.
- Near-black glass surfaces, low-contrast muted text, violet/blue gradients,
  parallax headings, watermark and repeated card frames compete with the work.
- Dashboard repeats empty sections and implies “all clear” before any audit.
- Mobile audit rows lack report/progress links. Sidebar collapsed logo overflows;
  disabled notifications and “Soon” comparison navigation are misleading.
- Setup modal lacks focus containment, Escape, dialog semantics and step names.
- Preferences are transient switches; archive status ignores failed responses;
  fix updates fail silently; report fetching has an unhandled rejection path.
- Owner setup goals/audience are stored but not passed to the audit model.
- Simulated shoppers are described as real visitors; the adapter invents drop-off
  percentages from severity, and aggregation prompts invent monthly revenue.
- Website evidence is elevated into the swarm SYSTEM prefix. Ten LLM call sites
  have no shared reliability contract. The default swarm pool is unbounded.
- Competitor ranking can reintroduce candidates the model explicitly rejected.

## Implementation plan

1. Keep routing, schema, access and pricing logic. Introduce restrained charcoal,
   sea-glass teal, warm-white type, semantic status colors and shared UI states.
2. Rebuild landing around outcome → example → method → plans → agency → FAQ.
   Use a compact, clearly fictional report preview and a labeled URL form.
3. Apply shared surfaces/typography to all routes; simplify shell/navigation;
   add meaningful onboarding, focus-safe dialogs, persistent preferences and
   responsive report/actions. Put findings and fixes before secondary detail.
4. Establish a versioned Ghost behavior contract plus stage-specific instructions.
   Keep all crawl/persona/owner information in bounded user data, preserve cached
   shared context, pass owner goals, and enforce numeric/report invariants in code.
5. Add deterministic behavioral tests with mocked transport, access/URL regression
   tests, build/typecheck/lint, then desktop/laptop/tablet/mobile browser checks.
   Use isolated fixtures for authenticated UI and never alter a production account.

## Research and design decisions

- [Linear's March 2026 refresh](https://linear.app/now/behind-the-latest-design-refresh)
  supports recessive navigation and predictable action placement. Ghost uses
  compact navigation and makes the next audit/fix action prominent.
- [Vercel Geist colors](https://vercel.com/geist/colors) separates background,
  border and text roles. Ghost adopts semantic roles rather than decoration.
- [Raycast](https://www.raycast.com/) and [Notion AI](https://www.notion.com/product/ai)
  demonstrate explaining useful tasks with product examples. Ghost shows the
  finding, evidence and recommended action before asking visitors to sign in.
- [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  sets 4.5:1 for ordinary text and 3:1 for large text. Our base text tokens and CTA
  pairs are tested; focus rings, labels and status text supplement color.
- Palette: charcoal #101716, raised #1C2926, primary sea-glass #78DEC5,
  warm-white #F2F5F0, muted #A0B1AB, secondary blue #9CBDF0. Teal is a restrained
  brand choice suited to constructive diagnosis, not a scientific claim that a
  hue intrinsically creates trust or intelligence. Warm neutrals reduce the
  clinical feel; red/amber/green are reserved for severity and status.
- Inter body with Space Grotesk headings is retained; readable scale, tabular
  metrics, 4px spacing steps, 8px controls, 12px panels, 16px dialogs, 44px touch
  targets. Flat surfaces replace glass, blooms and animated gradient text.
- [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
  favors small, relevant context. [Prompting guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
  motivates explicit task boundaries and structured data. [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
  supports repeated prefixes; caching is an optimization, not guaranteed at small
  input sizes. Prompt delimiters help interpretation; they are not a security boundary.

## Risks and release decisions

Payment activation, early-access approval, real social proof, legal terms/privacy,
storage privacy and crawler network isolation require explicit operational review.
No payment provider is added, no migrations are run, and no live emails are sent.
The crawler's root-only DNS guard is not comprehensive redirect/subresource/DNS
rebinding protection; deployment needs outbound network isolation. Public Supabase
report objects also need an access-control decision before confidential client use.
LLM evaluations without a live model validate composition/contracts and guards,
not real-world accuracy. A representative live audit set is a release gate.

## Prompt map and reliability changes

All ten structured model calls share `ghost-engine/prompts.ts`:

| Stage / module | Dynamic evidence | Output guard |
| --- | --- | --- |
| Ingest `buildContextPack` | Ranked crawl excerpts and available screenshots | Supplied URLs only; retain omitted-page stubs |
| `flows` | Bounded context and owner goals | Zod flow schema, canonical flow/archetype normalization |
| `swarm` | Shared context prefix, one flow/persona per call | Canonical IDs, bounded concurrency, partial failure handling |
| `aggregate` | Flows and completed model journeys | Exact source complaints, valid affected counts, deterministic funnel/ranks, unavailable revenue sentinel |
| `fixes` | Context, owner goals and one ranked finding | Correct leak ID and variant count; owner-confirmation placeholders |
| Competitor `search` | Target business/search evidence | Structured query output |
| Competitor `rank` | Candidate descriptions and target context | Rejected candidates stay excluded; null output fails clearly |
| `extract-features` | Bounded supplied competitor pages | Evidence URLs must be in the supplied page set |
| `score-themes` | Page text and theme definitions | Unsupported quotations/URLs become not observed |
| `gap-analysis` | Target/competitor feature evidence | Structured gap schema and shared uncertainty rules |

Stable instructions define the auditor's actual capabilities and evidence priority.
Owner notes, websites, persona descriptions and upstream output stay in user evidence,
never SYSTEM. The main shared context is bounded to approximately 42,000 characters,
with excerpt/omission metadata; owner fields are whitelisted and capped. Context
synthesis uses at most 24 ranked pages and preserves remaining page identities.
Stage token budgets and model overrides remain configurable. Shared context can be
cached across same-stage calls; dynamic persona/task data follows the cache point.
The client has a 60-second transport timeout and two retries; swarm concurrency is
6 by default (maximum 12). Missing model journeys are excluded from scoring and
reported as incomplete coverage. This is a polling pipeline; there is no chat history,
interactive LLM tool execution, or token-streaming conversation to redesign.

## Implemented experience

- Landing now explains the audit outcome, shows an interactive fictional report,
  then explains workflow, access/plans, agency use and FAQ. Unsupported social proof
  and instant-result claims are removed from the rendered experience.
- Shared buttons, cards, headings, input states, status colors, errors and loading
  skeletons connect landing, auth, workspace, mission and report pages. Print exports
  use a darker teal for legibility on white paper; existing agency colors are preserved.
- Overview prioritizes the next useful action; first-time workspaces show setup steps.
  Mobile filters collapse so reports/fixes appear first, tables become actionable
  cards, and mission columns shrink safely. The modal names each setup step and
  contains keyboard focus, restores the trigger, handles Escape and blocks busy dismissal.
- Preferences persist in this browser. Failed archive/status/copy requests show
  recovery feedback and do not pretend to succeed. A truncated fix is never silently
  copied as if complete. Report fetches have retry and missing-page/error screens.
- Reports identify simulated evidence, prioritize findings and fixes, remove fabricated
  drop-off percentages, and keep unknown draft facts explicit for review.

## Verification protocol

`npm test` checks model composition and contracts with a mocked Anthropic transport;
no real model call, email, production mutation or schema migration is part of verification.
`node scripts/ui-review.mjs` mounts real client components in a temporary fixture route,
intercepts every browser API request, and fails on unmapped requests or browser exceptions.
Its screenshots cover desktop, laptop, tablet and mobile; public pages also include 320px.
It checks horizontal overflow after data loads, mobile report access/filter expansion,
preferences across reload, modal keyboard focus and restoration, audit setup payloads,
failed archive/status actions, empty states, retry recovery and OTP interaction. The fixture
route is removed before production build. This does not substitute for authenticated
end-to-end staging tests against Resend, the database, the crawl network and a live model.

## Final verification results — 2026-09-11

- `npm test`: **18 passed**, including a PDF HTML regression for legacy percentages,
  evidence escaping and unsupported outcome claims.
- `npm run typecheck`: **passed** after the production build.
- `npm run lint`: **passed**, no ESLint warnings or errors. Next 15 notes that
  `next lint` is deprecated for the future Next 16 migration.
- `npm run build`: **passed**, 45 static-page generation steps and complete route traces.
  Existing warnings remain in the unchanged serverless PDF launcher (`createRequire`
  tracing) and JOSE's unused compression imports for Edge. Validate PDF generation
  on the deployed runtime before release; these warnings were not suppressed.
- Browser fixture matrix: **62 layout checks passed** across 13 app screens at
  1440/1024/768/390px, plus landing/login at 1440/1024/768/390/320px. The final icon
  fallback/score-details changes received **22 additional layout checks**, including
  expanded score content and console-error assertions. Interactive assertions passed
  for filters, audit/report access, settings persistence, modal focus and restoration,
  four-step audit request context, failed archive/status updates, empty/error recovery,
  and pasted OTP handling. Data was synthetic; no external service was exercised.
- `node scripts/production-smoke.mjs`: **passed** against `next start`: desktop/mobile
  landing and login, no browser errors, protected redirect query preservation, 401
  on unauthenticated workspace API access, and 404 for the removed QA route.
- `git diff --check`: **passed**. No fixture route appears in the production route
  manifest. No new package dependency, schema change, deployment, live email or
  production account mutation was introduced by this work.

Screenshots from the visual reviews are in `/tmp/ghost-ui-review`. Local production
preview: `http://127.0.0.1:3010`. Deployment remains separate from this implementation.
