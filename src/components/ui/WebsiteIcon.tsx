"use client";

import { useState } from "react";
import Image from "next/image";
import { Globe2 } from "lucide-react";

/** Remote favicons are optional; missing or blocked icons retain a stable fallback. */
export function WebsiteIcon({ src }: { src?: string | null }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-midnight text-muted">
      {src && failedSource !== src ? (
        <Image src={src} alt="" width={32} height={32} unoptimized onError={() => setFailedSource(src)} />
      ) : (
        <Globe2 aria-hidden className="h-4 w-4" />
      )}
    </span>
  );
}
