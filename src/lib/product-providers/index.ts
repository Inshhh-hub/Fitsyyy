import type { Product } from "@/types";
import { catalogFileProvider } from "./catalog-file";
import { demoProvider } from "./demo";
import { feedProvider } from "./feed";
import type { ProductProvider, ProductQuery } from "./types";

/**
 * Register new retailers / affiliate APIs here. Live providers take precedence;
 * the sample catalogue is used ONLY when no live provider is configured.
 */
const LIVE_PROVIDERS: ProductProvider[] = [catalogFileProvider, feedProvider];

export function activeProviders(): ProductProvider[] {
  const live = LIVE_PROVIDERS.filter((p) => p.isConfigured());
  return live.length ? live : [demoProvider];
}

export function usingSampleData(): boolean {
  return activeProviders().every((p) => p.isSample);
}

export async function searchProducts(q: ProductQuery): Promise<Product[]> {
  const results = await Promise.all(activeProviders().map((p) => p.search(q)));
  const seen = new Set<string>();
  const merged: Product[] = [];
  for (const list of results) {
    for (const p of list) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
  }
  return merged.slice(0, q.limit ?? 200);
}

export type { ProductProvider, ProductQuery };
