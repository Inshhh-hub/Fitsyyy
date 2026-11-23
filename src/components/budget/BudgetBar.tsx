import { budgetStatus } from "@/lib/recommendations/budget";
import { cn, formatINR } from "@/lib/utils";

export function BudgetBar({ total, budget, compact }: { total: number; budget: number; compact?: boolean }) {
  const { remaining, within, pct } = budgetStatus(total, budget);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className={cn("font-serif", compact ? "text-xl" : "text-2xl")}>{formatINR(total)}</span>
        <span className={cn("text-xs", within ? "text-sage-dark" : "font-medium text-amber-800")}>
          {within ? `${formatINR(remaining)} left of ${formatINR(budget)}` : `${formatINR(-remaining)} over ${formatINR(budget)}`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-beige" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
        <div className={cn("h-full rounded-full transition-all duration-500", within ? "bg-sage-dark" : "bg-amber-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
