import { z } from "zod";
import type { Outfit, Product, Slot } from "@/types";
import raw from "../../../data/lookbook.json";
import { hexFor } from "./colour";
import { makeOutfit, type EngineContext } from "./engine";
import type { Concept } from "./concepts";

const SLOTS = ["upper", "outer", "lower", "footwear", "watch", "belt", "eyewear", "bag", "bracelet", "chain", "cap", "wallet", "earrings", "ring", "scarf", "tie", "socks"] as const;

const lookSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  occasions: z.array(z.string()).min(1),
  gender: z.enum(["men", "women", "unisex"]),
  tags: z.array(z.string()).default([]),
  photoQuery: z.string().max(120).optional(),
  unsplashId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/).optional(),
  photoUrl: z.string().url().startsWith("https://").optional(),
  credit: z.string().max(80).optional(),
  creditUrl: z.string().url().startsWith("https://").optional(),
  items: z.array(z.object({
    slot: z.enum(SLOTS),
    name: z.string().min(2).max(80),
    colour: z.string().min(2).max(20),
    price: z.number().positive().max(200000),
    url: z.string().url().startsWith("https://").optional(),
  })).min(3).max(10),
});

const LOOKS = (raw as unknown[]).flatMap((r) => {
  const p = lookSchema.safeParse(r);
  return p.success ? [p.data] : [];
});

function merchantOf(url: string): string {
  const h = new URL(url).hostname.replace(/^www\./, "");
  if (h.includes("myntra")) return "Myntra";
  if (h.includes("ajio")) return "Ajio";
  if (h.includes("flipkart") || h.includes("fkrt")) return "Flipkart";
  if (h.includes("amazon") || h.includes("amzn")) return "Amazon";
  return h;
}

function tierOf(price: number): Product["tier"] {
  return price < 1200 ? "budget" : price < 2800 ? "mid" : "premium";
}

/**
 * Hand-curated looks from data/lookbook.json. The items ARE the look, so when a photo is attached to the entry
 * the outfit in the photo and the item list match. Prices are the curator's estimates, never live prices.
 */
export function lookbookOutfits(ctx: EngineContext, max: number): Outfit[] {
  const cat = ctx.body.category;
  const out: Outfit[] = [];
  for (const look of LOOKS) {
    if (!look.occasions.includes(ctx.occasion.id)) continue;
    if (cat !== "unisex" && look.gender !== "unisex" && look.gender !== cat) continue;
    if (ctx.excludeIds.has(`lb-${look.id}`)) continue;
    const items: Product[] = look.items.map((it, i) => ({
      id: `lb-${look.id}-${it.slot}-${i}`,
      name: it.name,
      brand: it.url ? "Linked product" : "Estimated",
      merchant: it.url ? merchantOf(it.url) : "Search to buy",
      slot: it.slot as Slot,
      subtype: it.name,
      price: Math.round(it.price),
      colour: it.colour.toLowerCase(),
      hex: hexFor(it.colour.toLowerCase()),
      gender: look.gender === "unisex" ? "unisex" : look.gender,
      groups: [ctx.occasion.group],
      tags: look.tags,
      tier: tierOf(it.price),
      productUrl: it.url,
      isSample: !it.url,
      searchQuery: `${look.gender === "women" ? "women" : look.gender === "men" ? "men" : ""} ${it.colour} ${it.name}`.replace(/\s+/g, " ").trim(),
    }));
    const total = items.reduce((s, i) => s + i.price, 0);
    if (total > ctx.body.budget) continue; // curated looks are only shown when they fit the budget
    const concept: Concept = { name: look.name, style: look.name, tags: look.tags, bias: "any", mode: "standard", outer: false, photo: look.photoQuery ?? "" };
    const o = makeOutfit({ id: `lb-${look.id}`, name: look.name, style: look.name, concept, items, ctx, index: out.length });
    out.push({
      ...o,
      curated: true,
      photoQuery: look.photoQuery,
      lookPhoto: look.unsplashId || look.photoUrl ? { unsplashId: look.unsplashId, url: look.photoUrl, credit: look.credit, creditUrl: look.creditUrl } : undefined,
    });
    if (out.length >= max) break;
  }
  return out;
}
