import type { MissionStage } from "./types";

/* ─── Ghost brand copy system ───────────────────────────────────────────────
   Tone: playful + mysterious on the surface, professional on insights.
   One voice everywhere — fun like a product, serious on business impact.
────────────────────────────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════════════════════
   PLACEHOLDER VALUES — REPLACE BEFORE LAUNCH

   Trust contact details below may still be placeholders. Swap them where you
   see the `⚠ PLACEHOLDER` markers:
     • copy.landing.trust.stats[].value
     • copy.footer.contact.email / .demoUrl
   Landing pricing tiers match PRODUCT_PRICES_INR / PLAN_LABELS in plans.ts.
   The sample report (copy.landing.sample) uses the IANA-reserved
   `.example` TLD so it can never be mistaken for a real client's audit.
   Replace it with a real scan once you have a client's written consent.
   ═══════════════════════════════════════════════════════════════════════════ */

export const copy = {
  meta: {
    title: "Ghost — Website audits with a clear next step",
    description:
      "AI website audits for business owners and agencies. Find conversion friction, review page evidence, and turn recommendations into tracked improvements.",
    keywords: [
      "website audit India",
      "conversion audit for small business",
      "why customers leave my website",
      "website conversion checklist India",
      "white label website audit for agencies",
      "AI mystery shopper",
      "conversion rate optimization",
      "customer experience audit",
    ],
  },

  brand: {
    name: "Ghost",
    wordmark: "GHOST",
    tagline: "See through your customers' eyes.",
    alt: "Ghost",
  },

  common: {
    releaseGhostAgents: "Start an audit",
    deploying: "Deploying...",
    loading: "Loading...",
    newAnalysis: "New audit",
    backToHome: "Back to home",
    copy: "Copy",
    copied: "Copied",
    live: "Live",
    chevron: "›",
    separator: "/",
    scannedPrefix: "Scanned ",
    analyzingPrefix: "Analyzing ",
    locationPrefix: "📍 ",
    urlPrefix: "https://",
    scoreOutOf: "/ 100",
    issuesCount: (n: number) => `${n} ${n === 1 ? "finding" : "findings"}`,
    dropOffRate: (rate: number) => `${rate}% ghosted here`,
  },

  nav: {
    intelligence: "Intelligence",
    howItWorks: "How it works",
    sample: "Sample report",
    pricing: "Pricing",
    agencies: "For agencies",
    personas: "Personas",
    faq: "FAQ",
    home: "Home",
    dashboard: "Dashboard",
    profile: "Settings",
    signIn: "Sign in",
    signOut: "Sign out",
  },

  dashboard: {
    title: "Dashboard",
    subtitle: "Start a new scan or revisit recent missions.",
    scanLabel: "Start a new scan",
    urlPlaceholder: "https://yourwebsite.com",
    emptyTitle: "Start with your first website",
    emptyBody: "Add a website to find conversion friction and build your improvement plan.",
    recentTitle: "Recent missions",
    viewAllProfile: "Account & settings",
  },

  dashboardShell: {
    newAudit: "New audit",
    newAuditShort: "Audit",
    searchPlaceholder: "Search sites or audits",
    notifications: "Notifications",
    nav: {
      overview: "Overview",
      sites: "Websites",
      clients: "Clients",
      audits: "Audits",
      fixes: "Fixes",
      comparisons: "Comparisons",
      plan: "Plan & access",
      branding: "Report branding",
      settings: "Settings",
    },
    mobileNav: {
      overview: "Overview",
      audits: "Audits",
      fixes: "Fixes",
      more: "More",
    },
    pages: {
      overview: "Overview",
      settings: "Settings",
      sites: "Websites",
      audits: "Audits",
      plan: "Plan & access",
      fixes: "Fixes",
      comparisons: "Comparisons",
      clients: "Clients",
      branding: "Report branding",
    },
  },

  dashboardClients: {
    subtitle: "Manage client websites and run audits from your monthly quota.",
    emptyTitle: "Add your first client",
    emptyBody: "Create a client to start running Standard audits for their website.",
    addClient: "Add client",
    name: "Client name",
    domain: "Primary domain",
    referenceId: "Reference ID (optional)",
    latestScore: "Latest score",
    criticalSpots: "Critical spots",
    lastAudit: "Last audit",
    newAudit: "New audit",
    viewClient: "View client",
    archived: "Archived",
    tabs: {
      overview: "Overview",
      audits: "Audits",
      fixes: "Fixes",
    },
  },

  dashboardBranding: {
    subtitle: "Your logo and contact details appear on every client PDF report.",
    agencyName: "Agency name",
    contactEmail: "Contact email",
    contactPhone: "Phone",
    website: "Website",
    accentColor: "Accent color",
    logo: "Agency logo",
    uploadLogo: "Upload logo",
    save: "Save branding",
    saved: "Branding saved",
  },

  dashboardAgency: {
    quotaTitle: "Monthly audit quota",
    quotaExhaustedTitle: "30 of 30 Standard audits used",
    quotaExhaustedBody: "Your quota resets on the date shown below. View completed audits or manage your plan.",
    queueTitle: "Running client audits",
    subscribeCta: "Start Agency plan",
    subscribeNote: "Dev mode: subscription is simulated instantly.",
    manageBranding: "Manage report branding",
    features: [
      "30 Standard audits per month",
      "Multi-client dashboard",
      "Branded PDF reports",
    ],
  },

  dashboardFilters: {
    savePreset: "Save filter",
    presetNamePlaceholder: "Preset name",
    clear: "Clear filters",
    dateFrom: "From",
    dateTo: "To",
    client: "Client",
  },

  dashboardBulk: {
    selected: (n: number) => `${n} selected`,
    clear: "Clear selection",
    openReports: "Open reports",
    downloadPdfs: "Download PDFs",
    markPlanned: "Mark planned",
    markImplemented: "Mark implemented",
    confirmOpen: (n: number) => `Open ${n} reports in new tabs?`,
    maxOpen: "Select at most 10 complete audits to open.",
  },

  dashboardAuditSetup: {
    title: "Audit setup",
    auditType: "Audit type",
    limits: "Depth",
    pages: "Pages",
    personas: "Shoppers",
    client: "Client",
    sources: {
      user: "Confirmed",
      inherited: "Inherited",
      inferred: "Inferred",
      plan: "Plan",
    },
  },

  /** Outcome-oriented depth (never expose page/persona quotas in buyer UI). */
  auditDepth: {
    label: "Depth",
    quick: {
      title: "Quick look",
      body: "Ghost checks your main customer paths",
    },
    standard: {
      title: "Full site diagnosis",
      body: "Ghost crawls the pages it can find across your site",
    },
    deep: {
      title: "Full market intelligence",
      body: "Site-wide crawl plus competitor comparison",
    },
    rescan: {
      title: "Verify changes",
      body: "Ghost re-checks your site after you ship fixes",
    },
  },

  dashboardBenchmarks: {
    title: "Industry comparison",
    placeholder:
      "Industry comparison — available when Ghost has enough audits in your category.",
  },

  dashboardFixes: {
    subtitle: "Track recommended fixes from your paid audits through implementation and verification.",
    columns: {
      recommended: "Recommended",
      planned: "Planned",
      implemented: "Implemented",
      verified: "Verified",
    },
    emptyFreeTitle: "suggested fixes unlock with a paid audit",
    emptyFreeBody:
      "Purchase Fix My Site or Full Intelligence to see every finding with ready-to-paste fixes here.",
    emptyPaidTitle: "No fixes yet",
    emptyPaidBody:
      "Recommended fixes appear here after a Full Intelligence audit finishes. If you just completed a scan, try clearing the site filter.",
    filters: {
      site: "Site",
      severity: "Severity",
      status: "Status",
      category: "Category",
      all: "All",
    },
    actions: {
      copy: "Copy fix",
      viewReport: "View source report",
      verifyRescan: "Verify with re-scan",
      updateStatus: "Update status",
      showMore: (remaining: number) => `Show ${remaining} more`,
    },
    severity: {
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
    },
  },

  dashboardComparisons: {
    subtitle:
      "Compare each site in its market, and see how scores change after verification re-scans.",
    selectSite: "Site",
    rescanTitle: "Before / after re-scan",
    marketTitle: "Market intelligence",
    marketBody:
      "Feature-normalized comparison against AI-selected competitors. Included with Full Intelligence deep audits.",
    marketCta: "Start deep audit",
    marketEmpty: "Run a Full Intelligence deep audit to unlock market gaps and competitor cards.",
    marketLoading: "Loading market data…",
    loadError: "Could not load comparison data. Please try again.",
    loadingComparison: "Loading comparison…",
    selectPair: "Comparison",
    originalScore: "Original score",
    currentScore: "Current score",
    scoreDelta: "Change",
    resolved: "Resolved findings",
    persistent: "Still present",
    newLeaks: "New findings",
    dimensions: "Score dimensions",
    verifiedFixes: "Verified fixes",
    lowConfidence: "One or both scans had limited crawl confidence — treat deltas as directional.",
    emptyTitle: "No comparisons yet",
    emptyBody: "Run a verification re-scan on a Full Intelligence site to compare before and after.",
    intelInProgressTitle: "Competitor research in progress",
    intelInProgressBody:
      "Your site audit is complete. Ghost is still comparing this site against competitors — this page will update when market intelligence is ready.",
    viewMarket: "Comparisons",
  },

  marketIntelligence: {
    title: "Market intelligence",
    subtitle: (category: string, competitorCount: number) =>
      `How your site compares on ${category} against ${competitorCount} relevant competitor${competitorCount === 1 ? "" : "s"}.`,
    executiveSummaryTitle: "Executive summary",
    verdictTitle: "Verdict",
    topActionsTitle: "Top actions",
    sideBySideTitle: "You vs competitor",
    compareAgainst: "Compare against",
    competitorProfilesTitle: "Competitor profiles",
    appendixTitle: "Detailed feature comparison",
    appendixHint:
      "Taxonomy-level score matrix. Delta is you − market (+ ahead, − behind). Unknowns show as — , never as zero.",
    whyItMatters: "Why it matters",
    actionLabel: "Recommended action",
    youLabel: "Your website",
    competitorLabel: "Competitor",
    notFound: "Not found",
    unknownDash: "—",
    themeScoreLabel: "Score",
    themeIncludes: "Includes",
    standingBehind: "Behind",
    standingAhead: "Ahead",
    standingSimilar: "Similar",
    standingUnknown: "Unknown",
    themeSummaryStrip: (s: {
      themeCount: number;
      behind: number;
      ahead: number;
      similar: number;
    }) =>
      `Compared across ${s.themeCount} themes · Behind ${s.behind} · Ahead ${s.ahead} · Similar ${s.similar}`,
    whoDoesBetter: "Who does this better",
    crawlQuality: "Crawl quality",
    crawlQualityGood: "Good",
    crawlQualityPartial: "Partial",
    crawlQualityWeak: "Weak",
    evidenceConfidence: "Confidence",
    confidenceVerified: "Verified",
    confidenceSummarized: "Summarized",
    confidenceInferred: "Inferred",
    confidenceScoreOnly: "Score only",
    confidenceNotObserved: "Not observed",
    confidenceNotCrawled: "Not crawled",
    whySelected: "Why selected",
    needsRegenSideBySide:
      "Side-by-side evidence needs a refreshed market intelligence run (feature maps were not stored on this audit).",
    fairSetUnavailable:
      "Not enough usable competitors for a fair market average. Add hints or regenerate after a stronger crawl.",
    thinEvidenceSideBySide:
      "Not enough observed page evidence for a side-by-side yet. Regenerate after a stronger crawl, or add competitor hints.",
    coverageTitle: "Coverage",
    gapEvidence: "Evidence",
    gapImpact: "Impact",
    gapRecommendation: "Recommendation",
    viewRelatedFix: "View related fix",
    competitorsTitle: "Competitors analyzed",
    relevance: "Relevance",
    matchQuality: "Match quality",
    matchQualityHint: "Derived from feature coverage — not customer reviews",
    topStrengths: "Top strengths",
    weaknesses: "Weaknesses",
    viewEvidence: "View evidence",
    noneListed: "Not enough crawl evidence",
    expectationsTitle: "Market expectations",
    youVsMarketTitle: "Your site vs market",
    youVsMarketYou: "You",
    youVsMarketMarket: "Market",
    youVsMarketDelta: "Gap",
    marketScore: "Market score",
    breakdown: "Breakdown",
    scoreComparison: (owner: number, market: number) => `You: ${owner} · Market avg: ${market}`,
    missingCriteriaLabel: "Missing vs market",
    feature: "Feature",
    prevalence: "Prevalence",
    limitations: "Limitations",
    criterionStatus: {
      present: "present",
      partial: "partial",
      absent: "absent",
    } as const,
    noGaps: "No evidence-backed actions for this comparison set yet.",
    noActions: "No verified gaps ranked — crawl coverage may be too thin.",
    loading: "Loading market intelligence…",
    regenerate: "Regenerate comparison",
    regenerating: "Regenerating…",
    regenerateSuccess:
      "Market intelligence updated from cached competitor crawls. If scores stay empty, run a new Deep audit — regenerate cannot fix thin crawl packs.",
    regenerateError: "Could not regenerate market intelligence.",
    regenerateCooldown:
      "Market intelligence was just regenerated. Wait a few minutes before trying again.",
    intelFailureTitle: "Market intelligence couldn't be completed",
    intelFailureBody:
      "Your site audit is complete; competitor comparison is unavailable.",
    intelFailureRegenerateCta: "Regenerate market intelligence",
    intelFailureNewAuditCta: "Run a new Deep audit",
    thinCrawlHint:
      "Crawl coverage was too thin for a confident taxonomy comparison. A new Deep audit (not regenerate) is needed after raising the page budget.",
    downloadPdf: "Download PDF",
    gapsTitle: "Market gaps",
  },

  dashboardEmails: {
    auditCompleteSubject: (domain: string) => `Ghost audit complete — ${domain}`,
    auditCompleteHeading: "Your Ghost audit is ready",
    auditCompleteBody: (domain: string, score: number, criticalCount: number) =>
      `Ghost finished auditing ${domain}. Score: ${Math.round(score)}.${criticalCount > 0 ? ` ${criticalCount} critical finding${criticalCount === 1 ? "" : "s"} need attention.` : ""}`,
    auditCompleteText: (domain: string, score: number, reportUrl: string) =>
      `Your Ghost audit for ${domain} is complete. Score: ${Math.round(score)}. View report: ${reportUrl}`,
    rescanExpirySubject: (daysLeft: number) =>
      daysLeft <= 3
        ? "Your Ghost re-scan expires soon"
        : "Reminder: Ghost re-scan entitlement expiring",
    rescanExpiryHeading: (daysLeft: number) =>
      daysLeft <= 3 ? "Re-scan expires in a few days" : "Re-scan entitlement reminder",
    rescanExpiryBody: (domain: string, expiryLabel: string, daysLeft: number) =>
      `Your verification re-scan for ${domain} expires on ${expiryLabel} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left). Use it to confirm your fixes worked.`,
    rescanExpiryText: (domain: string, expiryLabel: string, daysLeft: number, dashboardUrl: string) =>
      `Re-scan for ${domain} expires ${expiryLabel} (${daysLeft} days left). Start verification: ${dashboardUrl}`,
    viewReport: "View report",
    startRescan: "Start re-scan",
  },

  dashboardOverview: {
    greeting: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
    },
    subtitle: "Here is what Ghost found across your sites.",
    scanLabel: "Start a Ghost audit",
    urlPlaceholder: "https://yourwebsite.com",
    emptyTitle: "Your first Ghost mission starts here",
    emptyBody: "Enter a website and see why customers may be leaving.",
    attentionTitle: "Attention required",
    attentionClear: "No urgent items right now. Keep an eye on running audits below.",
    recentTitle: "Recent audits",
    cards: {
      latestScore: "Latest Ghost Score",
      criticalSpots: "Critical findings",
      fixesImplemented: "Fixes Implemented",
      entitlement: "Entitlement",
      needsAttention: "Needs attention",
      allClear: "None in recent audits",
      fixesHint: "Implemented or verified in Fixes",
    },
    score: {
      noData: "Run an audit to see your score",
      strong: "Strong",
      needsWork: "Needs improvement",
      critical: "Critical gaps found",
    },
    actions: {
      viewReport: "View report",
      continue: "Continue",
      retry: "Retry",
      reviewFix: "Review fix",
      openFix: "Open fix",
      startRescan: "Start re-scan",
      newAudit: "Start audit",
    },
    nextAction: {
      label: "Recommended next action",
      freeTitle: "Unlock the full diagnosis",
      freeBody: "Your free scan shows the score and top spots. Upgrade to see every finding, suggested fixes, and PDF export.",
      freeCta: "Choose an audit",
      fixBody: "Review this finding and its suggested fix before making changes.",
      rescanTitle: "Verify your fixes worked",
      rescanBody: "Your re-scan entitlement is still available. Run a verification scan to confirm improvements.",
      defaultTitle: "Run your next audit",
      defaultBody: "Keep monitoring your site as you ship changes.",
    },
  },

  dashboardSettings: {
    subtitle: "Account, preferences, and exports.",
    accountTitle: "Account",
    emailLabel: "Email",
    memberSince: "Member since",
    preferencesTitle: "Preferences",
    compactLists: "Compact lists",
    compactListsDesc: "Tighter rows for faster scanning.",
    reduceMotion: "Reduce motion",
    reduceMotionDesc: "Limit motion throughout Ghost. Your device’s reduced-motion preference is also respected.",
    preferencesNote: "Saved on this browser and applied across your workspace.",
    exportsTitle: "Exports",
    exportsBody:
      "Download any completed audit as a PDF from the report page. PDFs stay available for purchased sites.",
  },

  dashboardSites: {
    subtitle: "Your websites and what Ghost found on each.",
    emptyTitle: "No sites yet",
    emptyBody: "Run your first audit to add a site here.",
    active: "Active",
    archived: "Archived",
    lastScan: "Last scanned",
    unresolved: "Unresolved issues",
    actions: {
      viewReport: "View report",
      newAudit: "New audit",
      archive: "Archive",
      restore: "Restore",
      purchase: "Purchase audit",
    },
  },

  dashboardAudits: {
    subtitle: "Review completed reports and keep track of audits in progress.",
    empty: "No audits match your filters.",
    filters: {
      search: "Search domain or client",
      status: "Status",
      type: "Audit type",
      all: "All",
      queued: "Queued",
    },
    columns: {
      site: "Site",
      type: "Type",
      depth: "Depth",
      shoppers: "Depth",
      score: "Score",
      status: "Status",
      started: "Started",
    },
    intelInProgress: "Competitor research",
    viewComparisons: "Comparisons",
  },

  dashboardPlan: {
    subtitle: "Your plan, purchases, and what's included.",
    freeStatus: "Free scan",
    freeAvailable: "Available",
    freeUsed: "Used",
    ownedTitle: "Owned reports",
    noPurchases: "No purchases yet — choose a plan below.",
    upgradeTitle: "Upgrade options",
    agencyTitle: "Agency plan",
    agencyBody: "Multi-client dashboard, monthly audit quota, and branded PDF reports.",
    agencyActive: "Subscription active",
    permanentAccess: "Permanent access for this URL",
    purchaseCta: "Get this plan",
    purchaseIntro: "Pay once — choose your website when you run your first audit.",
    purchaseReady: "Ready to use",
    purchaseBindOnFirstAudit: "Your first audit will lock this report to one website.",
    purchaseSuccess: "Purchase complete — run your first audit when you're ready.",
    runFirstAudit: "Run your first audit",
    unboundCount: (count: number, label: string) =>
      `${count} ${label} report${count === 1 ? "" : "s"} ready to use`,
    devPurchaseNote: "Dev mode: purchase is simulated instantly.",
  },

  newAudit: {
    title: "New audit",
    stepLabel: (step: number, total: number) => `Step ${step} of ${total}`,
    noOptions: "No audits available for this URL. Check your plan or try a different site.",
    rescan: {
      implementedFixes: "Fixes you implemented",
      implementedFixesHint: "Select the fixes you applied before verification.",
      noImplementedFixes: "No fixes marked implemented yet. You can still run a verification re-scan.",
      baseline: "Baseline audit",
      selectedFixes: "Implemented fixes selected",
      entitlement: "Re-scan entitlement",
    },
    fields: {
      client: "Client (optional)",
      url: "Website URL",
      businessName: "Business name (optional)",
      businessNamePlaceholder: "Inferred during audit if blank",
      authorization: "I confirm I am authorized to audit this public website.",
      primaryGoal: "Primary conversion goal (optional)",
      audience: "Target customer or location (optional)",
      importantPage: "Important page (optional)",
      competitorHints: "Competitor or market hints (optional)",
    },
    review: {
      purchaseIntro: "Simulated checkout — no real payment in dev mode.",
      rescanTitle: "Verify changes on",
      bindWarning: (domain: string) =>
        `This purchase will permanently apply to ${domain}.`,
      bindConfirm: "I understand this purchase will permanently apply to this URL.",
    },
    actions: {
      back: "Back",
      continue: "Continue",
      startAudit: "Start Ghost audit",
      startVerification: "Start verification scan",
      continueToPayment: "Complete purchase",
    },
    errors: {
      urlRequired: "Enter a website URL.",
      authRequired: "Confirm you are authorized to audit this site.",
      bindRequired: "Confirm this purchase will apply permanently to this URL.",
      choiceRequired: "Choose an audit type.",
      optionsFailed: "Could not load available audits.",
      purchaseFailed: "Purchase could not be completed.",
      startFailed: "Could not start the audit.",
    },
  },

  footer: {
    description:
      "AI mystery shopper intelligence — see where customers ghost your business.",
    bullets: [
      "Deploy virtual shoppers",
      "Find where customers ghost",
      "Get your suggested fixes",
    ],
    contact: {
      label: "Talk to us",
      // ⚠ PLACEHOLDER — replace with your real inbox
      email: "hello@REPLACE-ME.example",
      emailLabel: "Email",
      // ⚠ PLACEHOLDER — replace with your real booking link
      demoUrl: "https://REPLACE-ME.example/book-a-demo",
      demoLabel: "Book a demo",
      response: "Agency enquiries answered within one business day.",
    },
    copyright: (year: number) =>
      `© ${year} Ghost AI. All rights reserved.`,
    poweredBy: {
      label: "Powered by",
      brand: "WEBAURA",
      url: "https://webauraindia.com",
    },
  },

  landing: {
    hero: {
      eyebrow:
        "SEE THROUGH YOUR CUSTOMERS' EYES — AI SHOPPER INTELLIGENCE",
      title: "GHOST",
      scannerVersion: "TARGET SCANNER v1.0",
      urlPlaceholder: "Enter store URL or Shopify link...",
      badge: "For E-Commerce & Retail Brands Only",
      description:
        "Paste any link. Ghost summons AI shoppers to walk your site like real customers — finding drop-offs, leaks, and fixes in under 2 minutes.",
      vsAnalytics:
        "Google Analytics tells you what happened. Ghost tells you why — and writes the fix.",
    },

    trust: {
      stats: [
        { value: "240+", label: "sites scanned by Ghost" },
        { value: "85+", label: "client projects delivered by WebAura" },
        { value: "1.8 min", label: "average time to a full report" },
        { value: "12", label: "agencies running Ghost white-label" },
      ],
      builtBy: "Built by WebAura",
    },

    mindset: {
      label: "The Ghost intelligence",
      heading: "The Ghost intelligence",
      pillars: [
        {
          title: "Walk in their shoes.",
          subtitle:
            "If AI shoppers can't finish the journey, your real customers won't either.",
        },
        {
          title: "Ghosting has a cost.",
          subtitle:
            "Every drop-off is revenue walking out the door. Ghost finds where and why.",
        },
        {
          title: "Swarm, don't guess.",
          subtitle:
            "One link. A full swarm of AI shoppers walks your site in minutes — showing you exactly where customers ghost, not where you think they do.",
        },
        {
          title: "Fix it. Ship it.",
          subtitle:
            "Your suggested fixes include — headlines, CTAs, trust signals, and more.",
        },
      ],
    },

    program: {
      label: "Shape of the system",
      heading: "Shape of the system",
      stepPrefix: (n: number) => `Step ${String(n).padStart(2, "0")}`,
      steps: [
        {
          title: "Scan",
          description:
            "Ghost agents slip into your site, map every page, and trace the paths customers take — and abandon.",
        },
        {
          title: "Deploy",
          description:
            "AI shoppers with real personalities walk pricing, trust, speed, and navigation — just like your visitors would.",
        },
        {
          title: "Report",
          description:
            "Get your Ghost Score, findings on the journey, shopper feedback, and suggested fixes you can review and use.",
        },
      ],
    },

  personas: {
    label: "AI shoppers deployed",
    heading: "Shoppers in the wild",
    headingAccent: "Shoppers",
    scrollHint: "Scroll to meet some of the AI shoppers Ghost can deploy",
    activeBadge: "On mission",
    quoteLabel: "What this shopper actually said",
    items: [
        {
          name: "Budget Buyer",
          problem: "Pricing",
          quote:
            "Your services page lists 9 treatments and prices only 3 — I wanted the bridal package, so I left.",
          action:
            "Ghost hunts every page for price transparency and hidden fees.",
        },
        {
          name: "First Time Visitor",
          problem: "Trust",
          quote:
            "The About page is one paragraph and there are no reviews anywhere. I have no idea if you're a real studio.",
          action:
            "Ghost searches for reviews, testimonials, and credibility markers.",
        },
        {
          name: "Premium Customer",
          problem: "Value",
          quote:
            "You say 'premium' four times but never say what I get that the salon down the road doesn't.",
          action:
            "Ghost compares your offering against premium expectations.",
        },
        {
          name: "Busy Customer",
          problem: "Speed",
          quote:
            "Your gallery loaded 4.8 seconds on my phone. I was booking between meetings — I gave up.",
          action:
            "Ghost times every interaction and flags performance friction.",
        },
        {
          name: "Confused Customer",
          problem: "Navigation",
          quote:
            "I clicked Services, then Packages, then Offers, and ended up back on the homepage. Where do I book?",
          action:
            "Ghost tests every menu path and documents where shoppers get lost.",
        },
        {
          name: "Comparison Shopper",
          problem: "Clarity",
          quote:
            "I had three tabs open. The other two explained the difference between their plans immediately, so I chose one of them.",
          action:
            "Ghost compares how quickly your offer answers a shopper's deciding questions.",
        },
        {
          name: "Urgent Customer",
          problem: "Availability",
          quote:
            "I needed this today, but I couldn't tell whether you were available or when anyone would reply, so I called someone else.",
          action:
            "Ghost checks whether time-sensitive visitors can get a clear answer fast.",
        },
        {
          name: "Slow Network Shopper",
          problem: "Accessibility",
          quote:
            "The hero image was still loading when I left. I never reached the services or the booking button.",
          action:
            "Ghost tests whether essential content survives slow devices and connections.",
        },
      ],
    },

    finale: {
      label: "Intelligence delivered",
      heading: "Report finale",
      subtitle: "Every scan delivers",
      outcomes: [
        {
          title: "Ghost Score",
          description:
            "A 0–100 rating of how often customers ghost your business — with an animated breakdown.",
        },
        {
          title: "Ghost Spot Detection",
          description:
            "Prioritized places customers disappear — with severity, impact, and step-by-step fixes.",
        },
        {
          title: "Suggested fixes",
          description:
            "Instant AI-generated content, CTAs, FAQs, WhatsApp replies, and trust signals.",
        },
      ],
    },

    /* A distilled, real-shaped Ghost report shown before the visitor is asked
       for anything. Uses the IANA-reserved `.example` TLD — see the
       PLACEHOLDER banner at the top of this file. */
    sample: {
      label: "See it before you paste anything",
      heading: "This is the report",
      headingAccent: "report",
      subtitle:
        "An illustrative report for a fictional studio: a score, supporting evidence, and a suggested fix.",
      badge: "Sample report",
      badgeNote: "Fictional business — your report is generated from your site.",
      scannedLabel: "Scanned",
      domain: "bridalstudio.example",
      businessType: "Bridal & beauty studio · Hyderabad",
      score: 62,
      spotsLabel: "Findings found",
      spotsCount: 7,
      showingLabel: "Showing 2 of 7",
      quoteAttribution: (persona: string) => `${persona} · AI simulation`,
      spots: [
        {
          id: "sample-spot-1",
          title: "Bridal package has no price anywhere",
          severity: "critical" as const,
          category: "Pricing",
          persona: "Budget Buyer",
          quote:
            "Your services page lists 9 treatments and prices only 3 — I wanted the bridal package, so I left.",
          whatIsWrong:
            "Nine services are listed. Three show a price. The bridal package — your highest-value offer — says 'Contact for details'.",
          impact: "Highest-value enquiry path, no price signal",
        },
        {
          id: "sample-spot-2",
          title: "No reviews on any page a first-timer sees",
          severity: "high" as const,
          category: "Trust",
          persona: "First Time Visitor",
          quote:
            "The About page is one paragraph and there are no reviews anywhere. I have no idea if you're a real studio.",
          whatIsWrong:
            "You have 40+ Google reviews at 4.7★. None of them appear on the homepage, services page, or booking form.",
          impact: "Proof exists off-site but never reaches the visitor",
        },
      ],
      fix: {
        label: "One suggested fix",
        category: "Pricing block",
        title: "Bridal package price card",
        usageHint: "Paste directly under the bridal section of your services page.",
        content:
          "Bridal Package — ₹18,500\nHair, makeup, draping and one trial. 5 hours, at our studio or your venue (within city limits).\n\nAdd-ons: Family makeup ₹2,500 per person · Outstation travel quoted separately.\n\nHalf the amount holds your date. Balance on the day.",
        note: "Ghost writes these against your actual services and price points — the example above is fictional.",
      },
      cta: "Run this on your own site",
    },

    pricing: {
      label: "Pricing",
      heading: "What it costs",
      headingAccent: "costs",
      subtitle:
        "A tool that flags missing prices should show its own. Every plan includes the full report — no partial results.",
      currencyNote: "Prices in INR, exclusive of GST.",
      popularBadge: "Most popular",
      tiers: [
        {
          id: "free",
          name: "Free",
          price: "₹0",
          cadence: "one site",
          description: "See your Ghost Score and your top findings.",
          features: [
            "Ghost Score (number only)",
            "Top 2 findings",
          ],
          cta: "Run a free scan",
          highlighted: false,
        },
        {
          id: "one_site_499",
          name: "Fix My Site",
          price: "₹499",
          cadence: "per site",
          description: "A detailed site review, suggested fixes, and a downloadable report.",
          features: [
            "Full score breakdown",
            "All findings with simulated perspectives",
            "suggested fixes",
            "PDF export",
          ],
          cta: "Get Fix My Site",
          highlighted: false,
        },
        {
          id: "deep_999",
          name: "Full Intelligence",
          price: "₹999",
          cadence: "per site",
          description:
            "Deep audit, competitor intelligence, and 1 re-scan within 60 days.",
          features: [
            "Everything in Fix My Site",
            "Competitor market intelligence",
            "Side-by-side theme comparison",
            "1 re-scan within 60 days",
          ],
          cta: "Get Full Intelligence",
          highlighted: true,
        },
        {
          id: "agency_2999",
          name: "Agency",
          price: "₹2,999",
          cadence: "per month",
          description: "Run Ghost as your own audit engine for client sites.",
          features: [
            "30 Standard audits / month",
            "Multi-client dashboard",
            "White-label / branded PDFs",
            "Client organization and audit tracking",
          ],
          cta: "Talk to us",
          highlighted: false,
        },
      ],
    },

    agency: {
      label: "For agencies & freelancers",
      heading: "Run an agency? Ghost is your audit engine.",
      headingAccent: "audit engine",
      body:
        "Stop writing website audits by hand. Point Ghost at a prospect's site, get a branded report in minutes, and walk into the pitch already knowing what's broken. White-label it as yours — your logo, your domain, your recommendations.",
      points: [
        {
          title: "Win the pitch",
          description:
            "Show up to the first call with a real audit instead of a proposal template.",
        },
        {
          title: "Your branding, not ours",
          description:
            "White-label reports carry your logo and your name. Ghost stays invisible.",
        },
        {
          title: "Scans in bulk",
          description:
            "Queue an entire prospect list and get every report back in one batch.",
        },
      ],
      cta: "Talk to us about white-label",
    },

    faq: {
      label: "Got questions?",
      heading: "Got Questions?",
      headingAccent: "Questions?",
      expandIcon: "+",
      items: [
        { q: "What does Ghost actually check?", a: "Ghost crawls accessible public pages and uses AI to simulate customer journeys. It reviews clarity, pricing information, trust signals, navigation, and routes to enquiry or purchase. It does not submit orders or contact your customers." },
        { q: "Are the shoppers real people?", a: "No. Shopper perspectives are AI simulations grounded in the pages Ghost could read. They highlight potential friction, not measured visitor behavior, conversion rates, or guaranteed revenue changes." },
        { q: "Which websites can I audit?", a: "Public business websites, landing pages, and online stores that you are authorized to review. Login-only pages, social profiles, blocked content, and some JavaScript-heavy experiences may not be accessible. Reports flag limited visibility." },
        { q: "How long will my audit take?", a: "Timing depends on the website’s size, accessibility, and audit depth. You can follow progress in the workspace and return later. Competitor research and PDF preparation can continue after the site report is ready." },
        { q: "What does the Ghost Score mean?", a: "It is a 0–100 diagnostic score based on website evidence and simulated journeys across six dimensions. Use it to prioritize investigation and compare re-scans, not as a measurement of conversion or revenue." },
        { q: "Can I publish the suggested fixes immediately?", a: "Review them first. Ghost uses facts found on your site and marks missing information with brackets. Confirm prices, contact details, policies, and claims before publishing. Ghost does not edit your website for you." },
        { q: "How does early access work?", a: "Sign in with an email code to request access. Accounts are manually approved. Approved accounts can run Full Intelligence audits while payments are offline; no payment is collected during early access." },
      ],
    },

    cta: {
      heading: "Ready to see where customers ghost?",
      description:
        "Paste any link. Watch AI shoppers walk your site. Get the intelligence report.",
    },
  },

  auth: {
    backToHome: "Back to home",
    signInTitle: "Sign in to",
    signInAccent: "Ghost",
    loginToAnalyze: (url: string) =>
      `Sign in to analyze ${url} — Ghost agents are standing by.`,
    emailStepDescription:
      "Enter your email to sign in or request early access. We’ll send a one-time code; no password needed.",
    otpStepDescription: (email: string) =>
      `Enter the 6-digit code we sent to ${email}`,
    emailLabel: "Email address",
    emailPlaceholder: "you@company.com",
    sendCode: "Send login code",
    sending: "Sending...",
    verifying: "Verifying...",
    useDifferentEmail: "Use a different email",
    resendCode: "Resend code",
    errors: {
      sendFailed: "Failed to send code.",
      network: "Network error. Please try again.",
      invalidCode: "Invalid code.",
    },
  },

  earlyAccess: {
    title: "You're on the early access list",
    body: "Thanks for verifying your email. Ghost is invite-only right now — we'll update you once you're approved.",
    checking: "Checking approval status…",
    approvedCta: "Continue to Ghost",
    checkAgain: "Check again",
    signOut: "Sign out",
  },

  authApi: {
    invalidEmail: "Please enter a valid email address.",
    tooManyRequests: "Too many requests. Please try again in an hour.",
    devModeTerminal: (email: string) =>
      `Dev mode — check your terminal for the code (${email})`,
    emailNotConfigured: "Email service not configured. Set RESEND_API_KEY.",
    emailSendFailed: "Failed to send email. Check Resend configuration.",
    emailTestModeBlocked:
      "We couldn't send a login code to this email. Check spam, or try a different address.",
    codeSent: (email: string) => `We sent a 6-digit code to ${email}`,
    invalidEmailOrCode: "Invalid email or code.",
    noActiveCode: "No active code found. Request a new one.",
    codeExpired: "Code expired. Request a new one.",
    incorrectCode: "Incorrect code. Please try again.",
    signedIn: "Signed in successfully.",
    somethingWrong: "Something went wrong.",
    emailRequired: "Email is required",
    authRequired: "Authentication required",
    urlRequired: "URL is required",
    missionFailed: "Failed to start mission",
    missionIdRequired: "missionId is required",
    missionNotFound: "Mission not found",
    reportNotFound: "Report not found",
    engineOffline: "Ghost is under maintenance",
    auditConcurrentLimit: (max: number) =>
      `You already have ${max} audit${max === 1 ? "" : "s"} running. Wait for one to finish before starting another.`,
    auditHourlyLimit: (max: number) =>
      `You've reached the limit of ${max} audits per hour. Please try again later.`,
  },

  maintenance: {
    eyebrow: "Temporarily offline",
    title: "Ghost is under maintenance",
    titleAccent: "We'll be back soon",
    body: "Our AI shoppers are resting and recharging. Summoning is paused for a short while — hang tight.",
    bodyWithUrl: (url: string) =>
      `We saved your request for ${url}. Ghost will walk that site as soon as the swarm is back online.`,
    hint: "Try again in a little while. Nothing's wrong with your link.",
    dismiss: "Got it",
    statusLabel: "Status",
    statusValue: "Maintenance mode",
  },

  email: {
    subject: (code: string) => `${code} is your Ghost login code`,
    text: (code: string) =>
      `Your Ghost login code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    heading: "Your login code",
    body: "Enter this code to sign in to Ghost. It expires in 10 minutes.",
    footer: "If you didn't request this code, you can safely ignore this email.",
  },

  mission: {
    reportReady: "Report ready",
    missionActive: "Mission active",
    intelligenceReady: "Intelligence report ready",
    agentsDeployed: "Agents deployed",
    title: "Ghost agents",
    titleAccent: "in motion",
    missionComplete: "Mission complete",
    missionProgress: "Mission progress",
    compilingReport: "Compiling intelligence report...",
    notFound: "Mission not found",
    shoppersActive: "AI shoppers active",
    analyzingFallback: "Analyzing...",
    failed: {
      heading: "The scan hit a snag",
      body: "Ghost couldn't finish auditing this site.",
      retry: "Try again",
      scanAnother: "Scan another site",
    },
  },

  stages: [
    {
      id: "opening" as MissionStage,
      label: "Summoning Ghost agents",
      description: "Agents are slipping into your site — rendering every page",
      duration: 4500,
    },
    {
      id: "understanding" as MissionStage,
      label: "Reading the business",
      description:
        "Ghost is decoding your value proposition and how customers should convert",
      duration: 5500,
    },
    {
      id: "personas" as MissionStage,
      label: "Creating shopper personas",
      description:
        "Building AI customers with real motivations — budget, trust, speed, confusion",
      duration: 4500,
    },
    {
      id: "deploying" as MissionStage,
      label: "Deploying AI shoppers",
      description:
        "Virtual customers are walking your site — clicking, scrolling, deciding",
      duration: 4000,
    },
    {
      id: "testing" as MissionStage,
      label: "Walking the journey",
      description:
        "Shoppers are testing every path — where they hesitate, where they ghost",
      duration: 6500,
    },
    {
      id: "leaks" as MissionStage,
      label: "Detecting findings",
      description:
        "Mapping every place customers disappear — and why they leave",
      duration: 5000,
    },
    {
      id: "generating" as MissionStage,
      label: "Building your suggested fixes",
      description:
        "Compiling Ghost Score, findings, shopper thoughts, and fixes",
      duration: 4000,
    },
  ],

  scan: {
    phases: {
      connecting: "Summoning Ghost agents...",
      fetching: "Shoppers entering your website...",
      rendering: "Walking through pages like real customers...",
      live: "Live scan — shoppers on-site",
      fallback: "Running stealth headless analysis...",
    },
    iframeTitle: "Live site scan",
    previewAlt: (domain: string) => `Preview of ${domain}`,
    elementsScanned: "Elements scanned",
    terminalLabel: "Ghost terminal",
    terminalPrompt: ">",
    analysisSteps: [
      { label: "HEADER", desc: "First impression audit" },
      { label: "HERO CTA", desc: "Will shoppers click?" },
      { label: "NAV MENU", desc: "Can they find their way?" },
      { label: "CONTENT", desc: "Does the message land?" },
      { label: "SOCIAL PROOF", desc: "Trust signal scan" },
      { label: "FOOTER", desc: "Exit path check" },
      { label: "FORM", desc: "Friction & validation scan" },
    ],
    stageLogs: {
      opening: [
        "Summoning Ghost agents to target...",
        "Establishing secure connection...",
        "Shoppers entering the front door...",
        "Reading page structure like a customer would...",
        "Loading styles, images, and scripts...",
        "Site rendered — agents are inside.",
      ],
      understanding: [
        "What does this business actually sell?",
        "Decoding the value proposition...",
        "Tracing primary conversion paths...",
        "Mapping how visitors should navigate...",
        "Hunting for pricing and CTA patterns...",
        "Business context locked in.",
      ],
      personas: [
        "Who shops here — and why do they leave?",
        "Spawning Budget Buyer persona...",
        "Spawning First Time Visitor persona...",
        "Spawning Premium Customer persona...",
        "Calibrating shopper behaviors...",
        "Five AI shoppers ready to deploy.",
      ],
      deploying: [
        "Opening virtual browser swarm...",
        "Injecting AI shoppers into the site...",
        "Budget Buyer heading to pricing...",
        "First Time Visitor checking trust signals...",
        "Busy Customer testing page speed...",
        "All shoppers walking the site.",
      ],
      testing: [
        "Simulating add-to-cart journey...",
        "Testing mobile — would they stay?",
        "Measuring hesitation at every step...",
        "Recording where shoppers pause...",
        "Evaluating form friction...",
        "Stress-testing the checkout path...",
      ],
      leaks: [
        "Cross-referencing drop-off signals...",
        "Found it — pricing isn't visible enough...",
        "Trust signals missing on key pages...",
        "Navigation dead-end detected...",
        "Quantifying revenue impact...",
        "Findings ranked by severity.",
      ],
      generating: [
        "Calculating Ghost Score...",
        "Writing shopper feedback...",
        "Drafting suggested fixes...",
        "Mapping the customer journey...",
        "Finalizing intelligence report...",
        "Report ready — customers won't ghost unnoticed.",
      ],
    } satisfies Record<MissionStage, string[]>,
  },

  severity: {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  },

  results: {
    intelligenceReady: "Intelligence report ready",
    reportNotFound: "Report not found",
    narrateReport: "Narrate report",
    stopSpeech: "Stop speech",
    downloadPdf: "Download PDF",
    scanAnotherHeading: "Scan another",
    scanAnotherAccent: "site?",
    ghostScore: "Ghost Score",
    goToDashboard: "Dashboard",
    goToComparisons: "Comparisons",
    competitorComparisonCta: "View competitor comparison",
    competitorComparisonCtaBody:
      "See how your site stacks up against the market — verdict, themes, and competitor profiles.",
    competitorComparisonCtaNoIntel:
      "Open Comparisons to view market intelligence for this site when available.",
    jumpToMarketIntelligence: "Jump to market intelligence",
    openFullReport: "Open full report",
    scoreLabels: {
      excellent: "Excellent customer experience",
      needsWork: "Healthy, but leaking",
      critical: "Friction needs attention",
      urgent: "Customers are ghosting",
    },
    businessUnderstanding: {
      label: "Business understanding",
      heading: "What Ghost detected",
      businessType: "Business Type",
      targetAudience: "Target Audience",
      primaryGoal: "Primary Goal",
      expectations: "Customer expectations",
    },
    journey: {
      label: "Customer journey",
      heading: "Where customers ghost",
      conversionLeak: "Finding",
      stepSeparator: " › ",
    },
    leaks: {
      label: "Findings",
      heading: "Places customers ghost",
      whatsWrong: "What's wrong",
      whyTheyGhost: "Simulated customer perspective",
      howToFix: "How to fix it",
    },
    growthKit: {
      label: "Suggested fixes",
      heading: "Your",
      headingAccent: "Suggested fixes",
      subtitle: "Ghost found the problems. Here are the fixes.",
      regenerate: "Regenerate fix",
      copyFix: "Copy fix",
      copiedFix: "Copied!",
      rescan: "Rescan site",
      rescanDescription: "Send Ghost agents back for a fresh walk-through.",
    },
    narration: {
      summary: (domain: string, score: number) =>
        `Here is your Ghost intelligence report for ${domain}. Your Ghost Score is ${score} out of 100.`,
      leaksFound: (count: number, details: string) =>
        `Ghost found ${count} places where customers ghost your business. ${details}`,
      noLeaks: "No critical findings were detected.",
      leakItem: (index: number, title: string, detail: string) =>
        `Finding ${index}: ${title}. ${detail}`,
    },
  },

  personas: {
    defaults: [
      {
        id: "budget-buyer",
        name: "Budget Buyer",
        type: "Price-conscious shopper",
        avatar: "💰",
        status: "Hunting for pricing",
        thought:
          "Where's the pricing? I need to know if this fits my budget...",
        location: "Pricing page",
      },
      {
        id: "first-time",
        name: "First Time Visitor",
        type: "Trust seeker",
        avatar: "🔍",
        status: "Checking trust",
        thought:
          "Is this company legit? I don't see any reviews or testimonials...",
        location: "Homepage",
      },
      {
        id: "premium",
        name: "Premium Customer",
        type: "Value comparator",
        avatar: "✨",
        status: "Weighing value",
        thought:
          "What makes this premium? I need to see the differentiation...",
        location: "Features page",
      },
      {
        id: "busy",
        name: "Busy Customer",
        type: "Speed tester",
        avatar: "⚡",
        status: "Testing speed",
        thought:
          "This page is taking forever. I don't have time — I'm ghosting.",
        location: "Checkout",
      },
      {
        id: "confused",
        name: "Confused Customer",
        type: "Navigation tester",
        avatar: "🧭",
        status: "Lost in navigation",
        thought:
          "I can't find what I'm looking for. The menu is a maze...",
        location: "Navigation",
      },
    ],
    runtimeThoughts: {
      "budget-buyer": [
        "Where's the pricing? I need to know if this fits my budget...",
        "Found pricing but it's buried in the menu...",
        "No comparison table? Hard to justify the cost...",
        "Pricing is unclear — are there hidden fees?",
        "I'd buy if there was a clear price breakdown...",
      ],
      "first-time": [
        "Is this company legit? I don't see any reviews...",
        "Looking for testimonials or social proof...",
        "No trust badges on the checkout page...",
        "The about page is empty — who are these people?",
        "I need more reassurance before I'd purchase...",
      ],
      premium: [
        "What makes this premium? I need to see differentiation...",
        "Comparing features with competitors...",
        "The quality signals aren't strong enough...",
        "Premium pricing but budget presentation...",
        "Where's the exclusive value proposition?",
      ],
      busy: [
        "This page is taking forever to load...",
        "Still waiting... 4 seconds and counting",
        "Mobile experience is painfully slow",
        "Images aren't optimized — killing my data",
        "I'd have ghosted by now on a real site",
      ],
      confused: [
        "I can't find what I'm looking for...",
        "The menu has too many options",
        "Where is the FAQ? Where is contact?",
        "I clicked three links and got lost",
        "Navigation is a maze — ghosting this site",
      ],
    },
    runtimeLocations: {
      "budget-buyer": [
        "Homepage",
        "Menu",
        "Pricing page",
        "Pricing page",
        "Exit — ghosted",
      ],
      "first-time": [
        "Homepage",
        "About page",
        "Reviews",
        "Checkout",
        "Exit — ghosted",
      ],
      premium: [
        "Homepage",
        "Features",
        "Comparison",
        "Product page",
        "Exit — ghosted",
      ],
      busy: [
        "Homepage",
        "Product page",
        "Cart",
        "Checkout",
        "Exit — ghosted",
      ],
      confused: [
        "Homepage",
        "Navigation",
        "Search",
        "404 page",
        "Exit — ghosted",
      ],
    },
    browsingFallback: "Browsing",
  },

  mock: {
    businessUnderstanding: {
      businessType: "E-commerce / D2C Brand",
      targetAudience:
        "Millennials & Gen-Z seeking premium lifestyle products",
      primaryGoal: "Drive online purchases through product discovery",
      customerExpectations: [
        "Clear pricing with no hidden fees",
        "Fast page load under 3 seconds",
        "Social proof and customer reviews",
        "Easy checkout with multiple payment options",
        "Mobile-optimized shopping experience",
      ],
    },
    journey: [
      { id: "visitor", label: "Visitor", description: "Discovers your site" },
      {
        id: "homepage",
        label: "Homepage",
        description: "First impression — stay or ghost?",
        dropOffRate: 15,
      },
      {
        id: "interest",
        label: "Interest",
        description: "Browsing products & content",
        dropOffRate: 28,
        hasLeak: true,
        leakReason: "No clear CTA above the fold",
      },
      {
        id: "decision",
        label: "Decision",
        description: "Weighing the purchase",
        dropOffRate: 42,
        hasLeak: true,
        leakReason: "Missing trust signals & reviews",
      },
      {
        id: "action",
        label: "Action",
        description: "Completing purchase",
        dropOffRate: 35,
        hasLeak: true,
        leakReason: "Complex checkout flow",
      },
    ],
    leaks: [
      {
        id: "leak-1",
        title: "No Clear Value Proposition Above the Fold",
        severity: "critical" as const,
        whatIsWrong:
          "Visitors land on your homepage but can't tell what you sell or why they should care — within the first 3 seconds.",
        whyCustomersLeave:
          "First-time visitors ghost fast. Without a clear headline and visual, 68% bounce before scrolling.",
        impact: "Estimated 23% revenue loss from homepage ghosting",
        howToFix:
          "Add a compelling headline stating your unique value, a supporting subheadline, and a prominent CTA above the fold.",
        category: "Content",
      },
      {
        id: "leak-2",
        title: "Missing Social Proof & Trust Signals",
        severity: "high" as const,
        whatIsWrong:
          "No customer reviews, testimonials, or trust badges visible on product pages or checkout.",
        whyCustomersLeave:
          "Premium Customer ghosted at the decision stage. Without social proof, perceived risk skyrockets.",
        impact: "Estimated 18% drop in conversion at decision stage",
        howToFix:
          "Add testimonials, star ratings, 'As seen in' logos, and security badges near the purchase button.",
        category: "Trust",
      },
      {
        id: "leak-3",
        title: "Slow Page Load on Mobile",
        severity: "high" as const,
        whatIsWrong:
          "Mobile pages take 5.2 seconds to become interactive. Images are unoptimized and scripts block rendering.",
        whyCustomersLeave:
          "Busy Customer ghosted after 3 seconds. 53% of mobile users leave sites that take over 3 seconds.",
        impact: "Estimated 15% mobile traffic loss",
        howToFix:
          "Compress images to WebP, lazy-load assets, defer non-critical JavaScript, enable CDN caching.",
        category: "Performance",
      },
      {
        id: "leak-4",
        title: "Confusing Navigation Structure",
        severity: "medium" as const,
        whatIsWrong:
          "Menu has 12 top-level items with unclear labels. Shoppers can't find pricing, FAQ, or contact.",
        whyCustomersLeave:
          "Confused Customer spent 45 seconds searching for pricing before ghosting. Poor IA increases bounce by 35%.",
        impact: "Estimated 12% navigation-related ghosting",
        howToFix:
          "Simplify to 5–6 clear categories. Add sticky header with search and a prominent 'Pricing' link.",
        category: "UX",
      },
      {
        id: "leak-5",
        title: "Weak Call-to-Action Buttons",
        severity: "medium" as const,
        whatIsWrong:
          "CTAs use generic text like 'Submit' and 'Click Here' with low contrast against the background.",
        whyCustomersLeave:
          "Shoppers don't know what to do next. Weak CTAs reduce click-through by up to 40%.",
        impact: "Estimated 10% CTA-related conversion loss",
        howToFix:
          "Use action copy like 'Start Free Trial' or 'Get My Quote'. Increase button size and contrast.",
        category: "Conversion",
      },
    ],
    fixes: [
      {
        id: "fix-content",
        category: "Website Content",
        title: "AI-Generated Hero Copy",
        description: "Optimized headline and subheadline for your homepage",
        icon: "📝",
        content:
          'Headline: "Premium Lifestyle Products — Crafted for the Modern You"\n\nSubheadline: "Discover curated collections that elevate your everyday. Free shipping on orders over $50. Join 10,000+ happy customers."\n\nCTA: "Shop the Collection →"',
      },
      {
        id: "fix-cta",
        category: "CTA Buttons",
        title: "High-Converting CTA Copy",
        description: "Action-oriented button text replacements",
        icon: "🎯",
        content:
          'Replace "Submit" → "Get Started Free"\nReplace "Click Here" → "See Pricing Plans"\nReplace "Learn More" → "Explore Features →"\nReplace "Buy Now" → "Add to Cart — Free Shipping"',
      },
      {
        id: "fix-faq",
        category: "FAQ Generation",
        title: "AI-Generated FAQ Section",
        description: "Answers to questions your customers actually ask",
        icon: "❓",
        content:
          "Q: What is your return policy?\nA: We offer hassle-free 30-day returns. Simply contact support and we'll send a prepaid label.\n\nQ: How long does shipping take?\nA: Standard shipping: 3-5 business days. Express: 1-2 business days.\n\nQ: Do you ship internationally?\nA: Yes! We ship to 40+ countries with duties included at checkout.",
      },
      {
        id: "fix-whatsapp",
        category: "WhatsApp Auto Replies",
        title: "Smart WhatsApp Responses",
        description: "Automated replies for common customer inquiries",
        icon: "💬",
        content:
          'Greeting: "Hi! 👋 Thanks for reaching out to [Brand]. I\'m your AI assistant. How can I help you today?"\n\nPricing inquiry: "Our plans start at $29/mo. Would you like me to send you our pricing page?"\n\nOrder status: "I can help track your order! Please share your order number and I\'ll check right away."',
      },
      {
        id: "fix-trust",
        category: "Trust Improvement",
        title: "Trust Signal Package",
        description: "Social proof elements to add immediately",
        icon: "🛡️",
        content:
          'Add below hero: "Trusted by 10,000+ customers" with avatar stack\n\nAdd to product pages: "★★★★★ 4.8/5 from 2,341 reviews"\n\nAdd to checkout: SSL badge + "Secure 256-bit encryption" + "30-day money-back guarantee"\n\nAdd press logos: "As featured in TechCrunch, Forbes, Wired"',
      },
      {
        id: "fix-sales",
        category: "Sales Messages",
        title: "Conversion-Optimized Sales Copy",
        description: "Persuasive messaging for key touchpoints",
        icon: "💎",
        content:
          'Cart abandonment: "Your items are waiting! Complete your order in the next 15 minutes and get free express shipping."\n\nExit intent: "Wait! Get 10% off your first order. Enter your email below."\n\nPost-purchase: "Thank you! Your order is confirmed. Share your experience and earn $10 credit."',
      },
    ],
  },

  ui: {
    glowInputPlaceholder:
      "Paste your website, Instagram, or business link...",
  },
} as const;

/** Build MISSION_STAGES for runtime use (preserves duration for simulation) */
export function getMissionStages() {
  return copy.stages.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
    duration: s.duration,
  }));
}

/** Ghost Score label from numeric score */
export function getScoreLabel(score: number): string {
  if (score >= 95) return copy.results.scoreLabels.excellent;
  if (score >= 70) return copy.results.scoreLabels.needsWork;
  if (score >= 55) return copy.results.scoreLabels.critical;
  return copy.results.scoreLabels.urgent;
}

/** Persona thought by id + progress */
export function getPersonaThought(personaId: string, progress: number): string {
  const thoughts =
    copy.personas.runtimeThoughts[
      personaId as keyof typeof copy.personas.runtimeThoughts
    ];
  const list = thoughts ?? [copy.mission.analyzingFallback];
  const index = Math.min(Math.floor(progress / 20), list.length - 1);
  return list[index];
}

/** Persona location by id + progress */
export function getPersonaLocation(
  personaId: string,
  progress: number
): string {
  const locations =
    copy.personas.runtimeLocations[
      personaId as keyof typeof copy.personas.runtimeLocations
    ];
  const list = locations ?? [copy.personas.browsingFallback];
  const index = Math.min(Math.floor(progress / 20), list.length - 1);
  return list[index];
}

export type Copy = typeof copy;
