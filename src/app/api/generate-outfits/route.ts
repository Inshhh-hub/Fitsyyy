import { NextResponse } from "next/server";
import type { Appearance, FaceShape, GenerateResponse, Outfit, Product, SkinTone, Slot, Undertone } from "@/types";
import { aiConfigured } from "@/lib/ai/openai";
import { generateWithAi } from "@/lib/ai/stylist";
import { searchProducts, usingSampleData } from "@/lib/product-providers";
import { suggestionsFor } from "@/lib/recommendations/appearance";
import { buildOutfits, resolveOccasion, type EngineContext } from "@/lib/recommendations/engine";
import { lookbookOutfits } from "@/lib/recommendations/lookbook";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validations/sanitize";
import { generateRequestSchema } from "@/lib/validations/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const SLOTS: Slot[] = ["upper", "outer", "lower", "footwear", "watch", "belt", "eyewear", "bag", "bracelet", "chain", "cap", "wallet", "earrings", "ring", "scarf", "tie", "socks"];

export async function POST(req: Request) {
  const rl = rateLimit(`gen:${clientIp(req)}`, 12, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many requests. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = generateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { body, round, excludeProductIds } = parsed.data;
  const appearance: Appearance = {
    ...parsed.data.appearance,
    faceShape: parsed.data.appearance.faceShape as FaceShape,
    skinTone: parsed.data.appearance.skinTone as SkinTone,
    undertone: parsed.data.appearance.undertone as Undertone,
  };
  const prefIn = parsed.data.preferences;
  const preferences = {
    ...prefIn,
    fit: prefIn.fit as EngineContext["preferences"]["fit"],
    customOccasion: sanitizeText(prefIn.customOccasion, 80),
    style: sanitizeText(prefIn.style, 80),
    likedColours: sanitizeText(prefIn.likedColours, 120),
    dislikedColours: sanitizeText(prefIn.dislikedColours, 120),
    restrictions: sanitizeText(prefIn.restrictions, 200),
  };

  try {
    const occasionIds = preferences.occasions.slice(0, 4);
    const perOccasion = occasionIds.length === 1 ? 6 : occasionIds.length <= 3 ? 4 : 3;
    const useAi = aiConfigured();
    const notices: string[] = [];
    const sample = usingSampleData();
    if (sample) notices.push("Demo mode: products are SAMPLE data without real prices or links. Connect a product feed to show live items.");
    if (!useAi) notices.push("Demo mode: using the built-in stylist engine. Add OPENAI_API_KEY to enable the AI stylist.");

    const results = await Promise.all(
      occasionIds.map(async (occId, oi) => {
        const occasion = resolveOccasion(occId, preferences.customOccasion);
        const lists = await Promise.all(
          SLOTS.map((slot) => searchProducts({ slot, gender: body.category, group: occasion.group, maxPrice: body.budget, limit: 14 })),
        );
        const pool: Product[] = lists.flat();
        const ctx: EngineContext = {
          body,
          appearance,
          preferences,
          occasion,
          round,
          excludeIds: new Set(excludeProductIds),
          pool,
          seed: (round + 1) * 1000 + oi * 37 + Math.round(body.budget % 997),
        };
        let outfits: Outfit[] = [];
        if (useAi) {
          const r = await generateWithAi(ctx, perOccasion);
          if (r.notice) notices.push(r.notice);
          outfits = r.outfits;
        }
        if (!outfits.length) outfits = buildOutfits(ctx, perOccasion);
        const usedAi = useAi && outfits.length > 0;
        if (round === 0) {
          const curated = lookbookOutfits(ctx, Math.min(2, perOccasion));
          outfits = [...curated, ...outfits].slice(0, perOccasion);
        }
        return { outfits, usedAi };
      }),
    );

    const recommendations = results.flatMap((r) => r.outfits);
    if (!recommendations.length) {
      return NextResponse.json({ error: "We couldn't assemble outfits from the available products. Try a different budget or occasion." }, { status: 422 });
    }
    const engine: GenerateResponse["engine"] = useAi && results.some((r) => r.usedAi) ? "ai" : "rules";
    const payload: GenerateResponse = {
      currency: "INR",
      engine,
      demoData: sample,
      occasions: occasionIds,
      recommendations,
      suggestions: suggestionsFor(appearance, body.category),
      notices: [...new Set(notices)],
    };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[generate-outfits]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong while styling your outfits. Please try again." }, { status: 500 });
  }
}
