import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
}

const variantMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20",
  secondary:
    "bg-dark-accent text-white hover:bg-dark-accent/90 shadow-lg shadow-dark-accent/20",
  outline:
    "border border-dark-accent/20 bg-white/70 text-dark-accent hover:bg-accent/25 dark:bg-slate-900/70 dark:text-slate-100",
  ghost:
    "text-dark-accent hover:bg-accent/20 dark:text-slate-100 dark:hover:bg-slate-800",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
        variantMap[variant],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
