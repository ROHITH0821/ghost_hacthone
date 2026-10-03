import { copy, getScoreLabel } from '@/lib/copy';
import { ScoreRing } from '@/components/ui/ScoreRing';
export function GhostScore({score}:{score:number}) {
  const value=Math.max(0,Math.min(100,Math.round(score)));
  const tone=value>=70?'bg-[#E4F4EC] text-resolved-text':value>=40?'bg-[#FEF3E2] text-sev-medium-text':'bg-ember-soft text-ember-text';
  const dot=value>=70?'bg-resolved':value>=40?'bg-sev-medium':'bg-ember';
  return <div className="flex items-center gap-6" aria-label={`Ghost Score ${value} out of 100: ${getScoreLabel(value)}`}><ScoreRing value={value} size={112} stroke={7} count label={`Ghost Score ${value} out of 100`} /><div><p className="mono-label text-ash-text">{copy.results.ghostScore}</p><p className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 font-heading text-base font-medium ${tone}`}><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />{getScoreLabel(value)}</p><p className="mt-2 text-xs text-ash-text">Diagnostic score · out of 100</p></div></div>;
}
