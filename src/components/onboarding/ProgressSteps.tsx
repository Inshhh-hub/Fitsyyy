import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { href: "/onboarding", label: "Body & budget" },
  { href: "/appearance", label: "Appearance" },
  { href: "/occasions", label: "Occasion" },
];

export function ProgressSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Progress" className="mx-auto mb-10 w-full max-w-xl">
      <ol className="flex items-center">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          const dot = (
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition", done ? "border-sage-dark bg-sage-dark text-ivory" : active ? "border-charcoal bg-charcoal text-ivory" : "border-beige-deep bg-ivory text-taupe")}>
              {done ? <Check size={14} /> : n}
            </span>
          );
          return (
            <li key={s.href} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
              <div className="flex flex-col items-center gap-1.5">
                {done ? <Link href={s.href} aria-label={`Back to ${s.label}`}>{dot}</Link> : dot}
                <span className={cn("hidden text-[11px] sm:block", active ? "font-medium text-charcoal" : "text-taupe")}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("mx-2 mb-5 h-px flex-1 sm:mb-5", done ? "bg-sage-dark" : "bg-beige-deep")} />}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center text-xs text-taupe sm:hidden">Step {current} of 3 · {STEPS[current - 1].label}</p>
    </nav>
  );
}
