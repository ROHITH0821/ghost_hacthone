import {
  Wallet,
  ShieldAlert,
  Zap,
  Compass,
  Scale,
  type LucideIcon,
} from "lucide-react";

export interface JourneyStage {
  title: string;
  detail: string;
  time: string;
  isFriction?: boolean;
}

export interface ShopperPersona {
  id: string;
  name: string;
  role: string;
  icon: LucideIcon;
  trait: string;
  patience: "Zero" | "Low" | "Medium" | "High";
  riskLevel: "Critical" | "High" | "Medium";
  dropOffRate: string;
  focusArea: string;
  quote: string;
  stages: JourneyStage[];
  findingTitle: string;
  findingDetail: string;
  currentCopy: string;
  currentCopyLabel: string;
  impactRecovery: string;
  image: string;
  leftImage: string;
  rightImage: string;
  charLeftImage: string;
  charRightImage: string;
}

export const SHOPPERS: ShopperPersona[] = [
  {
    id: "budget-hunter",
    name: "Budget Hunter",
    role: "Cost-conscious buyer",
    icon: Wallet,
    trait: "Zero tolerance for unlisted prices",
    patience: "Low",
    riskLevel: "Critical",
    dropOffRate: "74% bounce risk",
    focusArea: "Price Transparency",
    quote:
      "“Your services page lists 9 treatments and prices only 3. I wanted the bridal package, but having to ‘enquire for pricing’ made me bounce immediately to a competitor.”",
    stages: [
      { title: "Landing Entry", detail: "Arrives on Services page from search", time: "0.0s" },
      { title: "Catalog Scan", detail: "Browses 9 listed beauty packages", time: "+14s" },
      {
        title: "Price Omission Encounter",
        detail: "Finds 'Contact for details' on top tier",
        time: "+28s",
        isFriction: true,
      },
      {
        title: "Session Abandoned",
        detail: "Leaves site without filling inquiry form",
        time: "+39s",
        isFriction: true,
      },
    ],
    findingTitle: "High-value offer concealed behind contact gate",
    findingDetail:
      "Customers willing to spend high tickets want immediate budget confirmation before committing their contact details.",
    currentCopyLabel: "Current Site Copy",
    currentCopy: "Bridal Package — Contact for details & custom quote",
    impactRecovery: "+38% inquiry conversions",
    image: "/shoppers/budget-hunter-left-trans.png",
    leftImage: "/shoppers/budget-hunter-left-trans.png",
    rightImage: "/shoppers/budget-hunter-right-trans.png",
    charLeftImage: "/shoppers/chars/budget-hunter-left-2x.png",
    charRightImage: "/shoppers/chars/budget-hunter-right-2x.png",
  },
  {
    id: "trust-skeptic",
    name: "Trust Skeptic",
    role: "First-time visitor",
    icon: ShieldAlert,
    trait: "Demands verifiable third-party proof",
    patience: "Medium",
    riskLevel: "Critical",
    dropOffRate: "68% bounce risk",
    focusArea: "Credibility & Social Proof",
    quote:
      "“The About section is one short paragraph with no Google ratings or verified client photos. I had no idea if your business was real or an abandoned studio.”",
    stages: [
      { title: "Ad Click", detail: "Lands on primary homepage hero", time: "0.0s" },
      { title: "Proof Hunting", detail: "Looks for real client reviews or awards", time: "+11s" },
      {
        title: "Credibility Void",
        detail: "Zero reviews or ratings visible above fold",
        time: "+24s",
        isFriction: true,
      },
      {
        title: "Exit Tab",
        detail: "Closes tab to search for reviewed alternatives",
        time: "+36s",
        isFriction: true,
      },
    ],
    findingTitle: "Existing Google proof never reaches first-time visitors",
    findingDetail:
      "Proof exists on external platforms but is never placed beside conversion CTAs where visitors make trust decisions.",
    currentCopyLabel: "Current Site Copy",
    currentCopy: "“We are dedicated to providing premier experiences for you.”",
    impactRecovery: "+44% trust confidence",
    image: "/shoppers/trust-skeptic-left-trans.png",
    leftImage: "/shoppers/trust-skeptic-left-trans.png",
    rightImage: "/shoppers/trust-skeptic-right-trans.png",
    charLeftImage: "/shoppers/chars/trust-skeptic-left-2x.png",
    charRightImage: "/shoppers/chars/trust-skeptic-right-2x.png",
  },
  {
    id: "speed-runner",
    name: "Speed Runner",
    role: "Mobile commuter",
    icon: Zap,
    trait: "Abandons on layout shift or lag",
    patience: "Zero",
    riskLevel: "High",
    dropOffRate: "59% bounce risk",
    focusArea: "Mobile Performance & CLS",
    quote:
      "“Your hero image took 4.6 seconds to render on my phone. When the booking button finally appeared, a banner jumped down and made me misclick. I gave up.”",
    stages: [
      { title: "Mobile Tap", detail: "Clicks direct link on mobile browser", time: "0.0s" },
      {
        title: "LCP Render Stall",
        detail: "3.9s blank hero viewport on cellular connection",
        time: "+3.9s",
        isFriction: true,
      },
      {
        title: "Layout Shift",
        detail: "Banner pop-in triggers misclick on CTA button",
        time: "+5.1s",
        isFriction: true,
      },
      {
        title: "Instant Back-Swipe",
        detail: "Customer returns to search results",
        time: "+5.8s",
        isFriction: true,
      },
    ],
    findingTitle: "Cumulative layout shift & uncompressed asset delay",
    findingDetail:
      "Mobile shoppers on cellular connections abandon within 3 seconds if core CTAs shift or delay rendering.",
    currentCopyLabel: "Current Asset Payload",
    currentCopy: "Raw 4.2MB PNG hero image · Uncached third-party scripts",
    impactRecovery: "Load time: 4.6s → 0.7s",
    image: "/shoppers/speed-runner-left-trans.png",
    leftImage: "/shoppers/speed-runner-left-trans.png",
    rightImage: "/shoppers/speed-runner-right-trans.png",
    charLeftImage: "/shoppers/chars/speed-runner-left-2x.png",
    charRightImage: "/shoppers/chars/speed-runner-right-2x.png",
  },
  {
    id: "lost-explorer",
    name: "Lost Explorer",
    role: "Task-oriented shopper",
    icon: Compass,
    trait: "Frustrated by circular navigation",
    patience: "Medium",
    riskLevel: "Medium",
    dropOffRate: "52% bounce risk",
    focusArea: "Information Architecture",
    quote:
      "“I clicked Services, then Packages, then Offers, and somehow ended up right back on the homepage. Why is the booking form hidden under three dropdowns?”",
    stages: [
      { title: "Targeted Search", detail: "Enters site specifically looking to book", time: "0.0s" },
      { title: "Menu Maze", detail: "Navigates 3 nested dropdown hierarchies", time: "+16s" },
      {
        title: "Circular Redirect",
        detail: "Links loop back to parent category without CTA",
        time: "+31s",
        isFriction: true,
      },
      {
        title: "Fatigue Drop-off",
        detail: "Gives up trying to locate direct schedule button",
        time: "+44s",
        isFriction: true,
      },
    ],
    findingTitle: "Buried conversion path with recursive link loops",
    findingDetail:
      "Complex site navigation forces visitors to perform mental gymnastics instead of offering a direct one-click action.",
    currentCopyLabel: "Current Menu Hierarchy",
    currentCopy: "Home → Menu → Offerings → Special Packages → Details (No CTA)",
    impactRecovery: "Path to action cut by 65%",
    image: "/shoppers/lost-explorer-left-trans.png",
    leftImage: "/shoppers/lost-explorer-left-trans.png",
    rightImage: "/shoppers/lost-explorer-right-trans.png",
    charLeftImage: "/shoppers/chars/lost-explorer-left-2x.png",
    charRightImage: "/shoppers/chars/lost-explorer-right-2x.png",
  },
  {
    id: "comparison-hawk",
    name: "Comparison Hawk",
    role: "Diligence shopper",
    icon: Scale,
    trait: "Evaluates 3 competitor tabs at once",
    patience: "High",
    riskLevel: "High",
    dropOffRate: "63% bounce risk",
    focusArea: "Competitive Differentiation",
    quote:
      "“You say ‘premium quality’ multiple times, but never explain what makes you different from the provider next door. The other tab outlined their guarantee in 5 seconds.”",
    stages: [
      { title: "Tab Comparison", detail: "Opens site alongside 2 local competitors", time: "0.0s" },
      { title: "Value Scan", detail: "Reads marketing copy looking for unique edge", time: "+18s" },
      {
        title: "Generic Claims",
        detail: "Encountered vague buzzwords without specific proof",
        time: "+33s",
        isFriction: true,
      },
      {
        title: "Tab Switch",
        detail: "Switches to competitor offering explicit guarantees",
        time: "+47s",
        isFriction: true,
      },
    ],
    findingTitle: "Generic value proposition without competitive moats",
    findingDetail:
      "Visitors comparing alternatives need concrete differentiators, guarantees, and exact turn-around times.",
    currentCopyLabel: "Current Site Copy",
    currentCopy: "“We offer high quality solutions tailored to your unique needs.”",
    impactRecovery: "+31% competitive win rate",
    image: "/shoppers/comparison-hawk-left-trans.png",
    leftImage: "/shoppers/comparison-hawk-left-trans.png",
    rightImage: "/shoppers/comparison-hawk-right-trans.png",
    charLeftImage: "/shoppers/chars/comparison-hawk-left-2x.png",
    charRightImage: "/shoppers/chars/comparison-hawk-right-2x.png",
  },
];
