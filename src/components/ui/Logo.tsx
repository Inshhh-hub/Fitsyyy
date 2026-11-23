import { cn } from "@/lib/utils";

/** fitsy mark: lime sticker tile with a hanger. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden>
      <g transform="rotate(-7 48 48)">
        <rect x="9" y="11" width="78" height="78" rx="26" fill="#1F1F1F" />
        <rect x="6" y="8" width="78" height="78" rx="26" fill="#C8F169" stroke="#1F1F1F" strokeWidth="3" />
        <path d="M45 50 V45 a6 6 0 1 1 6 -6" fill="none" stroke="#1F1F1F" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M45 50 L20 69 H70 Z" fill="none" stroke="#1F1F1F" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-9 w-9" />
      <span className="text-2xl font-black lowercase tracking-tighter">fitsy</span>
    </span>
  );
}
