import Link from "next/link";
import { cn } from "@/lib/utils";
import { GhostMark } from "./GhostMark";

const sizes = { sm: "text-[19px]", md: "text-[22px]", lg: "text-[28px]" };
const marks = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" };

export function GhostLogo({
  size = "md",
  linked = true,
  className = "",
  iconOnly = false,
  track = false,
}: {
  size?: keyof typeof sizes;
  linked?: boolean;
  className?: string;
  iconOnly?: boolean;
  track?: boolean;
}) {
  const mark = (
    <>
      <GhostMark className={marks[size]} track={track} />
      {!iconOnly && (
        <span className={cn("font-heading font-semibold tracking-[-0.04em] text-ink", sizes[size])}>
          Ghost<span className="text-ember">.</span>
        </span>
      )}
    </>
  );
  const styles = cn("inline-flex shrink-0 items-center gap-2", className);
  return linked ? (
    <Link href="/" aria-label="Ghost home" className={styles}>
      {mark}
    </Link>
  ) : (
    <span className={styles} aria-label="Ghost">
      {mark}
    </span>
  );
}
