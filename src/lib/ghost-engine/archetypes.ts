/**
 * The archetype library — a pool of Hyderabad-real shopper *identities* (traits
 * and browsing style only, no goal).
 *
 * Stage 1.5 (flow analysis) selects the best-fit archetype for each customer
 * flow it discovers and writes a concrete, business-specific goal for it. So the
 * personas that actually run are chosen by the business's real flows, not fixed
 * in advance. Add archetypes here to widen the pool the analyzer can draw from.
 */
export interface Archetype {
  id: string;
  name: string; // human label for the UI
  identity: string; // who they are + how they browse (NO goal — the flow supplies that)
}

export const archetypes: Archetype[] = [
  {
    id: "price_sensitive_student",
    name: "Price-sensitive college student",
    identity:
      "A 20-year-old college student in Hyderabad on a tight budget. Compares prices obsessively before spending anything. Impatient with anything that hides cost.",
  },
  {
    id: "busy_working_mom",
    name: "Busy working mom (mobile, 30s of patience)",
    identity:
      "A working mother browsing on her phone between meetings. Has about 30 seconds of patience. Will bounce the moment something is slow or unclear.",
  },
  {
    id: "telugu_first_uncle",
    name: "Telugu-first uncle (trusts phone/WhatsApp)",
    identity:
      "A 55-year-old man more comfortable in Telugu than English. Does not trust filling web forms; wants to call or WhatsApp a real person.",
  },
  {
    id: "skeptical_first_timer",
    name: "Skeptical first-timer (checks reviews first)",
    identity:
      "A newcomer who has never used this business. Reads reviews and looks for proof of quality and legitimacy before trusting anyone.",
  },
  {
    id: "bulk_corporate_buyer",
    name: "Corporate bulk-order buyer",
    identity:
      "An HR/admin executive arranging a service for a group or corporate event. Needs pricing and coordination fast, and proof the business can handle scale.",
  },
  {
    id: "comparison_shopper",
    name: "Comparison shopper (3 tabs open)",
    identity:
      "Has this business and two competitors open in three tabs. Whichever answers her questions fastest and most clearly wins.",
  },
  {
    id: "late_night_browser",
    name: "Late-night browser",
    identity:
      "Browsing late at night after work. Wants to send an enquiry now and get an answer, worried no one will reply.",
  },
  {
    id: "gift_buyer",
    name: "Gift buyer (doesn't know the domain)",
    identity:
      "Wants to buy something as a gift but doesn't know the domain jargon. Needs plain explanations and an easy way to purchase without expertise.",
  },
  {
    id: "urgent_need",
    name: "Urgent-need customer ('need it today')",
    identity:
      "Has an immediate, time-critical need and needs confirmation the business can deliver right now. Extremely time-pressured.",
  },
  {
    id: "returning_offer_seeker",
    name: "Returning customer looking for offers",
    identity:
      "Has used the business once before. Came back specifically to see if there's a package deal, combo, or festive offer.",
  },
  {
    id: "out_of_towner",
    name: "Out-of-towner checking location/reach",
    identity:
      "New to the area or ordering from elsewhere. Needs to know exactly where the business is, or whether it delivers/serves their location.",
  },
  {
    id: "slow_network_user",
    name: "Accessibility / slow-network user",
    identity:
      "On a slow 3G connection with a cheap phone. Heavy image-first pages barely load. Needs the essentials to appear fast.",
  },
  {
    id: "generic_shopper",
    name: "Everyday shopper",
    identity:
      "A typical customer for this kind of business with no strong quirks — a safe fallback when no other archetype fits the flow cleanly.",
  },
];

export const archetypeById = new Map(archetypes.map((a) => [a.id, a]));

/** Compact list handed to the flow analyzer so it can pick archetype ids. */
export const archetypeMenu = archetypes
  .map((a) => `- ${a.id}: ${a.name} — ${a.identity}`)
  .join("\n");
