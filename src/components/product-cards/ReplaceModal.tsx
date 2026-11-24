"use client";

import { useEffect, useState } from "react";
import type { Outfit, Product } from "@/types";
import { Badge, Modal, Skeleton } from "@/components/ui/primitives";
import { getOccasion } from "@/lib/recommendations/occasions";
import { formatINR } from "@/lib/utils";
import { ProductThumb } from "./ProductRow";

interface Props {
  outfit: Outfit;
  current: Product | null;
  gender: string;
  onClose: () => void;
  onPick: (p: Product) => void;
}

export function ReplaceModal({ outfit, current, gender, onClose, onPick }: Props) {
  const [list, setList] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    setList(null);
    setError(null);
    const occ = getOccasion(outfit.occasionId);
    const group = outfit.occasionId === "others" ? current.groups[0] : occ.group;
    const qs = new URLSearchParams({ slot: current.slot, gender, limit: "15", exclude: outfit.items.map((i) => i.id).join(",") });
    if (group) qs.set("group", group);
    let live = true;
    fetch(`/api/products?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn't load alternatives."))))
      .then((d: { products: Product[] }) => live && setList(d.products))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [current, outfit, gender]);

  if (!current) return null;
  const base = outfit.total - current.price;
  const rows = (list ?? []).map((p) => ({ p, newTotal: base + p.price }));
  const cheaper = rows.filter((r) => r.newTotal <= outfit.budget && r.p.price < current.price);
  const within = rows.filter((r) => r.newTotal <= outfit.budget && r.p.price >= current.price);
  const over = rows.filter((r) => r.newTotal > outfit.budget);

  const Section = ({ title, hint, items, tone }: { title: string; hint?: string; items: typeof rows; tone: "sage" | "warn" | "neutral" }) =>
    items.length ? (
      <section className="mb-5">
        <h4 className="text-sm font-medium">{title}</h4>
        {hint && <p className="mb-2 text-xs text-taupe">{hint}</p>}
        <ul className="space-y-2">
          {items.map(({ p, newTotal }) => (
            <li key={p.id}>
              <button onClick={() => onPick(p)} className="flex w-full items-center gap-3 rounded-2xl border border-beige-deep bg-white/70 p-3 text-left transition hover:border-charcoal">
                <ProductThumb p={p} className="h-12 w-12 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-taupe">{p.brand} · {p.colour}</span>
                </span>
                <span className="text-right">
                  <span className="block font-serif">{formatINR(p.price)}</span>
                  <Badge tone={tone}>{newTotal <= outfit.budget ? `${formatINR(outfit.budget - newTotal)} left` : `${formatINR(newTotal - outfit.budget)} over budget`}</Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <Modal open onClose={onClose} title={`Replace ${current.subtype.toLowerCase()}`}>
      <p className="mb-4 text-sm text-taupe-dark">Currently <strong>{current.name}</strong> at {formatINR(current.price)}. Your total updates instantly.</p>
      {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!list && !error && <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
      {list && !rows.length && <p className="text-sm text-taupe">No other options found for this item.</p>}
      <Section title="Budget-friendly" hint="Cheaper and still inside your budget" items={cheaper} tone="sage" />
      <Section title="Within budget" items={within} tone="neutral" />
      <Section title="Premium — outside your budget" hint="Shown only as alternatives. Choosing one takes the outfit over budget." items={over} tone="warn" />
    </Modal>
  );
}
