"use client";
import { type HTMLAttributes, forwardRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  glow?: boolean;
  hover?: boolean;
  className?: string;
  children?: ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, glow = false, hover = false, style, onClick }, ref) => {
    return (
      <motion.div
        ref={ref}
        onClick={onClick}
        style={style}
        whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
        className={cn(
          "glass-card relative overflow-hidden",
          glow && "border-violet/30",
          className
        )}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const badgeVariants = {
  default: "bg-violet/10 text-violet-glow border-violet/20",
  success: "bg-neon-green/10 text-neon-green border-neon-green/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-ai-blue/10 text-ai-blue border-ai-blue/20",
};

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
