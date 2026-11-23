import { NextResponse } from "next/server";
import type { Slot } from "@/types";
import { searchProducts, usingSampleData } from "@/lib/product-providers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validations/sanitize";
import { productQuerySchema } from "@/lib/validations/schemas";

export const runtime = "nodejs";

const VALID_SLOTS = new Set(["upper", "outer", "lower", "footwear", "watch", "belt", "eyewear", "bag", "bracelet", "chain", "cap", "wallet", "earrings", "ring", "scarf", "tie", "socks"]);

/** GET /api/products?slot=footwear&gender=men&group=casual&maxPrice=2000 — alternatives for "Replace this item". */
export async function GET(req: Request) {
  const rl = rateLimit(`prod:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = productQuerySchema.safeParse(params);
  if (!parsed.success || !VALID_SLOTS.has(parsed.data.slot)) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 });
  }
  const q = parsed.data;
  const products = await searchProducts({
    slot: q.slot as Slot,
    gender: q.gender,
    group: q.group,
    q: q.q ? sanitizeText(q.q, 60) : undefined,
    excludeIds: q.exclude ? q.exclude.split(",").slice(0, 40) : undefined,
    limit: 40,
  });
  // Return cheaper first; the client labels anything over budget as an alternative outside budget.
  products.sort((a, b) => a.price - b.price);
  return NextResponse.json({ sample: usingSampleData(), products: products.slice(0, q.limit * 2) });
}
