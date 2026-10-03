# Ghost Pricing — Product Plan

**Status:** product rules locked; dashboard + dev-simulated checkout implemented  
**Last updated:** 2026-08-04  
**Currency:** INR (₹)

This document is the source of truth for Ghost’s commercial packaging: what each plan includes, who buys it, how upgrades are framed, and how the product experience should feel per tier.

---

## Principles

1. **Every paid plan is complete.** Upgrades are additive (“get more”), never corrective (“unlock what’s missing”).
2. **The one-time buyer is fully served.** ₹499 is an honest, finished product — not a stripped trial designed to frustrate.
3. **Agency pays monthly because their need is monthly.** They’re buying a sales weapon used every week, not a single report.
4. **Free exists to create desire.** Taste the score and the gap; feel why Growth Kit + PDF matter.
5. **Login is required for every scan.** Free, one-time, and Agency — no anonymous audits. Auth (OTP) gates `/api/analyze`; missions and reports always belong to a user account and show on `/dashboard`.

---

## Plan overview

| | Free | Fix My Site | Full Intelligence | Agency |
|---|---|---|---|---|
| **Price** | ₹0 | ₹499 one-time | ₹999 one-time | ₹2,999 / month |
| **Tagline** | Try it | Fix My Site | Full Intelligence | Run Ghost for Clients |
| **Billing** | — | One site, forever | One site, deeper | Monthly, cancel anytime |
| **Account** | Required (login) | Required (login) | Required (login) | Required (login) |
| **Best for** | Taste the product | One site owner | Serious / pre-launch | Agencies & freelancers |

---

## Feature matrix

| Feature | Free | ₹499 | ₹999 | ₹2,999/mo |
|---|---|---|---|---|
| **Audit depth** | Quick | Standard | Deep | Standard + Deep |
| **Pages crawled** | 3 | 8 | 20 | 30 Standard audits / mo (Deep available) |
| **Personas (flows)** | 3 | 10 | 25 | Up to 50 (plan capacity; Deep option) |
| **Ghost Score** | Number only | Full breakdown | Full breakdown | Full breakdown |
| **Ghost Spots** | Top 2, no quotes | All + verbatim quotes | All + quotes | All + quotes |
| **Growth Kit** | No | Yes (complete) | Yes | Yes |
| **PDF export** | No | Yes | Yes | Branded (agency logo + contact) |
| **Competitor intelligence** | No | No | Yes (AI-selected relevant set) | Yes |
| **Industry benchmark** | No | No | Yes | Yes (where applicable) |
| **Re-scan** | No | No | 1 × within 60 days of first deep audit | Unlimited (within monthly quota) |
| **Priority queue** | No | No | Yes | Yes |
| **Agency branding** | No | No | No | Yes |
| **Dashboard** | Personal (missions list) | Personal | Personal | Multi-client |

---

## Auth rule (all plans)

- **Every scan requires login** (OTP / existing Ghost session).
- Guests on marketing `/` who try to scan → `/login?redirect=…&url=…` → after verify, start mission (or land on `/dashboard`).
- Mission rows, reports, and PDFs are always tied to `userId` — re-open from dashboard anytime (subject to plan entitlements).

---

## Plan detail

### 1. Free — always available after login

**Purpose:** Taste the product, feel the gap, want more.

**Includes**
- 1 Quick Scan, any URL (per account — see open questions on Free quota)
- Ghost Score (**number only** — no dimension breakdown)
- Top **2** Ghost Spots — no persona quotes, no fixes
- No PDF, no Growth Kit

**Experience**
- Must sign in before the scan starts
- Fast (target ~under 1–2 minutes)
- Results saved to the user’s dashboard (teaser only)
- Ends with a clear “what you’re missing” CTA into ₹499 / ₹999

**Success metric:** visitor understands Ghost Score + Ghost Spots language and feels the incomplete picture without feeling cheated.

---

### 2. ₹499 — One-Time, One Site (“Fix My Site”)

**Promise:** Everything for one website, once, forever.

**Includes**
- **Standard Audit** — 8 pages, 10 personas
- Full Ghost Score with **breakdown**
- All Ghost Spots with **verbatim persona quotes**
- Complete **Growth Kit** — e.g. pricing section, FAQ, WhatsApp reply, bio rewrite (ready-to-paste)
- **PDF report** they keep
- Valid for that **URL forever** — re-read anytime from their logged-in dashboard
- Account **required** (same login as Free)
- **Purchase-first checkout:** user pays on Plan & Purchases **without entering a URL**; they choose the site in New Audit; the entitlement **binds permanently to that URL when the first paid audit starts** (not at payment)

**Who buys**
- Salon, photographer, coaching institute, clinic — one site
- Want to know what’s wrong; fix themselves or hand PDF to whoever built the site
- Will often never pay again — that’s fine

**Economics (rough)**  
₹499 × 1,000 buyers ≈ ₹5 lakh. Volume + word of mouth matter more than retention on this tier.

**Runtime UX**
- Target ~**2 minutes**
- Stream results live as personas report in — feels instant

---

### 3. ₹999 — One-Time, Deep Audit (“Full Intelligence”)

**Promise:** Complete picture for businesses that want more than a single-site diagnosis.

**Includes everything in ₹499, plus**
- **Deep Audit** — 20 pages, 25 personas
- **Competitor intelligence** — Ghost discovers, validates, and compares the relevant competitors needed to explain the market gap; the set is chosen dynamically rather than fixed by the buyer
- **Industry benchmark** — “your score vs similar businesses”
- **Re-scan voucher** — 1 verification re-scan within **60 days of the first deep audit** on that URL (window starts when the deep audit starts, not at purchase)
- **Priority processing** — front of queue

**Who buys**
- More serious owners
- Anyone who got ₹499 and wants to go deeper
- Pre-launch / redesign moments

**The one conversation**

> “Why should I pay ₹999 when ₹499 exists?”

> “₹499 gives you the full diagnosis of your site. ₹999 adds market intelligence: Ghost identifies the competitors that matter, compares the evidence, and shows what they do differently — plus a re-scan within 60 days of your first deep audit to confirm your fixes worked.”

**Runtime UX**
- Target ~**4–5 minutes**
- Live progress: “Shopper 7 of 25 reporting in… Budget Buyer found a problem on /services” (real updates)
- Optionally offer **email when ready** so they can close the tab
- Wait should feel **earned** because they chose Deep

---

### 4. ₹2,999/month — Agency Plan (“Run Ghost for Clients”)

**Promise:** Ghost as a sales weapon and client delivery tool.

**Includes**
- **30 Standard Audits per month** (enough for most agencies)
- Deep Audit option available (define quota rules in implementation phase — see Open questions)
- **Your logo** on every report — client sees agency brand
- **Multi-client dashboard**
- PDF with **agency contact details**
- Cancel anytime

**Who buys**
- WebAura-style agencies, freelancers, consultants
- One client closed can pay for months of Ghost

**Economics (positioning)**  
₹2,999 is trivial if one scan helps close a ₹30,000 client.

**Runtime UX**
- Queue management; never blocks the whole dashboard
- Email / notification when a client audit completes
- Parallel client missions OK within concurrency limits

---

## Why this packaging works

| Insight | Implication |
|---|---|
| One-time buyer is fully served | ₹499 must include Score breakdown + quotes + Growth Kit + PDF |
| ₹999 is natural depth, not a paywall | Competitor + re-scan + deeper crawl — not “unlock PDF” |
| Agency need is recurring | Monthly seats / audits, branding, multi-client |
| No upsell anxiety | Free shows the gap; paid plans don’t withhold core diagnosis |
| Login for every scan | All missions tied to userId; dashboard is the product home after auth |

---

## Deep-audit time problem (product rules)

| Plan | Target time | UX rule |
|---|---|---|
| Free / Quick | ~1–2 min | Minimal UI; score + 2 spots |
| ₹499 Standard | ~2 min | Live streaming personas |
| ₹999 Deep | ~4–5 min | Rich live progress + optional email delivery |
| Agency | Variable | Queue + notify; dashboard stays usable |

Engine knobs that must eventually map to plans (today’s defaults live in `src/lib/ghost-engine/config.ts`):

| Knob | Free | ₹499 | ₹999 | Agency notes |
|---|---|---|---|---|
| `CRAWL_MAX_PAGES` | 3 | 8 | 20 | Per audit; monthly count for Agency |
| Persona / flow count | 3 | 10 | 25 | Cap swarm size to plan |
| Fixes (`MAX_FIXES`) | 0 | full kit | full kit | Free: no Growth Kit |
| Score UI | number | breakdown | breakdown | Free hides dimensions |
| Spots | top 2, no quotes | all + quotes | all + quotes | Free truncates |
| PDF | off | on | on | Agency: branded template |
| Competitor intelligence | off | off | AI-selected relevant set | Agency: allowed |
| Re-scan | off | off | 1 / 60d from first deep audit | Agency: unlimited in quota |

---

## Funnel & purchase flow (intended)

```text
Guest lands on marketing /
  → Tries scan or “Start free”
  → Login required (OTP)
  → /dashboard (signed-in home)
  → Free Quick Scan (if entitled)
  → Teaser report (score + 2 spots) on /results/:id
  → CTA: Fix My Site ₹499 | Full Intelligence ₹999 | Agency

Paid one-time (₹499 / ₹999)
  → Must be logged in
  → Checkout on Plan & Purchases — **no URL required** (payment provider TBD; dev simulates instantly)
  → Unbound entitlement created (user owns the product; URL not yet chosen)
  → New Audit: user enters URL → chooses “Use your purchase” or buys in-modal when URL is already known
  → Review: confirm permanent URL bind when consuming an unbound voucher
  → First paid audit start binds entitlement to canonical URL **forever** (survives scan failure/abandon — no unbind)
  → Full audit + PDF (+ competitor intel for ₹999, included in Deep audit — not a separate audit type)
  → Re-open forever from dashboard for that bound URL
  → Multiple unbound purchases allowed per tier (oldest voucher used first)

Agency ₹2,999/mo
  → Logged-in account + subscription
  → /dashboard — quota, branding, multi-client missions
```

**Note:** Signed-in product home is `/dashboard` (marketing `/` is guest-only). All plans use the same account; plan only changes audit depth and unlocks.

---

## Entitlements model (implementation sketch)

Shape implemented in dev; real checkout/webhooks TBD:

```text
PlanId: free | one_site_499 | deep_999 | agency_2999

Entitlement {
  userId: string          // always set — login required
  planId
  status: active | inactive
  // one-time — unbound voucher until first paid audit
  siteId?: string | null
  boundUrl?: string | null   // null = “Ready to use” on Plan page
  purchasedAt?: Date
  amountInr?: number
  rescansRemaining?: number  // ₹999: 1
  rescansExpiresAt?: Date | null  // null until first deep audit starts; then +60 days
  // free quota (per user)
  freeScansUsed?: number
  // agency
  auditsUsedPeriod?: number
  auditsLimit?: number
  periodResetAt?: Date
  brandLogoUrl?: string
  brandContact?: string
}
```

**Binding rules (one-time):**
- Plan-page purchase → unbound (`siteId` and `boundUrl` null).
- In-modal purchase (URL known in New Audit) → may bind immediately at purchase.
- Otherwise bind at **successful first paid audit start** (`POST /api/analyze`), before the background scan — not when the scan completes.
- Once bound, URL cannot change; failed/incomplete missions do **not** restore the voucher.

Checkout, webhooks, and PDF branding remain **out of scope** until payment provider is chosen.

---

## Landing page pricing section (copy alignment)

Replace placeholder tiers in `src/lib/copy.ts` (`copy.landing.pricing`) with this structure:

| Card | Name | Price | CTA |
|---|---|---|---|
| 1 | Free | ₹0 | Start free scan |
| 2 | Fix My Site | ₹499 one-time | Get the report |
| 3 | Full Intelligence | ₹999 one-time | Get deep audit |
| 4 | Agency | ₹2,999/mo | Start agency plan |

Include the comparison table (from product marketing) and the ₹499 vs ₹999 FAQ answer above.

---

## Phased delivery (when we leave planning)

### Phase A — Product rules in the engine (no payments)
- Plan → crawl pages / persona caps / score UI / spots / fixes / PDF gates
- Free teaser report path
- Wire UI to show/hide Growth Kit + breakdown by entitlement (hardcode “full” for logged-in/dev until payments)

### Phase B — One-time checkout (₹499 / ₹999)
- Payment provider
- **Purchase-first Plan page** (no URL at checkout); unbound voucher → bind on first audit
- URL-bound entitlement + PDF forever after bind
- ₹999: competitor intel as part of Deep audit; re-scan voucher (60d from first deep audit); priority flag

### Phase C — Agency subscription
- Stripe/Razorpay subscriptions
- Monthly quota (30 Standard)
- Logo + contact on PDF
- Multi-client dashboard polish

### Phase D — Polish
- Email-when-ready for Deep
- Queue UI for Agency
- Industry benchmark data source

---

## Open questions (resolve before Phase B)

1. **Payment provider:** Razorpay vs Stripe (India-first → lean Razorpay)?
2. **Agency Deep audits:** count as 1 Standard, 2 Standard, or separate monthly Deep allotment?
3. **Free scan quota per account:** 1 lifetime, 1 per month, or 1 per URL?
4. **Free abuse after login:** still rate-limit by account + IP?
5. **Competitor discovery budget:** what internal search/crawl ceiling keeps the AI-selected set useful and commercially sustainable? This is a system safety limit, not a promised competitor count.
6. **“Forever” hosting:** store report JSON + PDF in Supabase (already partly done for PDF); retention policy?
7. **GST / invoices:** required on ₹499/₹999 receipts?

---

## Explicit non-goals (for now)

- Building payment checkout
- Changing Ghost Score formula
- Redesigning `/profile` beyond entitlement display
- Discount codes / annual Agency pricing (can add later)

---

## Related product surfaces

| Surface | Role under this pricing |
|---|---|
| `/` marketing | Sell Free + paid; guests only when signed out |
| `/login` | Required before any scan |
| `/dashboard` | All signed-in users — start scans, missions list (Agency = multi-client) |
| `/mission/[id]` | Live audit UX (Standard stream vs Deep progress); auth required |
| `/results/[id]` | Teaser vs full report by entitlement; auth required |
| PDF API / Storage | Paid + Agency branded; Free blocked |

---

## Decision log

| Date | Decision |
|---|---|
| 2026-08-03 | Four-tier packaging locked: Free / ₹499 / ₹999 / ₹2,999/mo |
| 2026-08-03 | ₹499 is complete diagnosis (not PDF-gated); ₹999 adds competitor + re-scan + depth |
| 2026-08-03 | **Login required for every scan** (Free included); no anonymous audits |
| 2026-08-03 | This file is planning-only until an implementation plan is approved |
| 2026-08-04 | **Purchase-first checkout:** Plan page buy without URL; unbound voucher binds on first paid audit start |
| 2026-08-04 | **Re-scan window** starts at first deep audit use (+60 days), not at purchase |
| 2026-08-04 | **Audit types** for missions/filters: Quick, Standard, Deep, Re-scan only (competitor intel is part of Deep, not a separate type) |
| 2026-08-07 | **Market Intelligence UX** — ₹999 Deep still includes AI-selected competitor set; presentation is business themes + evidence (not a fixed competitor count or raw score theater). Detail: `dashboard-plan.md` §6 / §F |
