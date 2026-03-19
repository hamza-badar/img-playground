interface ProgressProps {
  value: number;
}

export function Progress({ value }: ProgressProps) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-accent/30 dark:bg-slate-800">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
