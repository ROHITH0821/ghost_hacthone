"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonStyles = {
  primary: "bg-violet text-midnight hover:bg-violet-glow border border-transparent",
  glow: "bg-violet text-midnight hover:bg-violet-glow border border-transparent",
  secondary: "bg-surface-elevated text-ghost-white border border-border hover:border-muted",
  ghost: "bg-transparent text-muted-light hover:text-ghost-white hover:bg-surface-elevated border border-transparent",
};
export const buttonSizes = {
  sm: "min-h-10 px-4 py-2 text-sm",
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonStyles;
  size?: keyof typeof buttonSizes;
  isLoading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} disabled={disabled || isLoading} aria-busy={isLoading || undefined}
      className={cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", buttonStyles[variant], buttonSizes[size], className)} {...props}>
      {isLoading && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
