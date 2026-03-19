import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-dark-accent/10 bg-white/80 px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/70 dark:text-slate-50",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
