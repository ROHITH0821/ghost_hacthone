import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
const sizes = {sm:'text-xl', md:'text-2xl', lg:'text-3xl'};
export function GhostLogo({size='md', linked=true, className='', iconOnly=false}: {size?:keyof typeof sizes;linked?:boolean;className?:string;iconOnly?:boolean}) {
  const mark=<><Image src="/ghost-logo.png" alt="" width={40} height={40} className="h-9 w-9 rounded-lg object-contain" />{!iconOnly&&<span className={cn('font-heading font-semibold tracking-tight',sizes[size])}>Ghost<span className="text-violet">.</span></span>}</>;
  const styles=cn('inline-flex shrink-0 items-center gap-2',className);
  return linked?<Link href="/" aria-label="Ghost home" className={styles}>{mark}</Link>:<span className={styles} aria-label="Ghost">{mark}</span>;
}
