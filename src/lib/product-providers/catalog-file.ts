import type { Product } from "@/types";
import { hexFor } from "@/lib/recommendations/colour";
import raw from "../../../data/products.json";
import { feedItemSchema } from "./feed";
import { filterProducts } from "./demo";
import type { ProductProvider } from "./types";

/**
 * Reads data/products.json — real products synced from an affiliate API by `npm run sync:flipkart`
 * (or any script that writes the same shape; see README). Bundled at build time, so product
 * pages, prices and stock are as of the last sync. Items without an https product URL are dropped.
 */
const items: Product[] = [];
for (const r of raw as unknown[]) {
  const parsed = feedItemSchema.safeParse(r);
  if (parsed.success) items.push({ ...parsed.data, hex: hexFor(parsed.data.colour), isSample: false });
}

export const catalogFileProvider: ProductProvider = {
  id: "catalog-file",
  label: "Synced product catalogue (data/products.json)",
  isSample: false,
  isConfigured: () => items.length > 0,
  async search(q) {
    return filterProducts(items, q);
  },
};
