import type { CustomerFlow, PersonaJourney } from "../types";
import type { DimensionScore, ScoreCheck } from "./types";
import { clamp } from "./utils";

const OUTCOME_VALUE: Record<PersonaJourney["outcome"], number> = {
  completed: 1.0,
  hesitant: 0.65,
  abandoned: 0.0,
};

function flowLabel(flow: CustomerFlow): string {
  return flow.name || flow.id;
}

export function scoreCustomerJourney(input: {
  flows: CustomerFlow[];
  journeys: PersonaJourney[];
}): DimensionScore {
  const { flows, journeys } = input;

  const byFlow = new Map<string, PersonaJourney>(journeys.map((j) => [j.flow_id, j]));

  const evaluatedFlows = flows.filter(f => byFlow.has(f.id));
  const totalWeight = evaluatedFlows.reduce((s, f) => s + (Number.isFinite(f.revenue_weight) ? f.revenue_weight : 0), 0);

  // Neutral baseline if no flows were discovered (avoid 0/100 due to a single upstream miss).
  if (evaluatedFlows.length === 0 || totalWeight <= 0) {
    const checks: ScoreCheck[] = [
      {
        id: "no_flows",
        label: "No customer journeys could be evaluated; the journey score uses a neutral baseline.",
        points: 0,
        passed: false,
        evidence: "No usable flow outcomes were available.",
      },
    ];
    return {
      id: "customer_journey",
      label: "Customer Journey",
      weight: 0.3,
      value: 55,
      contribution: Math.round(55 * 0.3),
      checks,
    };
  }

  let earned = 0;
  const checks: ScoreCheck[] = [];

  for (const flow of flows) {
    const w = clamp(flow.revenue_weight ?? 0, 0, 5);
    const journey = byFlow.get(flow.id);
    if (!journey) {
      checks.push({ id: `flow_${flow.id}`, label: `${flowLabel(flow)}: not evaluated`, points: 0, passed: false, evidence: "Not evaluated: the model run did not return evidence. Excluded from the journey score." });
      continue;
    }
    const outcome = journey.outcome;
    const v = OUTCOME_VALUE[outcome] ?? 0;
    earned += w * v;

    checks.push({
      id: `flow_${flow.id}`,
      label: `${flowLabel(flow)} (weight ${w}): ${outcome}`,
      points: 0,
      passed: outcome === "completed",
      evidence: journey?.verbatim_complaint
        ? journey.verbatim_complaint.slice(0, 160)
        : journey
          ? `Dropped at: ${journey.dropped_at}`
          : "No journey result for this flow.",
    });
  }

  const raw = (earned / totalWeight) * 100;
  const value = Math.round(clamp(raw, 0, 100));

  return {
    id: "customer_journey",
    label: "Customer Journey",
    weight: 0.3,
    value,
    contribution: Math.round(value * 0.3),
    checks,
  };
}

