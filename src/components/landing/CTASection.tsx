"use client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useStartScan } from "@/hooks/useStartScan";
export function CTASection() {
  const start=useStartScan();
  return <section className="section-pad pb-20"><div className="product-container flex flex-col justify-between gap-8 rounded-xl border border-border bg-surface p-7 md:flex-row md:items-center md:p-10"><div><p className="eyebrow mb-3">Make your next improvement count</p><h2 className="font-heading text-3xl font-medium">Your website. A fresh perspective.</h2><p className="mt-3 text-sm text-muted-light">Start with one URL and a clear goal.</p></div><Button onClick={start} size="lg">Request early access <ArrowRight className="h-4 w-4" /></Button></div></section>;
}
