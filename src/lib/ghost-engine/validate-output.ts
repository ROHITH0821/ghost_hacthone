import type { GrowthLeakReport, PersonaJourney } from './types';

/** Whitespace/typography-insensitive key, used only to locate the real complaint text. */
const quoteKey = (quote: string) => quote
  .normalize('NFKC')
  .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
  .replace(/[\u2018\u2019\u201B]/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^["']+|["']+$/g, '')
  .trim()
  .toLowerCase();

/**
 * Protect consumers from plausible but unsupported model arithmetic/quotations.
 *
 * Every quote shown is the exact verbatim_complaint of a non-completed simulated
 * journey: model quotes are matched (ignoring whitespace/typography) and replaced
 * with that original text. Unsupported quotes are removed, findings left with no
 * supported quote are dropped, and affected counts are clamped to the evidence.
 * Only a report with no supportable finding at all is rejected — one stray
 * finding no longer discards an otherwise valid audit.
 */
export function validateAggregation(report: GrowthLeakReport, journeys: PersonaJourney[]): GrowthLeakReport {
  const evidence = journeys.filter(j=>j.outcome!=='completed');
  const byKey = new Map(evidence.map(j=>[quoteKey(j.verbatim_complaint), j.verbatim_complaint] as const));
  const supported = report.leaks.flatMap(leak=>{
    const quotes = [...new Set(leak.best_quotes.map(q=>byKey.get(quoteKey(q))).filter((q): q is string => !!q))];
    if (!quotes.length) return [];
    return [{...leak, best_quotes: quotes, personas_affected: Math.min(leak.personas_affected, evidence.length)}];
  });
  if (report.leaks.length > 0 && supported.length === 0) {
    throw new Error('Report contained a finding without a supporting simulated journey quote');
  }
  return {
    ...report,
    leaks: supported.map((leak,i)=>({...leak,rank:i+1})),
    funnel: {
      total_shoppers: journeys.length,
      would_have_bought: journeys.filter(j=>j.outcome==='completed').length,
      abandoned: journeys.filter(j=>j.outcome==='abandoned').length,
    },
    revenue_estimate: { monthly_low:0, monthly_high:0, currency:'INR', assumptions:['Unavailable: real traffic, conversion and order-value data are required. Simulated journeys do not measure revenue loss.'] },
  };
}
