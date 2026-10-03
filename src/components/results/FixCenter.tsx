"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import type { AIFix } from '@/lib/types';
import { Button } from '@/components/ui/Button';
export function FixCenter({fixes}:{fixes:AIFix[]}) {
  const [active,setActive]=useState(fixes[0]?.id??'');
  const [message,setMessage]=useState('');
  const current=fixes.find(f=>f.id===active)??fixes[0];
  async function copyFix(){if(!current)return;try{await navigator.clipboard.writeText(current.content);setMessage('Copied to clipboard.');}catch{setMessage('Copy is unavailable. Select the text below and copy it manually.');}}
  return <section><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3">Suggested fixes</p><h2 className="font-heading text-2xl font-medium">A starting point you can use.</h2></div><Link href="/dashboard/fixes" className="inline-flex min-h-11 items-center text-sm font-medium text-violet">Track fixes in your workspace →</Link></div><p className="mt-3 text-sm text-muted">Review claims, prices, and bracketed placeholders before publishing.</p>{!current?<p className="surface-panel mt-6 p-6 text-sm text-muted-light">No draft fixes are available for this report. Use the findings to plan your next improvement.</p>:<div className="surface-panel mt-6 overflow-hidden"><div role="group" aria-label="Suggested fixes" className="flex overflow-x-auto border-b border-border">{fixes.map(f=><button key={f.id} aria-pressed={current.id===f.id} onClick={()=>{setActive(f.id);setMessage('');}} className={`shrink-0 border-b-2 px-5 py-3 text-sm ${current.id===f.id?'border-violet text-violet':'border-transparent text-muted'}`}>{f.category}</button>)}</div><div className="p-5 md:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><h3 className="font-heading text-xl font-medium">{current.title}</h3><p className="mt-2 text-sm text-muted-light">{current.description}</p></div><Button onClick={copyFix} variant="secondary" className="self-start">{message.startsWith('Copied')?<Check className="h-4 w-4" />:<Copy className="h-4 w-4" />}Copy fix</Button></div><pre className="mt-5 whitespace-pre-wrap rounded-lg border border-border/60 bg-midnight p-5 font-body text-sm leading-relaxed text-ghost-white">{current.content}</pre>{message&&<p role="status" className="mt-3 text-sm text-muted-light">{message}</p>}</div></div>}</section>;
}
