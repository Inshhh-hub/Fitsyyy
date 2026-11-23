import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-3xl border border-beige-deep/70 bg-white/70 shadow-soft", className)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-beige", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-ivory/70 to-transparent" />
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "sage" | "warn" | "dark"; className?: string }) {
  const tones = {
    neutral: "bg-beige text-taupe-dark",
    sage: "bg-sage-light text-sage-dark",
    warn: "bg-amber-100 text-amber-900",
    dark: "bg-charcoal text-ivory",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  suffix?: string;
  optional?: boolean;
}

export function Field({ label, error, hint, suffix, optional, className, id, ...rest }: FieldProps) {
  const fid = id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 flex items-center justify-between text-sm font-medium text-charcoal">
        <span>{label}</span>
        {optional && <span className="text-[11px] font-normal text-taupe">Optional</span>}
      </label>
      <div className="relative">
        <input
          id={fid}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fid}-err` : undefined}
          className={cn(
            "w-full rounded-2xl border bg-ivory px-4 py-3 text-sm text-charcoal outline-none transition placeholder:text-taupe/60 focus:border-sage-dark focus:ring-2 focus:ring-sage/40",
            error ? "border-red-400" : "border-beige-deep",
            suffix && "pr-12",
          )}
          {...rest}
        />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-taupe">{suffix}</span>}
      </div>
      {error ? (
        <p id={`${fid}-err`} className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-taupe">{hint}</p>
      ) : null}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close dialog" className="absolute inset-0 bg-charcoal/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-ivory p-6 shadow-lift sm:rounded-3xl", wide ? "sm:max-w-4xl" : "sm:max-w-lg")}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-serif text-2xl">{title}</h3>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-taupe hover:bg-beige">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
