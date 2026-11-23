import "server-only";
import type { Outfit, Product } from "@/types";
import { aiResponseSchema } from "@/lib/validations/schemas";
import { analyseBody } from "@/lib/recommendations/body";
import { paletteFor } from "@/lib/recommendations/colour";
import { buildSingle, makeOutfit, outfitKey, seasonNote, type EngineContext } from "@/lib/recommendations/engine";
import { ESSENTIAL_SLOTS } from "@/lib/recommendations/budget";
import { conceptsFor, type Concept } from "@/lib/recommendations/concepts";
import { chatJson } from "./openai";

const SYSTEM = `You are fitsy, a premium personal fashion stylist for Indian shoppers.
Rules:
- Build outfits ONLY from the candidate products provided. Reference them by "id". Never invent products, brands, prices or links.
- Each outfit needs exactly one "upper", one "lower" and one "footwear" product; you may add one "outer" and up to 4 accessories (one per slot). Max 8 items.
- The sum of the chosen products' prices must not exceed the user's budget. Fund essentials first.
- Every outfit must follow a DIFFERENT styling concept from the list given. Do not produce variations of one outfit; avoid reusing the same product across outfits where alternatives exist.
- Explain in plain, specific language: why it suits the user's height/proportions, why the colours suit their skin tone and undertone, why it fits the occasion (consider Indian weather and trends), how it improves visual balance, and why it fits the budget.
- Never claim an outfit changes someone's body shape. Talk about balance, proportion and comfort.
- Never infer or mention ethnicity, race, religion, health or identity.
- Respond with JSON only: {"occasion": string, "currency": "INR", "recommendations": [{"name","style","occasion","suitability_score","reason","reasons":{"body","colour","occasion","balance","budget"},"item_ids":[...],"grooming":{"hairstyle","tips":[...],"fragrance"}}]}`;

function compact(p: Product) {
  return { id: p.id, slot: p.slot, name: p.name, price: p.price, colour: p.colour, tags: p.tags, tier: p.tier };
}

export interface StylistResult {
  outfits: Outfit[];
  usedAi: boolean;
  notice?: string;
}

/**
 * Ask the model to compose outfits from the real candidate pool, then validate EVERYTHING it returns:
 * unknown ids, duplicate slots, missing essentials and over-budget sets are rejected and replaced by the rule engine.
 * Prices and totals always come from the product data, never from the model.
 */
export async function generateWithAi(ctx: EngineContext, count: number): Promise<StylistResult> {
  const concepts = conceptsFor(ctx.occasion.conceptSet, count, ctx.round);
  const byId = new Map(ctx.pool.map((p) => [p.id, p]));
  const bp = analyseBody(ctx.body);
  const palette = paletteFor(ctx.appearance);

  const candidates = ctx.pool
    .filter((p) => p.groups.includes(ctx.occasion.group) && (ctx.body.category === "unisex" || p.gender === "unisex" || p.gender === ctx.body.category))
    .map(compact);

  const user = JSON.stringify({
    occasion: ctx.occasion.label,
    season_note: seasonNote(),
    budget_inr: ctx.body.budget,
    fashion_category: ctx.body.category,
    body: { height_cm: ctx.body.heightCm, weight_kg: ctx.body.weightKg, frame: bp.frame, height_band: bp.heightBand, optional: { shoulder: ctx.body.shoulderCm, chest: ctx.body.chestCm, waist: ctx.body.waistCm, hip: ctx.body.hipCm } },
    appearance: { face_shape: ctx.appearance.faceShape, skin_tone: ctx.appearance.skinTone, undertone: ctx.appearance.undertone, flattering_colours: palette.best, colours_to_limit: palette.avoid },
    preferences: { style: ctx.preferences.style, liked_colours: ctx.preferences.likedColours, disliked_colours: ctx.preferences.dislikedColours, fit: ctx.preferences.fit, restrictions: ctx.preferences.restrictions },
    concepts: concepts.map((c) => ({ name: c.name, style: c.style, mood_tags: c.tags, price_mode: c.mode })),
    avoid_reusing_product_ids: [...ctx.excludeIds].slice(0, 60),
    candidate_products: candidates,
  });

  const accepted: Outfit[] = [];
  const usedIds = new Set<string>();
  const seen = new Set<string>();
  let aiFailed = false;
  let rejected = 0;

  try {
    const raw = await chatJson(SYSTEM, user);
    const parsed = aiResponseSchema.safeParse(raw);
    if (!parsed.success) throw new Error("AI JSON failed schema validation");

    concepts.forEach((concept, index) => {
      const rec = parsed.data.recommendations[index];
      const outfit = rec ? validateAiOutfit(rec, concept, index, ctx, byId) : null;
      if (outfit && !seen.has(outfitKey(outfit.items.map((i) => i.id)))) {
        seen.add(outfitKey(outfit.items.map((i) => i.id)));
        outfit.items.forEach((i) => usedIds.add(i.id));
        accepted.push(outfit);
      } else {
        rejected++;
        const fb = buildSingle(concept, ctx, index, usedIds);
        if (fb) {
          fb.items.forEach((i) => usedIds.add(i.id));
          accepted.push(fb);
        }
      }
    });
  } catch (err) {
    console.error("[stylist]", err instanceof Error ? err.message : err);
    aiFailed = true;
  }

  if (aiFailed) return { outfits: [], usedAi: false, notice: "The AI stylist was unavailable, so the built-in stylist engine was used instead." };
  return {
    outfits: accepted,
    usedAi: true,
    notice: rejected ? `${rejected} AI suggestion(s) failed validation and were replaced by the built-in engine.` : undefined,
  };
}

function validateAiOutfit(
  rec: ReturnType<typeof aiResponseSchema.parse>["recommendations"][number],
  concept: Concept,
  index: number,
  ctx: EngineContext,
  byId: Map<string, Product>,
): Outfit | null {
  const items: Product[] = [];
  const slots = new Set<string>();
  for (const id of rec.item_ids) {
    const p = byId.get(id);
    if (!p) return null; // unknown product: model invented it
    if (slots.has(p.slot)) return null; // two items for one slot
    slots.add(p.slot);
    items.push(p);
  }
  if (!ESSENTIAL_SLOTS.every((s) => slots.has(s))) return null;
  const total = items.reduce((s, p) => s + p.price, 0);
  if (total > ctx.body.budget) return null; // over budget -> rule engine fallback
  return makeOutfit({
    id: `${ctx.occasion.id}-r${ctx.round}-${index}-ai`,
    name: rec.name,
    style: rec.style,
    concept,
    items,
    ctx,
    index,
    overrides: { reason: rec.reason, reasons: rec.reasons, grooming: rec.grooming, aiScore: rec.suitability_score },
  });
}
