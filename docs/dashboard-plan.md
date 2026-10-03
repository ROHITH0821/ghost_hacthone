# Ghost Dashboard — Product & UX Plan

**Status:** implemented in dev (simulated checkout); payment provider TBD  
**Last updated:** 2026-08-04  
**Depends on:** [`docs/pricing.md`](./pricing.md)

This document is the source of truth for the signed-in Ghost dashboard. It follows the commercial model in `pricing.md`: Ghost is **not credit-based**. Access comes from a Free entitlement, a URL-bound one-time purchase (bound on first paid audit), or an Agency subscription with a monthly audit quota.

---

## Product principles

1. **The dashboard is an action center, not an analytics decoration.** It should answer: what needs attention, what should I do next, and what changed after I fixed it?
2. **Never show “credits.”** Show the user’s plan, purchased site access, re-scan entitlement, or Agency monthly audit usage.
3. **One-time purchases remain useful forever.** A ₹499 or ₹999 report stays available for its bound URL without implying an ongoing subscription. URL binding is permanent and happens on **first paid audit start**, not at checkout (Plan page is purchase-first).
4. **Free is an honest preview.** Show the score and top two spots, then explain the additional evidence and fixes available in paid audits.
5. **Agency mode is operational.** It needs clients, audit quota, queued missions, branding, and fast report delivery—not consumer upsell cards.
6. **Prioritize evidence and next actions.** Score charts are secondary to critical ghost spots and ready-to-ship fixes.
7. **Every mission and report is private to its owner/workspace.** Never rely on possession of a mission ID for authorization.

---

## Information architecture

### Personal dashboard navigation

```text
Overview
My Sites
Audits
Fix Center
Comparisons          (₹999 when competitor/re-scan data exists)
Plan & Purchases
Settings
```

### Agency dashboard navigation

```text
Overview
Clients
Audits
Fix Center
Comparisons
Report Branding
Plan & Usage
Settings
```

Use one responsive shell with plan-aware navigation. Do not build unrelated personal and Agency applications.

---

## Global dashboard shell

### Desktop

- Collapsible left sidebar, 248px expanded and 72px collapsed
- Ghost logo and workspace name at the top
- Navigation in the middle
- Current plan and account menu at the bottom
- Top bar with page title, search, notifications, and primary **New audit** button
- Content width up to 1440px with 24–32px page padding

### Mobile

- Compact top bar with Ghost logo, page title, and **New audit** action
- Bottom navigation for Overview, Sites/Audits, Fixes, and More
- Tables become stacked cards
- Filters open in a bottom sheet
- Never require horizontal scrolling for core actions

### Visual direction

- Preserve Ghost’s midnight background, glass surfaces, electric violet, AI blue, and neon green
- Use restrained glow; dashboard readability is more important than landing-page spectacle
- Space Grotesk for headings and Inter for body text
- Dense enough for professional use, but not an enterprise spreadsheet
- Use violet for primary actions, red/orange for risk, green only for completed or improved states
- Motion should communicate mission progress and score change; avoid decorative continuous animation

---

## 1. Overview

The overview changes by entitlement, but its hierarchy remains consistent.

### Header

```text
Good morning, {name}                         [New audit]
Here is what Ghost found across your sites.
```

Under the header, show a small plan label:

- `Free`
- `Fix My Site · example.com`
- `Full Intelligence · example.com`
- `Agency · 18 of 30 audits used this month`

Do not show a wallet, token balance, or credit balance.

### Primary summary cards

Use four cards maximum:

| Card | Personal meaning | Agency meaning |
|---|---|---|
| Latest Ghost Score | Latest purchased/scanned site | Average latest score across active clients |
| Critical Ghost Spots | Unresolved critical findings | Critical findings across clients |
| Fixes Implemented | Marked implemented/verified | Implemented across client sites |
| Entitlement | Re-scan status or purchased audit | Monthly audits used out of 30 |

Examples of entitlement card text:

- Free: `Free scan used` + **Choose an audit**
- ₹499 unbound: `Standard report ready to use` + **Start your first audit**
- ₹499 bound: `Standard report owned forever` + domain
- ₹999 unbound: `Deep report ready to use` + **Start your first audit**
- ₹999 bound, re-scan not yet active: `1 re-scan included` + **Starts when you run your first deep audit**
- ₹999 bound, re-scan active: `1 re-scan available until 02 Oct` + **Use re-scan**
- Agency: `18 / 30 Standard audits used` + reset date

### Attention required

Show a prioritized feed, not another metric row:

```text
Critical · Pricing is missing from /services                 [Review fix]
High · No customer proof appears before the booking form     [View evidence]
Re-scan available · Verify changes on example.com            [Start re-scan]
Failed audit · competitor.com blocked the crawler             [Retry]
```

Rank by severity, recency, and whether the user can act now.

### Recent sites/audits

Show five rows with:

- Favicon and domain
- Audit type: Quick, Standard, Deep, or Re-scan (competitor intelligence is part of Deep, not a separate mission type)
- Ghost Score and change when comparable
- Critical spot count
- Status
- Last scanned time
- Contextual action: Continue, View report, Retry, or Download PDF

### Recommended next action

Show only one strong recommendation:

- Free: upgrade to a full diagnosis
- ₹499: open the highest-impact fix
- ₹999: scan competitor or use the time-limited re-scan
- Agency: audit the next client or review a completed queued audit

---

## 2. My Sites

This is the durable view of websites, while **Audits** is the history of individual missions.

### Site card/row fields

- Domain, favicon, and optional business name
- Ownership/entitlement badge
- Latest Ghost Score
- Score trend from last comparable audit
- Unresolved critical/high ghost spots
- Last scan date
- Available actions based on plan

### Entitlement labels

- `Free preview`
- `Standard report owned`
- `Deep report owned`
- `Re-scan available until {date}`
- `Agency client`

### Site actions

- Open latest report
- Open Fix Center filtered to this site
- Download available PDF
- Start eligible re-scan
- Start competitor comparison when entitled
- Purchase Standard or Deep for a free-preview site
- Archive from the dashboard without deleting the purchased report

For a one-time purchase, do not show “renew,” “subscription,” or “monthly usage.”

---

## 3. Audits

### Filters

- Search by domain or client
- Status: queued, running, complete, failed
- Type: Quick, Standard, Deep, Re-scan
- Date range
- Agency client filter

### Table columns

```text
Site / Client | Audit type | Depth | Shoppers | Score | Status | Started | Actions
```

Do not show internal token cost to ordinary customers. Internal cost belongs in a separate admin tool.

### Running audit row

Display a real persisted state:

```text
Deploying shoppers · 7 of 25 reported
[███████████░░░░░░] 62%
Started 3m ago                                      [View live]
```

### Status lifecycle

```text
Queued
→ Crawling website
→ Understanding business
→ Detecting customer journeys
→ Deploying AI shoppers
→ Aggregating ghost spots
→ Generating Growth Kit
→ Creating report
→ Complete
```

Failure states must include a useful reason and one safe action: retry, edit URL, or contact support.

---

## 4. New Audit flow

Use a focused modal on desktop and a full-screen flow on mobile.

### Step 1 — Website

- Website URL
- Business name (optional, inferred later)
- Confirm public-site authorization checkbox

### Step 2 — Choose available audit

Do not present credits. Present products and entitlements:

#### Free user

- Quick Scan — available if unused
- Fix My Site — ₹499 one-time (purchase in modal when URL known, or buy unbound on Plan page first)
- Full Intelligence — ₹999 one-time (same)

#### Unbound purchase (Plan page buy, URL not yet chosen)

- User has an active voucher with no bound domain
- New Audit step 2 offers **Use your Fix My Site / Full Intelligence purchase** for the entered URL
- Step 4 review requires checkbox: permanent bind to this URL
- Binding commits when the audit **starts**, not when the scan completes; abandon/failure does not unbind

#### ₹499 owner (bound URL)

- Open existing report for the bound URL
- Buy Full Intelligence for a deeper audit/competitor comparison
- A different URL requires a new purchase

#### ₹999 owner

- Deep Audit for bound URL
- Add optional competitor or market hints; Ghost decides which relevant competitors need analysis (included in Deep — not a separate audit type)
- Use re-scan if available and within 60 days of **first deep audit** on that URL

#### Agency

- Choose client
- Standard Audit
- Deep Audit when allowed by the final Agency quota rule
- Show `18 of 30 Standard audits used this month`

### Step 3 — Context

Let the user optionally improve audit accuracy:

- Primary conversion goal
- Target customer/location
- High-value product or service
- Important page
- Optional competitor/market hints where entitled

### Step 4 — Review

Show:

- Audit type
- Pages and maximum personas
- Included report features
- Expected time range
- Price or entitlement being consumed
- For unbound voucher: explicit warning that this purchase permanently applies to the entered URL
- For Agency: resulting monthly usage, not credits

Primary action: **Start Ghost audit** or **Continue to payment**.

---

## 5. Fix Center

The Fix Center is the dashboard’s main retention loop.

### Workflow

```text
Recommended → Planned → Implemented → Verified
```

### Fix card

- Severity
- Site and affected page
- Ghost spot title
- Shopper evidence/quote
- Expected outcome, without invented revenue claims
- Generated ready-to-paste content
- Copy action
- Status selector
- Implementation note/date
- Link to source report

### Filters

- Site/client
- Severity
- Status
- Category: pricing, trust, conversion, UX, information, technical
- Audit date

### Plan behavior

- Free: empty preview explaining that Growth Kit is included in paid audits
- ₹499/₹999: all fixes for the purchased URL
- Agency: fixes grouped by client and assignable later when team roles are added

### Verification

- ₹999: **Verify with re-scan** while voucher is valid
- Agency: verify within monthly audit quota
- ₹499: do not promise a free re-scan; show the implemented state without automatic verification

---

## 6. Comparisons

Only display this navigation item when comparison data or entitlement exists. Site picker filters market intelligence and re-scan pairs to the selected owned site.

### ₹999 competitor intelligence (Market Intelligence)

Narrative, evidence-first comparison — not a raw scoreboard of taxonomy rows.

**Page structure (Results + Comparisons + PDF share one ViewModel):**

1. **Executive summary** — category, geography, competitor names, coverage warnings, regenerate
2. **Verdict** — quantified ahead/behind call with support bullets (resolver confidence)
3. **Top actions** — ranked evidence-backed market gaps (priority, evidence, impact, recommendation)
4. **You vs competitor** — business **themes** (not raw taxonomy). Competitor `<select>` with crawl-quality hint
5. **Competitor profiles** — selection reason, relevance, crawl quality, strengths / weaknesses (resolver + narratives)
6. **Detailed feature comparison** (collapsible appendix) — taxonomy matrix: You | Market | Δ | confidence

**Theme summary strip (above side-by-side):**  
`Compared across N themes · Behind X · Ahead Y · Similar Z`

**Each theme section shows:** title + standing badge (Behind / Ahead / Similar / Unknown), theme confidence %, Your website vs Competitor (status, score or —, best evidence quote, confidence badge), why it matters, recommended action. Optional muted “Includes: …” lists member taxonomy features. All themes are shown (scrollable); never cap at 6–8 rows. Missing data is **Not observed** / **Not crawled** / **—** — never coerced to score `0`.

**Business themes (presentation-only; config in `theme-groups.ts`):**

| Theme | Taxonomy features |
|---|---|
| Pricing & Plans | Pricing transparency |
| Trust & Credibility | Testimonials, Reviews / ratings, Case studies, Accreditations |
| Product Information | Product / service detail, FAQ |
| Contact & Support | Multiple contact channels, Live chat |
| Buying Journey | Book / buy CTA, Shipping / returns, Search / catalog filter |
| Company Trust | About / brand story, Founder / team visibility |
| User Experience | Mobile-friendly layout |

Internal scoring still uses the full taxonomy. Adding a taxonomy feature later = edit `THEME_GROUPS` (assert: every taxonomy id appears in exactly one theme).

**Product rules:**

- AI-selected relevant competitor set (hints guide, do not force)
- Explain why each competitor was selected; label crawl quality (good / partial / weak)
- “Opportunities to borrow,” not unsupported claims about competitor revenue
- PDF download uses the same ViewModel (themes + appendix); no parallel presentation logic

### Before/after re-scan

- Original versus current score
- Resolved, persistent, and new ghost spots
- Dimension changes
- Verified fixes
- Crawl confidence on both scans

### Agency comparison

- Compare scans within one client over time
- Optional portfolio table across clients
- Never average unlike industries into a misleading benchmark

---

## 7. Plan & Purchases

This replaces a credit/balance screen.

### Free

- Free scan status: available or used
- What the free result includes
- Standard and Deep one-time purchase cards (**one-click buy — no URL field**)

### One-time purchase

- Product name and amount paid
- **Ready to use** badge when URL not yet bound; helper: “Your first audit will lock this report to one website.”
- Bound domain (after first audit)
- Purchase date
- Permanent report access (after bind + first mission)
- PDF availability (after completed audit)
- Receipt/invoice download
- ₹999 re-scan: “included — starts after first deep audit” until window active; then expiry date
- **Start audit** CTA for unbound vouchers; Report/PDF after first completed mission
- Upgrade path from ₹499 to ₹999, if commercial rules permit
- Multiple unbound purchases per tier allowed (oldest consumed first)

### Agency

- Subscription status
- ₹2,999/month
- Current billing period
- `audits used / 30`
- Reset date
- Cancel/manage subscription
- Invoice history
- Clear behavior when quota is exhausted

Use the term **monthly audit quota**, never credits.

---

## 8. Agency-only surfaces

### Clients

- Client name
- Domain(s)
- Latest score
- Unresolved critical spots
- Latest audit
- Report status
- New audit action

Client detail contains Overview, Audits, Fixes, Comparisons, and Reports.

### Report Branding

- Agency logo
- Agency name
- Contact email/phone/website
- Accent color within safe contrast limits
- PDF preview
- Save and apply to future reports

Do not imply custom domain support until it is implemented.

### Queue

Agency overview should surface queued and running client audits. The dashboard remains usable while jobs run.

---

## 9. Settings

### Account

- Email
- Login/session management
- Sign out
- Export account data
- Delete account with explicit consequences

### Notifications

- Audit completed
- Audit failed
- Deep re-scan expiry reminder
- Agency monthly usage threshold
- Monthly invoice

### Preferences

- Reduce motion
- Compact audit list
- Default report language later

### Privacy

- Report retention explanation
- Delete report/site data
- Screenshot handling explanation
- Active share links when sharing is implemented

---

## Empty, loading, and error states

Every page needs intentional states.

### First login

```text
Your first Ghost mission starts here.
Enter a website and see why customers may be leaving.
[Start free scan]
```

### No fixes

- Free: explain Growth Kit availability without showing fake fixes
- Paid complete audit with no severe findings: celebrate carefully and show lower-priority opportunities
- Audit still running: link to live mission

### Exhausted Agency quota

```text
30 of 30 Standard audits used
Your quota resets on 01 September.
[Manage plan] [View completed audits]
```

Do not call this “0 credits.”

### Failed audit

Show the safe user-facing reason, timestamp, whether quota/purchase entitlement was restored, and retry eligibility.

---

## Responsive priority

On small screens, preserve this order:

1. New audit
2. Attention required
3. Running audits
4. Latest score
5. Recommended fix
6. Recent history
7. Plan information

Hide secondary table columns rather than shrinking them into unreadable text.

---

## 10. Product configurations users should control

Product configuration must improve audit relevance without letting users accidentally weaken the product they purchased. Ghost should separate three concepts:

1. **User input** — facts only the business owner can confirm, such as their primary goal and audience.
2. **Plan entitlement** — depth, page limit, persona limit, fixes, PDF, competitor access, and re-scan rights defined by `pricing.md`.
3. **System configuration** — model, concurrency, crawl timeout, retry behavior, scoring weights, and safety limits controlled by Ghost internally.

Users should never configure Anthropic models, token budgets, concurrency, scoring weights, or crawler security settings.

### Configuration availability by plan

| Configuration | Free | ₹499 Fix My Site | ₹999 Full Intelligence | Agency |
|---|---|---|---|---|
| Confirm inferred business context | Yes | Yes | Yes | Yes |
| Primary conversion goal | 1 | 1 | Up to 3 | Up to 3 per client/site |
| Target audience and location | Basic | Full | Full | Full |
| Important page/path | No | 1 optional | Up to 5 | Up to 5 per audit |
| Excluded public paths | No | Up to 3 | Up to 10 | Up to 10 |
| Competitor discovery | No | No | AI-selected relevant set | AI-selected per eligible audit |
| Device perspective | Automatic | Automatic | Mobile / desktop / both | Mobile / desktop / both |
| Report language | Default | Select | Select | Select per client |
| Report branding | Ghost | Ghost | Ghost | Agency brand profile |
| Email when ready | Optional | Optional | Recommended | Per user/client preference |
| Scheduled scans | No | No | No; one manual re-scan | Later Agency feature only |

The table defines the intended product experience; final Agency Deep/competitor quota rules still depend on the open decisions in `pricing.md`.

### A. Site profile

Create a reusable Site Profile when a URL is first scanned. It prevents users from re-entering the same business information and gives Agency users a stable configuration per client.

#### User-controlled fields

- Canonical website URL
- Business/display name
- Business category
- Primary location or service area
- Primary website language
- Target audience
- Primary conversion goal
- High-value products or services
- Preferred customer contact method
- Optional notes for Ghost

#### Inferred fields requiring confirmation

Ghost may infer these from the crawl:

- Business type
- Location
- Primary offer
- Likely target audience
- Visible conversion path
- Detected contact methods

Present inferred values in a review card:

```text
Ghost understood your business as:

Bridal and beauty studio · Hyderabad
Primary goal: Book a bridal consultation
Audience: Brides and wedding families in Hyderabad

[Looks right] [Edit details]
```

Do not block a Free scan with a long questionnaire. Free users can confirm or skip. Paid users should review the context before the full swarm begins, with sensible inferred defaults already filled.

### B. Conversion goals

Use a controlled set of goal types plus an optional custom label:

- Purchase a product
- Book an appointment
- Request a quote
- Call or WhatsApp
- Submit an enquiry
- Visit a physical location
- Start a trial or signup
- Download or register
- Custom goal

For each selected goal, collect:

- Goal name
- Expected destination or success page, when known
- Importance: primary or secondary
- Optional high-value product/service attached to it

Ghost still detects actual customer flows dynamically. User-entered goals guide flow selection; they do not force Ghost to invent a journey unsupported by the website.

### C. Crawl scope

Plan limits remain fixed:

| Audit | Maximum pages | Maximum personas |
|---|---:|---:|
| Free Quick | 3 | 3 |
| ₹499 Standard | 8 | 10 |
| ₹999 Deep | 20 | 25 |
| Agency | Per selected Standard/Deep rules | Up to plan capacity |

Users choose priorities inside those limits, not larger limits.

#### User controls

- Important page URLs or paths
- Paths to exclude, such as careers, legal, or unrelated blog archives
- Include/exclude blog content toggle for eligible paid scans
- Preferred device perspective where entitled

#### Ghost-controlled behavior

- Sitemap discovery
- Page prioritization
- Same-domain redirect handling
- Duplicate-page removal
- Maximum response size
- Private-network blocking
- Crawl concurrency and timeout
- Screenshot selection

Important pages are hints, not guaranteed additions beyond the plan page cap. Explain this inline:

> Ghost prioritizes these pages within your audit’s page limit.

Never allow arbitrary URL patterns that could bypass same-domain or SSRF protections.

### D. Persona and customer perspective

Do not present a checklist of 100 personas. That makes the engine look preset and encourages users to optimize for quantity instead of coverage.

The main control should be:

```text
Customer perspective
○ Let Ghost decide (recommended)
○ Add context about an important customer segment
```

Optional customer-segment context:

- Segment name
- What they are trying to accomplish
- Main concern: price, trust, speed, clarity, accessibility, urgency, location, comparison, or custom
- Language preference
- Device tendency

Rules:

- Ghost selects one best-fit archetype per detected customer flow.
- Persona count is dynamically determined up to the plan limit.
- A user suggestion influences selection but does not guarantee a redundant persona.
- The UI says **up to N shoppers**, never that every audit always deploys N.
- Agency client defaults may be saved and reused.

### E. Device and experience perspective

#### Free and ₹499

Use **Automatic**. Ghost selects the most relevant device emphasis based on the site and business context. This keeps the flow simple and protects runtime targets.

#### ₹999 and Agency

Allow:

- Mobile priority
- Desktop priority
- Both

“Both” must not silently double the purchased product. It changes evidence collection within the plan’s page/persona limits unless pricing later explicitly defines a separate multi-device audit.

Show the consequence before starting:

> Both devices provide broader evidence but may take longer. Page and shopper limits remain unchanged.

### F. Competitor intelligence configuration

Available for ₹999 Full Intelligence deep audits and eligible Agency audits. Runs after the owner Ghost audit completes; re-scan missions do **not** run competitor research.

The user does not choose a required competitor count. Ghost discovers the competitive set from confirmed business context, location, offering, and conversion goal. Internal search, crawl, latency, and cost ceilings are system safety limits — never marketed as a fixed competitor count.

Optional user hints:

- Known competitor names or URLs
- Target market/location
- Specific product, service, or conversion goal to compare
- “Exclude from comparison” names/domains
- Additional market context

Hints guide discovery but do not force inclusion. Ghost must validate relevance before selecting a hinted business.

#### Pipeline (feature-normalized)

```text
Confirmed business context
→ Discover / rank candidates (hints + optional Tavily + LLM)
→ Adaptive competitor crawl (ceiling GHOST_COMPETITOR_PAGES, default 12 / max 25;
   early stop only when taxonomy *proxy* coverage ≥ GHOST_COMPETITOR_COVERAGE_STOP
   with ≥3 rich pages, or budget/queue exhausted — not homepage keyword buckets)
→ Persist CompetitorCrawlPacks (+ proxy coverage metrics / stop reason)
→ Feature Extraction (LLM scores taxonomy criteria; server computes feature scores)
→ Validate extract (almost-all filler zeros → low-confidence limitation)
→ Market expectations (numeric averages across competitors)
→ Market gaps (score-delta rules + LLM narratives)
→ Persist CompetitorIntelligence JSON on Mission
```

Cheap regen: `POST /api/missions/[id]/regenerate-market-intelligence` re-runs extract → expectations → gaps from **cached** crawl packs (cooldown applies). **No re-crawl.** Thin packs stay thin — run a new Deep audit (and/or raise `GHOST_COMPETITOR_PAGES`) when proxy/real coverage is low.

**Crawl quality (post-extract):** good ≥85% taxonomy features with real criterion evidence; partial 50–84%; weak &lt;50% (or all-zero filler extract). Not based on “2 pages crawled.”

Presentation is **deterministic** after extraction:

```text
Feature Extraction
→ Evidence Resolver (single priority chain for all surfaces)
→ Theme Builder (config-driven THEME_GROUPS)
→ MarketComparisonViewModel
→ Results / Comparisons / PDF
```

Do **not** add LLM calls in Theme Builder or ViewModel. Do **not** change Feature Extraction when only presentation grouping changes.

#### Feature taxonomy v2 (internal scoring model)

Code-owned in `feature-taxonomy.ts` (`TAXONOMY_VERSION = "2"`). Every site (owner + competitors) is scored on the same features. Each feature has:

- **Feature score** 0–100 — weighted average of criteria (computed server-side; LLM must not set the aggregate)
- **Criteria** — each scored 0–100 with status `present` | `partial` | `absent` and evidence
- **Summary** + optional narrative bullets (`topStrengths`, `weaknesses`, `evidenceHighlights`)

| Feature id | Label | Dimension |
|---|---|---|
| `pricing_transparency` | Pricing transparency | conversion |
| `faq_section` | FAQ section | information |
| `testimonials` | Customer testimonials | trust |
| `reviews_social_proof` | Reviews / ratings | trust |
| `case_studies` | Case studies | trust |
| `accreditations` | Accreditations / certifications | trust |
| `founder_visibility` | Founder / team visibility | trust |
| `contact_multiple_channels` | Multiple contact channels | conversion |
| `booking_cta` | Book / buy CTA | conversion |
| `shipping_returns_policy` | Shipping / returns policy | information |
| `about_story` | About / brand story | trust |
| `product_detail_depth` | Product / service detail | information |
| `mobile_friendly_signals` | Mobile-friendly layout | ux |
| `search_or_filter` | Search or catalog filter | ux |
| `live_chat` | Live chat / instant support | conversion |

Gap classification (tunable thresholds): `missing_expected`, `weaker_than_market`, `differentiation_opportunity`. Gaps carry `ownerScore`, `marketScore`, `scoreDelta`, `missingCriteria`, plus narrative evidence / impact / recommendation.

#### Evidence Resolver

One priority chain for verdict, actions, profiles, themes, appendix, and PDF:

1. Criterion evidence  
2. Evidence highlights  
3. Feature summary  
4. Narrative strengths / weaknesses  
5. Score only  
6. Unknown → **Not observed** or **Not crawled** (never display missing as `0`)

#### Theme Builder (presentation)

Groups taxonomy features into business themes (`theme-groups.ts`). Per theme × competitor:

- Theme score = weighted average of member feature scores (exclude unscored / not_observed / not_crawled; null → UI `—`)
- Theme confidence = weighted average of member confidences
- Standing vs selected competitor: `ahead` | `behind` | `similar` | `unknown` (Δ ≥ 8)
- Why it matters = static config (+ optional weakest-member taxonomy description)
- Recommended action = highest-priority market gap in theme, else theme `defaultAction`

Sort: behind (by impact) → remaining by impact → ahead last among scored → unknown last; within bucket, higher theme confidence first.

#### Canonical ViewModel

`buildMarketComparisonViewModel(intelligence)` is the only presentation contract for Market Intelligence UI/PDF. Surfaces: metadata, coverage, executive summary, verdict, competitors, `sideBySide` (themes + per-competitor summary), actions, appendix.

#### Structured-output / product rules

- Facts must cite crawled public pages; search snippets alone are not evidence
- Separate observed facts from LLM interpretation
- Never invent traffic, revenue, conversion rate, customer count, or market share
- Preserve low-confidence and blocked-crawl limitations; surface coverage warnings in UI
- Normalize canonical domains; deduplicate brands / regional subdomains / directories
- Do not select aggregators as direct competitors unless the business competes there
- Return an empty competitor set with limitations when no defensible comparison can be made
- Store discovery candidates, crawl packs, and derived intelligence separately from the owner Ghost report
- ₹999 includes competitor intelligence as part of Deep — no fixed competitor count promise
- Selected set is immutable once processing begins (report reproducibility)
- Clearly label which facts belong to which website

Validation:

- Every discovered/hinted destination must be a public HTTP/HTTPS URL
- Must not resolve to the same canonical domain as the primary site
- Redirects subject to SSRF, content-size, and crawl safety rules
- No authenticated or bypassed access
- Requesting user must be authorized for the mission

### G. Report configuration

#### All users

- Display language
- Email when the audit completes
- Time zone for displayed timestamps
- Reduce motion and compact-list preferences

#### Paid personal plans

- PDF language
- Optional business display name correction
- Select whether the PDF shows business context details

#### Agency

- Saved brand profile
- Logo
- Agency name
- Contact email, phone, and website
- Safe accent color
- Client-facing report title
- Show/hide Ghost “Powered by” line according to the final white-label rule
- Default report language per client

Do not let users hide evidence, confidence warnings, scoring methodology labels, or safety/legal disclosures. Branding changes presentation, not the underlying result.

### H. Notification preferences

Controls:

- Audit completed
- Audit failed
- ₹999 re-scan expires in 14 days
- ₹999 re-scan expires in 3 days
- Agency quota reaches 70%, 90%, and 100%
- Agency billing/subscription events
- Scheduled summary later for Agency

Channels for initial release:

- In-app
- Email

Do not add SMS or WhatsApp notifications until delivery consent, cost, and opt-out behavior are designed.

### I. Re-scan configuration

For the ₹999 re-scan and eligible Agency follow-up audits:

- **60-day window starts when the first deep audit on that URL starts** — not at purchase
- Until then: show “1 re-scan included — starts after your first deep audit” (no expiry date)
- Original site URL is locked after bind
- Original audit is selected automatically as the baseline
- User selects which fixes they implemented
- User may update important-page priorities
- Business context can be corrected
- User cannot replace the purchased URL with another domain
- Show entitlement expiry before confirmation

Review screen:

```text
Verify changes on example.com
Baseline: Deep Audit · 03 Aug 2026
Implemented fixes selected: 4
Re-scan entitlement: 1 remaining · expires 02 Oct 2026

[Start verification scan]
```

After the re-scan starts, mark the entitlement reserved. Consume it only according to the final retry/refund policy; crawler or platform failures should not unfairly remove it.

### J. Agency defaults

Agency users need configuration inheritance to avoid repetitive setup:

```text
Workspace defaults
  → Client defaults
    → Audit-specific overrides
```

#### Workspace defaults

- Agency brand profile
- Default report language
- Default notification recipients
- Default device perspective
- Default audit type when permitted

#### Client defaults

- Client name and domain
- Business context
- Goals and important pages
- Customer segment notes
- Report language
- Client contact/reference ID

#### Audit override

- Standard or Deep
- Current campaign/high-value goal
- Important page changes
- Optional competitor names/URLs and market hints when entitled
- Completion notification recipients

Display inherited fields with a label such as `Using client default` and provide **Override for this audit**. Never change saved defaults silently from an audit override.

### K. Configuration placement in the dashboard

| Configuration | Location |
|---|---|
| Business context and goals | My Sites → Site settings |
| Important/excluded pages | My Sites → Crawl preferences |
| Audit-specific context | New Audit → Context |
| Competitor/market hints | New Audit → Market Intelligence step |
| Persona/customer segment hints | Site settings and New Audit → Context |
| Device perspective | New Audit → Review options |
| Report language | Site settings or New Audit |
| Personal notifications | Settings → Notifications |
| Agency branding | Report Branding |
| Agency/client defaults | Clients → Client settings |
| Re-scan selections | Comparisons/Fix Center → Verify changes |

Avoid a single giant “Configuration” page. Put each setting where its effect is understandable.

### L. New Audit configuration UX

Keep the four-step New Audit flow from this plan, with progressive disclosure:

```text
1. Website
   URL + saved site/client selection

2. Audit
   Available entitlement/product + competitor when included

3. Context
   Confirm inferred business + goals + optional priorities

4. Review
   Depth, limits, perspectives, notifications, entitlement/price
```

Recommended defaults should allow completion without opening advanced settings. Put important/excluded paths, device choice, and segment notes under **Customize audit**.

### M. Configuration validation and auditability

- Canonicalize URLs before matching entitlements
- Validate every configuration server-side, even if the UI constrains it
- Snapshot effective configuration onto each Mission so historical reports remain reproducible
- Record whether each value was inferred, user-confirmed, inherited, or overridden
- Do not retroactively alter completed reports when Site Profile defaults change
- Show a compact “Audit setup” section in completed report metadata
- Agency configuration changes should eventually appear in an audit log
- Sensitive internal engine settings must never be serialized into client-visible report JSON

### N. Product configuration acceptance criteria

- Users can run an audit successfully using only URL and recommended defaults
- Paid users can confirm business context without changing their purchased audit limits
- No screen lets users exceed plan page/persona limits without purchasing the appropriate product
- Persona selection remains dynamic and flow-driven
- ₹999 competitor and re-scan configuration is visible only when entitled
- One-time URL entitlements cannot be moved to a different canonical domain through settings
- Agency users can save workspace and client defaults without using credits terminology
- Every mission stores an immutable snapshot of the effective audit configuration
- Configuration errors explain how to correct the field without exposing internal security rules

---

## Data model required later

The current `User` and `Mission` tables are insufficient for the complete dashboard. The eventual model should support:

```text
Plan / Product
Purchase
Entitlement
Site
SiteProfile
Mission
MissionConfiguration
MissionComparison
FixStatus
AgencyWorkspace
Client
BrandProfile
Subscription
Notification
```

Important concepts:

- One-time entitlements bind to `userId + canonicalSiteId` on **first paid audit start** (or at in-modal purchase when URL is already known)
- Unbound vouchers: `siteId` and `boundUrl` null until bind; no unbind on mission failure
- Free usage is tracked per authenticated user
- Re-scan: remaining count + expiry (`rescansExpiresAt` set on first deep audit, +60 days)
- Agency usage is a monthly audit counter with a defined reset period
- Mission access checks owner or workspace membership on every server query
- Failed/cancelled jobs must not consume an entitlement incorrectly

No generic `creditBalance` field should be introduced.

---

## Delivery phases

### Phase 1 — Personal dashboard foundation

- Create `/dashboard` shell
- Overview, My Sites, Audits, Plan & Purchases, Settings
- Replace `/profile` mission-list role; keep `/profile` for account settings or redirect it
- Real mission states and ownership checks
- Free, ₹499, and ₹999 entitlement-aware UI
- Mobile layout and accessibility

### Phase 2 — Fix and re-scan loop

- Fix Center workflow
- Persist planned/implemented states
- ₹999 re-scan voucher and expiry
- Before/after comparison
- Completion and expiry emails

### Phase 3 — Agency

- Workspace and client model
- Monthly quota usage
- Multi-client dashboard
- Queue management
- Branded PDF settings
- Subscription management

### Phase 4 — Refinement

- Competitor comparison polish *(shipped: taxonomy v2, evidence resolver, business themes, adaptive crawl, site picker, PDF)*
- Industry benchmarks only after a defensible dataset exists
- Saved filters and bulk actions
- Team roles and assignments if demanded by Agency customers

---

## Acceptance criteria

- No user-facing screen uses the words credit, token, or wallet for commercial usage
- A one-time buyer can purchase without choosing a URL, then bind on first audit
- A one-time buyer can always reopen the purchased report and PDF for the bound URL
- A ₹999 buyer can clearly see re-scan status (pending vs active window) and competitor entitlements (via Deep audit)
- An Agency user can see monthly audits used, remaining, and reset date
- Free results never reveal paid quotes, full breakdown, fixes, or PDF accidentally
- Every mission action is authorized by user or workspace ownership
- Dashboard communicates queued/running/failed states without fake timers
- Primary tasks are usable at 360px width and with keyboard navigation
- Empty, loading, error, and quota-exhausted states are designed

---

## Stitch prompt

Paste the following into Stitch to visualize the production dashboard:

```text
Design a high-fidelity responsive SaaS dashboard for “Ghost,” an AI mystery-shopper platform that audits websites and reveals why customers leave. This is the signed-in product, not the marketing landing page.

Commercial model: DO NOT use credits, tokens, coins, wallet balances, or pay-as-you-go language. Ghost has four plans: Free; “Fix My Site” at ₹499 one-time for one URL forever; “Full Intelligence” at ₹999 one-time for one URL, competitor comparison (part of Deep audit), and one re-scan within 60 days of first deep audit; and Agency at ₹2,999/month with 30 Standard audits per month, multi-client management, and branded reports. Plan page checkout does not ask for a URL — user binds on first audit. Show entitlement and monthly quota language accordingly.

Create a desktop dashboard at 1440px and a mobile version at 390px. Use a dark premium visual system: near-black midnight #050510 background, navy #0B1020 surfaces, white #F8FAFC text, electric violet #7C3AED primary accent, AI blue #38BDF8 secondary accent, green #22C55E only for completed/improved states, orange and red for risk. Use Space Grotesk-style headings and Inter-style body copy. Add subtle glass surfaces, thin borders, restrained violet/blue glow, strong contrast, generous spacing, and polished B2B SaaS density. Avoid excessive gradients, giant empty cards, cyberpunk clutter, and decorative charts with no action.

Desktop shell: collapsible left sidebar with Ghost logo, Overview, My Sites, Audits, Fix Center, Comparisons, Plan & Purchases, Settings. Bottom sidebar shows current plan and account avatar. Top bar has page title, search, notification bell, and prominent violet “New audit” button.

Design the Overview for a Full Intelligence customer. Header: “Good morning, Sriman” and “Here is what Ghost found across your sites.” Show a plan badge “Full Intelligence · example.com”. First row has four compact summary cards: Latest Ghost Score 62 with “Needs improvement”; 3 Critical Ghost Spots; 4 Fixes Implemented; and Re-scan “1 available until 02 Oct” with a “Use re-scan” action.

Below, make “Attention required” the visual priority. Show actionable rows: Critical pricing missing on /services with Review fix; High no customer proof before booking with View evidence; Re-scan available to verify changes with Start re-scan. Use severity, page, evidence snippet, and clear buttons.

Add a Recent Audits table with favicon/domain, audit type, shopper count, Ghost Score/change, critical spots, status, last scanned, and contextual action. Include a running Deep Audit row with real progress text “Deploying shoppers · 7 of 25 reported” and progress bar. Include completed, queued, and failed examples.

Add one Recommended Next Action card: “Publish the pricing block Ghost generated for /services” with impact rationale and Open Fix button. Do not create a generic analytics chart.

Also produce supporting screens in the same visual system:
1. My Sites: cards/table for Free preview, Standard report owned forever, Deep report with re-scan available, latest score, unresolved issues, and actions.
2. Audits: filterable mission table with Quick, Standard, Deep, and Re-scan types only; persisted statuses from Queued through Complete.
3. Fix Center: four-column workflow Recommended, Planned, Implemented, Verified; fix cards contain severity, affected page, shopper quote, ready-to-paste content, Copy, and status actions.
4. Comparison: original versus re-scan score, resolved/persistent/new ghost spots, six score dimensions, and verified fixes; also Market Intelligence — executive summary, verdict, top actions, You-vs-competitor **business themes** (Behind/Ahead/Similar summary strip), competitor profiles with crawl quality, and a collapsible detailed feature appendix. No fixed competitor count; never show missing scores as zero.
5. Plan & Purchases: one-click ₹499/₹999 buy (no URL at checkout); owned list with “Ready to use” unbound vouchers; bound domain + receipt/PDF after first audit; re-scan expiry after first deep audit; Agency variant shows “18 of 30 audits used this month” and reset date. Never show credits.
6. Agency Clients: client/domain list, latest score, critical spots, audit status, new audit; show monthly quota in header and queued/running jobs.
7. New Audit modal: Website, Choose Audit, Context, Review. Present available products/entitlements, pages, maximum personas, expected time, and price or quota effect. Never ask the user to buy credits.
8. Empty state for a first-time Free user with “Your first Ghost mission starts here” and Start free scan.
9. Mobile dashboard with bottom navigation, stacked attention cards, compact metrics, and a persistent New audit action.
10. Site Settings and Audit Configuration: editable inferred business profile, conversion goals, important and excluded paths, “Let Ghost decide” customer perspective with optional segment context, plan-aware device options, report language, and notification preferences. Use progressive disclosure and label inherited Agency client defaults. Keep page/persona limits read-only and show them as part of the selected product, not user-adjustable credits.

Use realistic UI copy. Make Ghost feel mysterious but credible, premium, evidence-led, and operationally ready. The most important interaction is moving from a critical ghost spot to a ready-to-implement fix, then verifying it with a re-scan.
```

---

## Decision log

| Date | Decision |
|---|---|
| 2026-08-03 | Initial dashboard IA, Fix Center, Agency surfaces, and audit configuration spec |
| 2026-08-04 | **Purchase-first Plan page** — no URL at checkout; bind on first paid audit start |
| 2026-08-04 | **Re-scan expiry** — 60 days from first deep audit, not purchase date |
| 2026-08-04 | **Mission audit types** — Quick, Standard, Deep, Re-scan only (no standalone Competitor type) |
| 2026-08-04 | **Bind is irreversible** — mission failure or browser close does not restore unbound voucher |
| 2026-08-04 | **Competitor intelligence (prod)** — feature-normalized pipeline; persisted `CompetitorCrawlPack`; derived `CompetitorIntelligence` with actionable market gaps; regen from cache via `POST /api/missions/[id]/regenerate-market-intelligence` |
| 2026-08-07 | **Competitor taxonomy v2** — scored features (0–100) with per-criterion breakdown; numeric gap analysis; regen required for v1 intelligence records |
| 2026-08-07 | **Narrative Comparisons UX** — verdict hero, competitor profiles, evidence-first actions; taxonomy matrix demoted to collapsible appendix; site picker on Comparisons |
| 2026-08-07 | **Evidence Resolver + ViewModel** — single evidence priority chain; `MarketComparisonViewModel` is the only presentation contract for Results / Comparisons / PDF |
| 2026-08-07 | **Business theme comparison** — config-driven `THEME_GROUPS` (7 themes covering all taxonomy features); Theme Builder scores/standing/sort; UI shows all themes with Behind/Ahead/Similar summary; no new LLM calls |
| 2026-08-07 | **Adaptive competitor crawl** — max 10 pages with early exit; prioritize high-value paths (pricing, product, about, FAQ, contact); SaaS-aware prioritization |
| 2026-08-08 | **Taxonomy proxy crawl coverage** — stop on proxy feature coverage (not homepage keyword buckets); configurable `GHOST_COMPETITOR_PAGES` / `GHOST_COMPETITOR_COVERAGE_STOP`; post-extract crawlQuality bands; all-zero extract → low-confidence limitation; regen cannot fix thin packs |
