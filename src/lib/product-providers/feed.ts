import { z } from "zod";
import type { Product } from "@/types";
import { hexFor } from "@/lib/recommendations/colour";
import { filterProducts } from "./demo";
import type { ProductProvider } from "./types";

/**
 * Generic JSON feed provider. Point PRODUCT_FEED_URL at an authorised feed
 * (affiliate network export, merchant feed, your own service) that returns either an array
 * or { products: [...] } of items matching `feedItemSchema`.
 * Items without an https product URL are DROPPED so we never show an unlinkable "live" product.
 */
export const feedItemSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(160),
  brand: z.string().min(1).max(80),
  merchant: z.string().min(1).max(60),
  slot: z.enum(["upper", "outer", "lower", "footwear", "watch", "belt", "eyewear", "bag", "bracelet", "chain", "cap", "wallet"]),
  subtype: z.string().max(60).default(""),
  price: z.number().positive().max(1_000_000),
  colour: z.string().max(30).default("grey"),
  gender: z.enum(["men", "women", "unisex"]),
  groups: z.array(z.enum(["casual", "formal", "party", "ethnic", "sport"])).min(1),
  tags: z.array(z.string().max(30)).default([]),
  tier: z.enum(["budget", "mid", "premium"]).default("mid"),
  productUrl: z.string().url().refine((u) => u.startsWith("https://"), "must be https"),
  imageUrl: z.string().url().optional(),
  sizes: z.array(z.string().max(12)).optional(),
  inStock: z.boolean().optional(),
});

let cache: { at: number; items: Product[] } | null = null;
const TTL_MS = 10 * 60 * 1000;

async function loadFeed(): Promise<Product[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  const url = process.env.PRODUCT_FEED_URL;
  if (!url) return [];
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.PRODUCT_FEED_TOKEN) headers.Authorization = `Bearer ${process.env.PRODUCT_FEED_TOKEN}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Product feed responded ${res.status}`);
  const json: unknown = await res.json();
  const raw = Array.isArray(json) ? json : (json as { products?: unknown[] })?.products ?? [];
  const items: Product[] = [];
  for (const r of raw) {
    const parsed = feedItemSchema.safeParse(r);
    if (!parsed.success) continue;
    const p = parsed.data;
    items.push({ ...p, hex: hexFor(p.colour), isSample: false });
  }
  cache = { at: Date.now(), items };
  return items;
}

export const feedProvider: ProductProvider = {
  id: "feed",
  label: "Merchant / affiliate JSON feed",
  isSample: false,
  isConfigured: () => Boolean(process.env.PRODUCT_FEED_URL),
  async search(q) {
    try {
      return filterProducts(await loadFeed(), q);
    } catch (err) {
      console.error("[product-feed]", err instanceof Error ? err.message : err);
      return [];
    }
  },
};
