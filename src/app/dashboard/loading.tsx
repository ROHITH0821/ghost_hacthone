import { GhostMark } from "@/components/ui/GhostMark";

export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-line bg-mist">
        <GhostMark className="h-7 w-7" />
        <span aria-hidden className="ghost-scan-beam absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember to-transparent" />
      </span>
      <span className="mono-label text-[10px] text-ash-text">Loading</span>
    </div>
  );
}
