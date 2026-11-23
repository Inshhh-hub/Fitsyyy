import type { Product } from "@/types";
import { cn } from "@/lib/utils";
import { SLOT_LABEL } from "@/lib/recommendations/budget";
import { isLiveUrl } from "@/components/product-cards/ProductRow";

/**
 * Real product photos for an outfit, straight from the merchant listing (never generated).
 * Items without a photo (sample/demo data) show a plain labelled colour tile instead of a drawing.
 */
export function OutfitImages({ items, className, compact = false }: { items: Product[]; className?: string; compact?: boolean }) {
  const shown = items.slice(0, 4);
  const cols = shown.length <= 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={cn("grid gap-1.5 overflow-hidden rounded-2xl", cols, className)}>
      {shown.map((p, idx) => {
        const span = shown.length === 3 && idx === 0 ? "row-span-2" : "";
        const tile = p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full bg-white object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col justify-end p-2 text-[11px] leading-tight" style={{ background: p.hex }}>
            {!compact && <span className="rounded-md bg-ivory/85 px-1.5 py-1 text-charcoal">{p.name}</span>}
          </div>
        );
        const label = (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-ivory/90 px-2 py-0.5 text-[10px] font-medium text-charcoal">{SLOT_LABEL[p.slot]}</span>
        );
        const cls = cn("relative min-h-0 overflow-hidden", span);
        return isLiveUrl(p.productUrl) ? (
          <a key={p.id} href={p.productUrl} target="_blank" rel="noopener noreferrer sponsored" className={cls} title={`${p.name} on ${p.merchant}`}>
            {tile}{!compact && label}
          </a>
        ) : (
          <div key={p.id} className={cls}>{tile}{!compact && label}</div>
        );
      })}
    </div>
  );
}
