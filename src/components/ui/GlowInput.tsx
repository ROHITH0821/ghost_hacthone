"use client";

import { forwardRef, useState } from "react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface GlowInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const GlowInput = forwardRef<HTMLInputElement, GlowInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      placeholder = copy.ui.glowInputPlaceholder,
      className,
      disabled,
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);

    return (
      <div className={cn("relative w-full", className)}>
        <div
          className={cn(
            "relative rounded-2xl border bg-midnight/80 transition-all duration-400",
            focused
              ? "border-violet/50 shadow-[0_0_30px_rgba(139,92,246,0.12)]"
              : "border-border"
          )}
        >
          <input
            ref={ref}
            type="url"
            aria-label="Website URL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent px-5 py-4 text-base text-ghost-white placeholder:text-muted outline-none md:text-lg"
          />
        </div>
      </div>
    );
  }
);

GlowInput.displayName = "GlowInput";
