import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "sage";
const styles: Record<Variant, string> = {
  primary: "bg-charcoal text-ivory hover:bg-charcoal-soft",
  secondary: "border border-taupe/40 bg-ivory text-charcoal hover:border-charcoal hover:bg-beige/60",
  ghost: "text-charcoal hover:bg-beige/70",
  sage: "bg-sage-dark text-ivory hover:bg-sage-dark/90",
};
const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-dark focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const sizes = { sm: "!px-3.5 !py-1.5 text-xs", md: "", lg: "!px-7 !py-3.5 text-base" };

export function Button({ variant = "primary", loading, size = "md", className, children, disabled, ...rest }: Props) {
  return (
    <button className={cn(base, styles[variant], sizes[size], className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: "sm" | "md" | "lg"; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn(base, styles[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
