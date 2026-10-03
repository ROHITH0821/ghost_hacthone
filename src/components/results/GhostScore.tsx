import { copy, getScoreLabel } from '@/lib/copy';
export function GhostScore({score}:{score:number}) {
  const value=Math.max(0,Math.min(100,Math.round(score)));
  const color=value>=70?'var(--color-neon-green)':value>=40?'var(--color-warning)':'var(--color-danger)';
  return <div className="flex items-center gap-6" aria-label={`Ghost Score ${value} out of 100: ${getScoreLabel(value)}`}><div className="relative grid h-28 w-28 shrink-0 place-items-center"><svg aria-hidden viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90"><circle cx="60" cy="60" r="53" fill="none" stroke="var(--color-border)" strokeWidth="6" /><circle cx="60" cy="60" r="53" fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${value*3.33} 333`} strokeLinecap="round" /></svg><span className="font-heading text-4xl font-medium tabular-nums">{value}</span></div><div><p className="text-sm text-muted">{copy.results.ghostScore}</p><p className="mt-1 font-heading text-xl font-medium" style={{color}}>{getScoreLabel(value)}</p><p className="mt-1 text-xs text-muted">Diagnostic score · out of 100</p></div></div>;
}
