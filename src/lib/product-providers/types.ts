import type { FashionCategory, Product, Slot } from "@/types";

export interface ProductQuery {
  slot?: Slot;
  gender: FashionCategory;
  /** occasion group: casual | formal | party | ethnic | sport */
  group?: string;
  maxPrice?: number;
  q?: string;
  excludeIds?: string[];
  limit?: number;
}

/**
 * A ProductProvider is any authorised source of real product data:
 * affiliate API (Amazon PA-API, Cuelinks, vCommission…), merchant feed, or your own catalogue.
 * Implement this interface and register it in ./index.ts to add a retailer.
 *
 * Rules every provider MUST follow:
 *  - `productUrl` is only ever set to a genuine product-page URL supplied by the source.
 *  - Never invent prices, stock or links. Leave fields undefined if the source doesn't give them.
 *  - Set `isSample: true` only for demo data.
 */
export interface ProductProvider {
  id: string;
  label: string;
  /** true if this provider returns demo data rather than live listings */
  isSample: boolean;
  isConfigured(): boolean;
  search(query: ProductQuery): Promise<Product[]>;
}

export function matchesGender(productGender: FashionCategory, wanted: FashionCategory): boolean {
  if (wanted === "unisex") return true;
  return productGender === "unisex" || productGender === wanted;
}
