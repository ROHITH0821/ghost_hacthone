"use client";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
interface SectionHeadingProps { children:ReactNode; size?:'xl'|'lg'; align?:'left'|'center'; className?:string; as?:'h1'|'h2'|'h3'; }
/** Content is visible at first paint; no scroll-dependent headings or blur. */
export function SectionHeading({children,size='lg',align='left',className,as:Tag='h2'}:SectionHeadingProps) {
  return <Tag className={cn(size==='xl'?'display-xl':'display-lg','font-heading font-medium text-ghost-white',align==='center'&&'text-center',className)}>{children}</Tag>;
}
export function AnimatedWords({words,accentIndices=[],...props}:{words:string[];accentIndices?:number[];size?:'xl'|'lg';align?:'left'|'center';className?:string;parallax?:boolean}) {
  return <SectionHeading {...props}>{words.map((word,i)=><span key={i} className={accentIndices.includes(i)?'serif-accent':undefined}>{i>0?' ':''}{word}</span>)}</SectionHeading>;
}
export function SectionLabel({children,className}:{children:ReactNode;className?:string}) {return <p className={cn('eyebrow mb-4',className)}>{children}</p>;}
export function ScrollReveal({children,className}:{children:ReactNode;className?:string;delay?:number;direction?:'up'|'left'|'right'}) {return <div className={className}>{children}</div>;}
export function TextLink({children,onClick,className,disabled}:{children:ReactNode;onClick?:()=>void;className?:string;disabled?:boolean}) {return <button type="button" onClick={onClick} disabled={disabled} className={cn('group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink underline decoration-line decoration-1 underline-offset-[5px] transition-[text-decoration-color] hover:decoration-ink disabled:opacity-50',className)}>{children}<span aria-hidden className="text-ash transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span></button>;}
export const SplitHeading=SectionHeading;
