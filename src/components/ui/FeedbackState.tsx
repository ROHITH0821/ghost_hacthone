"use client";
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from './Button';
export function FeedbackState({title,description,onRetry,actionLabel,children}:{title:string;description:string;onRetry?:()=>void;actionLabel?:string;children?:React.ReactNode}) {
  return <div className="surface-panel flex flex-col items-center px-6 py-12 text-center" role={onRetry?'alert':undefined}><AlertCircle aria-hidden className="mb-4 h-6 w-6 text-muted" /><h2 className="font-heading text-xl font-semibold">{title}</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-muted-light">{description}</p>{onRetry&&<Button variant="secondary" onClick={onRetry} className="mt-6">{actionLabel?<ArrowRight className="h-4 w-4" />:<RefreshCw className="h-4 w-4" />}{actionLabel??'Try again'}</Button>}{children}</div>;
}
