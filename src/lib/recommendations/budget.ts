import type { Outfit, Product, Slot } from "@/types";
import { formatINR } from "@/lib/utils";

export const ESSENTIAL_SLOTS: Slot[] = ["upper", "lower", "footwear"];

export const SLOT_LABEL: Record<Slot, string> = {
  upper: "Upperwear",
  outer: "Layer",
  lower: "Bottomwear",
  footwear: "Footwear",
  watch: "Watch",
  belt: "Belt",
  eyewear: "Sunglasses",
  bag: "Bag",
  bracelet: "Bracelet / Bangles",
  chain: "Chain / Necklace",
  cap: "Cap",
  wallet: "Wallet",
};

const SLOT_ORDER: Slot[] = ["upper", "outer", "lower", "footwear", "watch", "belt", "eyewear", "bag", "wallet", "bracelet", "chain", "cap"];

export function sortItems(items: Product[]): Product[] {
  return [...items].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
}

export function totalPrice(items: Product[]): number {
  return items.reduce((sum, p) => sum + p.price, 0);
}

export function budgetStatus(total: number, budget: number) {
  const remaining = budget - total;
  return { remaining, within: remaining >= 0, pct: Math.min(100, Math.round((total / Math.max(1, budget)) * 100)) };
}

/** Recompute total / within-budget / warning after any change to items or the budget. */
export function recalc(outfit: Outfit, items: Product[], budget: number): Outfit {
  const sorted = sortItems(items);
  const total = totalPrice(sorted);
  const { within } = budgetStatus(total, budget);
  return {
    ...outfit,
    items: sorted,
    total,
    budget,
    withinBudget: within,
    warning: within ? undefined : `Outside your budget by ${formatINR(total - budget)}. Shown as an over-budget option — swap items to bring it down.`,
  };
}

export function replaceItem(outfit: Outfit, oldId: string, next: Product, budget: number): Outfit {
  return recalc(outfit, outfit.items.map((p) => (p.id === oldId ? next : p)), budget);
}
