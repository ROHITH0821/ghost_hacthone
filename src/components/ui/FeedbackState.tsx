"use client";
import { ArrowRight, RefreshCw } from 'lucide-react';
import { GhostMark } from './GhostMark';
import { Button } from './Button';
export function FeedbackState({title,description,onRetry,actionLabel,children}:{title:string;description:string;onRetry?:()=>void;actionLabel?:string;children?:React.ReactNode}) {
  return <div className="surface-panel flex flex-col items-center px-6 py-14 text-center" role={onRetry?'alert':undefined}><span aria-hidden className="mb-5 grid h-14 w-14 place-items-center rounded-full border border-line bg-mist"><GhostMark className="h-7 w-7" /></span><h2 className="font-heading text-xl font-medium tracking-[-0.02em]">{title}</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-graphite">{description}</p>{onRetry&&<Button variant="secondary" onClick={onRetry} className="mt-6">{actionLabel?<ArrowRight className="h-4 w-4" />:<RefreshCw className="h-4 w-4" />}{actionLabel??'Try again'}</Button>}{children}</div>;
}
