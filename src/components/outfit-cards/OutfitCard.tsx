"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, GitCompareArrows, Heart, ShoppingBag } from "lucide-react";
import type { Outfit, Product } from "@/types";
import { BudgetBar } from "@/components/budget/BudgetBar";
import { Badge, Modal } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ProductRow, ProductThumb, ShopLink } from "@/components/product-cards/ProductRow";
import { ReplaceModal } from "@/components/product-cards/ReplaceModal";
import { replaceItem } from "@/lib/recommendations/budget";
import { cn, formatINR } from "@/lib/utils";
import { OutfitPreview } from "./OutfitPreview";

interface Props {
  outfit: Outfit;
  gender: string;
  saved: boolean;
  comparing: boolean;
  wishIds: Set<string>;
  onSave: () => void;
  onCompare: () => void;
  onWish: (p: Product) => void;
  onChange: (o: Outfit) => void;
  notify: (msg: string, kind?: "success" | "error" | "info") => void;
}

const REASON_LABELS: Array<[keyof Outfit["reasons"], string]> = [
  ["body", "Why it suits your proportions"],
  ["colour", "Why the colours suit you"],
  ["occasion", "Why it fits the occasion"],
  ["balance", "Visual balance"],
  ["budget", "Why it fits your budget"],
];

export function OutfitCard({ outfit, gender, saved, comparing, wishIds, onSave, onCompare, onWish, onChange, notify }: Props) {
  const [open, setOpen] = useState(false);
  const [shop, setShop] = useState(false);
  const [replacing, setReplacing] = useState<Product | null>(null);
  const [view, setView] = useState<"illustration" | "products">("illustration");
  const hasImages = outfit.items.some((i) => i.imageUrl);
  const sample = outfit.items.some((i) => i.isSample);

  return (
    <motion.article layout className="flex flex-col overflow-hidden rounded-3xl border border-beige-deep/70 bg-white/70 shadow-soft transition-shadow hover:shadow-lift">
      <div className="relative bg-beige/50 p-4">
        {view === "illustration" ? (
          <OutfitPreview items={outfit.items} className="mx-auto h-64 w-auto" />
        ) : (
          <div className="grid h-64 grid-cols-3 gap-2">
            {outfit.items.slice(0, 6).map((i) => <ProductThumb key={i.id} p={i} className="h-full w-full" />)}
          </div>
        )}
        {hasImages && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-ivory/90 p-1 text-[11px] shadow-soft">
            {(["illustration", "products"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("rounded-full px-3 py-1 capitalize", view === v ? "bg-charcoal text-ivory" : "text-taupe-dark")}>{v}</button>
            ))}
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          <Badge tone="dark">{outfit.style}</Badge>
          {outfit.withinBudget ? <Badge tone="sage"><Check size={11} /> Within budget</Badge> : <Badge tone="warn">Over budget</Badge>}
        </div>
        <div className="absolute right-3 top-3 flex h-12 w-12 flex-col items-center justify-center rounded-full bg-ivory text-charcoal shadow-soft" title="Suitability score">
          <span className="font-serif text-lg leading-none">{outfit.suitabilityScore}</span>
          <span className="text-[8px] uppercase tracking-wide text-taupe">match</span>
        </div>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {outfit.items.map((i) => <span key={i.id} className="h-3.5 w-3.5 rounded-full border border-charcoal/20" style={{ background: i.hex }} />)}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-taupe">{outfit.occasionLabel}</p>
          <h3 className="text-2xl leading-tight">{outfit.name}</h3>
          <p className="mt-1.5 text-sm text-taupe-dark">{outfit.reason}</p>
        </div>
        <ul className="space-y-1 text-xs text-taupe-dark">
          {outfit.items.slice(0, 4).map((i) => (
            <li key={i.id} className="flex justify-between gap-2"><span className="truncate">{i.name}</span><span>{formatINR(i.price)}</span></li>
          ))}
          {outfit.items.length > 4 && <li className="text-taupe">+ {outfit.items.length - 4} more</li>}
        </ul>
        <BudgetBar total={outfit.total} budget={outfit.budget} compact />
        {outfit.warning && <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900">{outfit.warning}</p>}
        {sample && <p className="text-[11px] text-taupe">Sample products — demo data, not live listings.</p>}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            View Complete Outfit <ChevronDown size={14} className={cn("transition", open && "rotate-180")} />
          </Button>
          <Button size="sm" onClick={() => setShop(true)}><ShoppingBag size={14} /> Shop This Outfit</Button>
          <Button variant={saved ? "sage" : "ghost"} size="sm" onClick={onSave} aria-pressed={saved}>
            <Heart size={14} className={saved ? "fill-current" : ""} /> {saved ? "Saved" : "Save Favourite"}
          </Button>
          <Button variant={comparing ? "primary" : "ghost"} size="sm" onClick={onCompare} aria-pressed={comparing}>
            <GitCompareArrows size={14} /> {comparing ? "In comparison" : "Compare"}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-beige-deep/70">
            <div className="space-y-5 p-5">
              <section>
                <h4 className="mb-2 text-lg">Every piece</h4>
                <ul className="space-y-2">
                  {outfit.items.map((i) => (
                    <ProductRow key={i.id} item={i} wished={wishIds.has(i.id)} onWish={() => onWish(i)} onReplace={() => setReplacing(i)} />
                  ))}
                </ul>
              </section>
              <section className="space-y-3">
                <h4 className="text-lg">Why this works for you</h4>
                {REASON_LABELS.map(([k, label]) => (
                  <div key={k}>
                    <p className="text-xs font-medium uppercase tracking-wide text-sage-dark">{label}</p>
                    <p className="text-sm text-taupe-dark">{outfit.reasons[k]}</p>
                  </div>
                ))}
              </section>
              <section>
                <h4 className="mb-1 text-lg">Grooming</h4>
                <p className="text-sm text-taupe-dark"><strong>Hair:</strong> {outfit.grooming.hairstyle}</p>
                <p className="text-sm text-taupe-dark"><strong>Fragrance:</strong> {outfit.grooming.fragrance}</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-taupe-dark">{outfit.grooming.tips.map((t) => <li key={t}>{t}</li>)}</ul>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReplaceModal
        outfit={outfit}
        current={replacing}
        gender={gender}
        onClose={() => setReplacing(null)}
        onPick={(p) => {
          const next = replaceItem(outfit, replacing!.id, p, outfit.budget);
          onChange(next);
          setReplacing(null);
          notify(next.withinBudget ? `Swapped. ${formatINR(next.budget - next.total)} left in budget.` : `Swapped, but the outfit is now ${formatINR(next.total - next.budget)} over budget.`, next.withinBudget ? "success" : "info");
        }}
      />

      <Modal open={shop} onClose={() => setShop(false)} title="Shop this outfit">
        <ul className="space-y-2">
          {outfit.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-2xl border border-beige-deep bg-white/70 p-3">
              <ProductThumb p={i} className="h-12 w-12 shrink-0" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i.name}</p><p className="text-xs text-taupe">{i.merchant} · {formatINR(i.price)}</p></div>
              <ShopLink p={i} />
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-beige-deep pt-3 font-serif text-xl"><span>Total</span><span>{formatINR(outfit.total)}</span></p>
        {sample && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">These are sample products in demo mode, so there are no real product pages to open. Connect a product feed (see README) to get direct links.</p>}
      </Modal>
    </motion.article>
  );
}
