import { GhostLogo } from "@/components/ui/GhostLogo";
export default function UnavailableFix() {
  return <main id="main-content" className="section-pad mx-auto max-w-xl py-20"><GhostLogo size="sm" /><h1 className="mt-10 font-heading text-3xl font-medium">This handoff is unavailable.</h1><p className="mt-4 leading-relaxed text-muted-light">The link may have expired or been revoked. Ask the person who shared it for a new link.</p></main>;
}
