import { NextResponse } from "next/server";
import { z } from "zod";
import type { Appearance, FaceShape, Outfit, Product, SkinTone, Slot, Undertone } from "@/types";
import { searchProducts } from "@/lib/product-providers";
import { getAnchorType } from "@/lib/recommendations/anchor";
import { COLOUR_HEX, hexFor } from "@/lib/recommendations/colour";
import { buildAround, type EngineContext } from "@/lib/recommendations/engine";
import type { OccasionGroup } from "@/lib/recommendations/occasions";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validations/sanitize";
import { appearanceSchema, bodyInfoSchema } from "@/lib/validations/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

const SLOTS: Slot[] = ["upper", "outer", "lower", "footwear", "watch", "belt", "eyewear", "bag", "bracelet", "chain", "cap", "wallet", "earrings", "ring", "scarf", "tie", "socks"];

const requestSchema = z.object({
  body: bodyInfoSchema,
  appearance: appearanceSchema,
  preferences: z
    .object({
      fit: z.string().max(20).optional(),
      likedColours: z.string().max(120).optional(),
      dislikedColours: z.string().max(120).optional(),
      restrictions: z.string().max(200).optional(),
      style: z.string().max(80).optional(),
    })
    .optional(),
  /** Only a type and a colour are sent. The photo itself never leaves the phone. */
  anchor: z.object({
    typeId: z.string().max(30),
    colour: z.string().max(20).refine((c) => c in COLOUR_HEX, "Unknown colour"),
  }),
  variant: z.number().int().min(0).max(20).default(0),
});

export async function POST(req: Request) {
  const rl = rateLimit(`around:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many requests. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });

  const { body, variant } = parsed.data;
  const type = getAnchorType(parsed.data.anchor.typeId);
  if (!type) return NextResponse.json({ error: "Pick what kind of clothing this is." }, { status: 400 });
  if (type.only && body.category !== "unisex" && type.only !== body.category) {
    return NextResponse.json({ error: "That clothing type isn't available for your style category." }, { status: 400 });
  }

  const appearance: Appearance = {
    ...parsed.data.appearance,
    faceShape: parsed.data.appearance.faceShape as FaceShape,
    skinTone: parsed.data.appearance.skinTone as SkinTone,
    undertone: parsed.data.appearance.undertone as Undertone,
  };
  const p = parsed.data.preferences ?? {};
  const preferences = {
    occasions: [],
    fit: p.fit as EngineContext["preferences"]["fit"],
    style: sanitizeText(p.style, 80),
    likedColours: sanitizeText(p.likedColours, 120),
    dislikedColours: sanitizeText(p.dislikedColours, 120),
    restrictions: sanitizeText(p.restrictions, 200),
  };

  const colour = parsed.data.anchor.colour;
  const anchor: Product = {
    id: `own-${type.id}-${colour}`,
    name: type.name,
    brand: "Yours",
    merchant: "From your wardrobe",
    slot: type.slot,
    subtype: type.name,
    price: 0,
    colour,
    hex: hexFor(colour),
    gender: body.category,
    groups: type.groups,
    tags: type.tags,
    tier: "mid",
    isSample: false,
    owned: true,
  };

  try {
    const pools: Partial<Record<OccasionGroup, Product[]>> = {};
    await Promise.all(
      (["casual", "formal", "party", "ethnic", "sport"] as OccasionGroup[])
        .filter((g) => type.groups.includes(g))
        .map(async (group) => {
          const lists = await Promise.all(SLOTS.map((slot) => searchProducts({ slot, gender: body.category, group, maxPrice: Math.round(body.budget * 1.4), limit: 14 })));
          pools[group] = lists.flat();
        }),
    );

    const outfits: Outfit[] = buildAround({
      body,
      appearance,
      preferences,
      pools,
      anchor,
      groups: type.groups,
      count: 6,
      seed: (variant + 1) * 1000 + Math.round(body.budget % 997),
    });
    if (outfits.length < 5) {
      return NextResponse.json({ error: "We couldn't build enough looks around that piece with the current catalogue. Try a different budget or clothing type." }, { status: 422 });
    }
    return NextResponse.json({ anchor, outfits });
  } catch (err) {
    console.error("[build-around]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong while styling around your piece. Please try again." }, { status: 500 });
  }
}
