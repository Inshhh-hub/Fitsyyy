"use client";

import { ExternalLink, Heart, Repeat2 } from "lucide-react";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/primitives";
import { SLOT_LABEL } from "@/lib/recommendations/budget";
import { cn, formatINR } from "@/lib/utils";

export function isLiveUrl(url?: string): url is string {
  return Boolean(url && /^https:\/\//i.test(url));
}

export function ProductThumb({ p, className }: { p: Product; className?: string }) {
  return p.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.imageUrl} alt={p.name} loading="lazy" referrerPolicy="no-referrer" className={cn("rounded-xl object-cover", className)} />
  ) : (
    <div className={cn("flex items-center justify-center rounded-xl border border-charcoal/10", className)} style={{ background: p.hex }} aria-label={`${p.colour} ${p.subtype}`} />
  );
}

export function ShopLink({ p, size = "sm" }: { p: Product; size?: "sm" | "xs" }) {
  const cls = cn("inline-flex items-center gap-1 rounded-full font-medium", size === "sm" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]");
  if (isLiveUrl(p.productUrl)) {
    return (
      <a href={p.productUrl} target="_blank" rel="noopener noreferrer sponsored" className={cn(cls, "bg-charcoal text-ivory transition hover:bg-charcoal-soft")}>
        View on {p.merchant} <ExternalLink size={12} />
      </a>
    );
  }
  return <span className={cn(cls, "cursor-not-allowed bg-beige text-taupe")} title="Demo data has no real product page">No live link (sample)</span>;
}

interface Props {
  item: Product;
  wished: boolean;
  onWish: () => void;
  onReplace?: () => void;
}

export function ProductRow({ item, wished, onWish, onReplace }: Props) {
  return (
    <li className="flex gap-3 rounded-2xl border border-beige-deep/70 bg-ivory p-3">
      <ProductThumb p={item} className="h-16 w-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-taupe">{SLOT_LABEL[item.slot]}</p>
            <p className="truncate text-sm font-medium">{item.name}</p>
            <p className="truncate text-xs text-taupe-dark">{item.brand} · {item.merchant}</p>
          </div>
          <p className="shrink-0 font-serif text-lg">{formatINR(item.price)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.isSample && <Badge tone="warn">Sample data</Badge>}
          {item.inStock === false && <Badge tone="warn">Out of stock</Badge>}
          {item.sizes?.length ? <span className="text-[11px] text-taupe">Sizes {item.sizes.join(", ")}</span> : null}
          <span className="flex-1" />
          <ShopLink p={item} size="xs" />
          {onReplace && (
            <button onClick={onReplace} className="inline-flex items-center gap-1 rounded-full border border-beige-deep px-2.5 py-1 text-[11px] hover:bg-beige"><Repeat2 size={12} /> Replace</button>
          )}
          <button onClick={onWish} aria-pressed={wished} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} className="rounded-full p-1.5 hover:bg-beige">
            <Heart size={14} className={wished ? "fill-red-500 text-red-500" : "text-taupe"} />
          </button>
        </div>
      </div>
    </li>
  );
}
