"use client";
import Link from 'next/link';
import { FeedbackState } from '@/components/ui/FeedbackState';
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) {
  return <main id="main-content" className="mx-auto flex min-h-[80vh] max-w-xl items-center p-6"><FeedbackState title="This page couldn’t load" description="Something interrupted the request. Try again to reload this page." onRetry={reset}><Link href="/dashboard/overview" className="mt-4 text-sm text-violet">Back to workspace</Link></FeedbackState></main>;
}
