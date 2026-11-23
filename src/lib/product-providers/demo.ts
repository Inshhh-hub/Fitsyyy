import type { Product } from "@/types";
import { DEMO_CATALOG } from "./catalog";
import { matchesGender, type ProductProvider, type ProductQuery } from "./types";

/** Local sample data. Used only when no live provider is configured. Items have no URLs on purpose. */
export function filterProducts(all: Product[], q: ProductQuery): Product[] {
  const needle = q.q?.trim().toLowerCase();
  const ex = new Set(q.excludeIds ?? []);
  const out = all.filter(
    (p) =>
      (!q.slot || p.slot === q.slot) &&
      matchesGender(p.gender, q.gender) &&
      (!q.group || p.groups.includes(q.group)) &&
      (q.maxPrice === undefined || p.price <= q.maxPrice) &&
      (!needle || `${p.name} ${p.subtype} ${p.colour} ${p.brand}`.toLowerCase().includes(needle)) &&
      !ex.has(p.id),
  );
  return out.slice(0, q.limit ?? 200);
}

export const demoProvider: ProductProvider = {
  id: "demo",
  label: "Sample catalogue (demo data)",
  isSample: true,
  isConfigured: () => true,
  async search(q) {
    return filterProducts(DEMO_CATALOG, q);
  },
};

export { DEMO_CATALOG };
