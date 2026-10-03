import type { GrowthLeakReport, PersonaJourney } from './types';

/** Protect consumers from plausible but unsupported model arithmetic/quotations. */
export function validateAggregation(report: GrowthLeakReport, journeys: PersonaJourney[]): GrowthLeakReport {
  const complaints = new Set(journeys.filter(j=>j.outcome!=='completed').map(j=>j.verbatim_complaint));
  for(const leak of report.leaks) {
    if (!leak.best_quotes.length || leak.best_quotes.some(quote=>!complaints.has(quote))) {
      throw new Error('Report contained a finding without a supporting simulated journey quote');
    }
    if (leak.personas_affected > journeys.filter(j=>j.outcome!=='completed').length) {
      throw new Error('Report finding affected count exceeds available evidence');
    }
  }
  return {
    ...report,
    leaks: report.leaks.map((leak,i)=>({...leak,rank:i+1})),
    funnel: {
      total_shoppers: journeys.length,
      would_have_bought: journeys.filter(j=>j.outcome==='completed').length,
      abandoned: journeys.filter(j=>j.outcome==='abandoned').length,
    },
    revenue_estimate: { monthly_low:0, monthly_high:0, currency:'INR', assumptions:['Unavailable: real traffic, conversion and order-value data are required. Simulated journeys do not measure revenue loss.'] },
  };
}
