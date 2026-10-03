"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonStyles = {
  primary: "bg-ink text-paper hover:bg-[#24252A] border border-ink",
  glow: "bg-ink text-paper hover:bg-[#24252A] border border-ink",
  secondary: "bg-paper text-ink border border-line hover:border-[#C9CAC4] hover:bg-mist",
  ghost: "bg-transparent text-graphite hover:text-ink hover:bg-mist border border-transparent",
};
export const buttonSizes = {
  sm: "min-h-10 px-4 py-2 text-sm",
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-[15px]",
};
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonStyles;
  size?: keyof typeof buttonSizes;
  isLoading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} disabled={disabled || isLoading} aria-busy={isLoading || undefined}
      className={cn("group/btn inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 [&_svg:last-child:not(:first-child)]:transition-transform [&_svg:last-child:not(:first-child)]:duration-300 hover:[&_svg:last-child:not(:first-child)]:translate-x-0.5", buttonStyles[variant], buttonSizes[size], className)} {...props}>
      {isLoading && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
