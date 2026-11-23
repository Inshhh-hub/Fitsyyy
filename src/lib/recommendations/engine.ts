import type { Appearance, BodyInfo, Grooming, Outfit, OutfitReasons, Preferences, Product, Slot } from "@/types";
import { clamp, formatINR, seededRandom } from "@/lib/utils";
import { suggestionsFor } from "./appearance";
import { analyseBody, bodyReason, type BodyProfile } from "./body";
import { ESSENTIAL_SLOTS, recalc, sortItems, totalPrice } from "./budget";
import { BIAS_COLOURS, NEUTRALS, PAIR_SAFE, paletteFor, parseColours, titleCase, type Palette } from "./colour";
import { conceptsFor, type Concept, type PriceMode } from "./concepts";
import { getOccasion, inferOccasionFromText, type Occasion, type OccasionGroup } from "./occasions";
import { matchesGender } from "@/lib/product-providers/types";

export interface EngineContext {
  body: BodyInfo;
  appearance: Appearance;
  preferences: Preferences;
  occasion: Occasion;
  round: number;
  excludeIds: Set<string>;
  pool: Product[];
  seed: number;
}

interface Prepared {
  palette: Palette;
  bp: BodyProfile;
  liked: Set<string>;
  disliked: Set<string>;
  blocked: string[];
  styleWords: string[];
}

/** Resolve an occasion id (plus optional free text for "Others") into an Occasion. */
export function resolveOccasion(id: string, custom?: string): Occasion {
  const base = getOccasion(id);
  if (id === "others" && custom?.trim()) {
    const inferred = inferOccasionFromText(custom);
    return { ...inferred, id: "others", label: custom.trim().slice(0, 60) };
  }
  return base;
}

const ACCESSORY_PRIORITY: Record<OccasionGroup, Slot[]> = {
  formal: ["watch", "belt", "tie", "bag", "earrings", "wallet", "socks", "ring"],
  party: ["watch", "chain", "eyewear", "earrings", "bracelet", "ring", "belt", "bag"],
  casual: ["watch", "eyewear", "cap", "bag", "belt", "bracelet", "socks", "earrings", "ring", "scarf"],
  ethnic: ["watch", "bracelet", "chain", "earrings", "ring", "bag", "scarf"],
  sport: ["watch", "cap", "socks", "bag"],
};
const SHARE: Record<string, number> = { upper: 0.28, lower: 0.25, footwear: 0.27 };
const MODE_MUL: Record<PriceMode, number> = { value: 0.8, standard: 0.95, premium: 1.1 };
const TIER_BONUS: Record<PriceMode, Record<string, number>> = {
  value: { budget: 1, mid: 0.2, premium: -0.6 },
  standard: { budget: 0.2, mid: 0.8, premium: 0.2 },
  premium: { budget: -0.4, mid: 0.5, premium: 1.2 },
};
const TIER_VALUE: Record<string, number> = { budget: 1, mid: 2, premium: 3 };
const MAX_ITEMS = 10;

export function seasonNote(date = new Date()): string {
  const m = date.getUTCMonth(); // 0=Jan
  if (m >= 2 && m <= 4) return "Choices lean on breathable, lighter pieces suited to Indian summer heat.";
  if (m >= 5 && m <= 8) return "Easy-care, quick-drying pieces suit monsoon humidity — keep suede for dry days.";
  return "The look is layer-friendly for the cooler months and the wedding/festival season.";
}

function prepare(ctx: EngineContext): Prepared {
  const restrictions = (ctx.preferences.restrictions ?? "").toLowerCase();
  const blocked: string[] = [];
  if (/\b(no|avoid|without|hate|don'?t)\b/.test(restrictions)) {
    for (const w of restrictions.split(/[^a-z-]+/)) {
      const stem = w.replace(/s$/, "");
      if (stem.length >= 4 && !["avoid", "without", "hate", "wear", "like", "dont", "anything"].includes(stem)) blocked.push(stem);
    }
  }
  return {
    palette: paletteFor(ctx.appearance),
    bp: analyseBody(ctx.body),
    liked: new Set(parseColours(ctx.preferences.likedColours)),
    disliked: new Set(parseColours(ctx.preferences.dislikedColours)),
    blocked,
    styleWords: (ctx.preferences.style ?? "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4),
  };
}

function candidates(slot: Slot, ctx: EngineContext, prep: Prepared, strictGroup: boolean): Product[] {
  const base = ctx.pool.filter((p) => {
    if (p.slot !== slot) return false;
    if (!matchesGender(p.gender, ctx.body.category)) return false;
    if (prep.disliked.has(p.colour)) return false;
    const text = `${p.name} ${p.subtype}`.toLowerCase();
    if (prep.blocked.some((b) => text.includes(b))) return false;
    return true;
  });
  const inGroup = base.filter((p) => p.groups.includes(ctx.occasion.group));
  return inGroup.length || strictGroup ? inGroup : base;
}

function scoreItem(p: Product, concept: Concept, ctx: EngineContext, prep: Prepared, chosen: Product[], target: number, batchUsed: Set<string>, rnd: () => number): number {
  let s = p.tags.filter((t) => concept.tags.includes(t)).length * 1.2;
  s += TIER_BONUS[concept.mode][p.tier] ?? 0;

  if (prep.palette.best.includes(p.colour)) s += 1;
  if (prep.palette.avoid.includes(p.colour)) s -= 2;
  else if (NEUTRALS.has(p.colour)) s += 0.5;
  if (concept.bias !== "any" && BIAS_COLOURS[concept.bias].includes(p.colour)) s += 0.8;
  if (prep.liked.has(p.colour)) s += 1.6;

  const recipeRx = concept.recipe?.[p.slot as "upper" | "lower" | "footwear" | "outer"];
  if (recipeRx && recipeRx.test(`${p.name} ${p.subtype} ${p.colour}`)) s += 4;

  const text = `${p.name} ${p.subtype} ${p.tags.join(" ")}`.toLowerCase();
  if (prep.styleWords.some((w) => text.includes(w))) s += 1;

  const fit = ctx.preferences.fit;
  if (fit === "Oversized" && p.tags.includes("oversized")) s += 1;
  if (fit === "Relaxed" && (p.tags.includes("comfy") || p.tags.includes("oversized"))) s += 0.6;
  if (fit === "Slim" && (p.tags.includes("classic") || p.tags.includes("minimal"))) s += 0.4;
  if (prep.bp.heightBand === "compact" && p.slot === "lower" && p.tags.includes("oversized")) s -= 0.6;

  if (!PAIR_SAFE.has(p.colour)) {
    const others = new Set(chosen.filter((c) => !PAIR_SAFE.has(c.colour)).map((c) => c.colour));
    if (others.size >= 2) s -= 2;
    else if (others.size === 1 && !others.has(p.colour)) s -= 0.9;
  }
  if (concept.tags.includes("monochrome") && chosen.length) {
    if (NEUTRALS.has(p.colour) || p.colour === chosen[0].colour) s += 0.8;
  }

  if (target > 0) s -= Math.min(1.2, (Math.abs(p.price - target) / target) * 0.5);
  if (ctx.excludeIds.has(p.id)) s -= 3;
  if (batchUsed.has(p.id)) s -= 1.5;
  return s + rnd() * 0.9;
}

function pickBest(list: Product[], concept: Concept, ctx: EngineContext, prep: Prepared, chosen: Product[], target: number, batchUsed: Set<string>, rnd: () => number): Product | undefined {
  let best: Product | undefined;
  let bestScore = -Infinity;
  for (const p of list) {
    const sc = scoreItem(p, concept, ctx, prep, chosen, target, batchUsed, rnd);
    if (sc > bestScore) {
      bestScore = sc;
      best = p;
    }
  }
  return best;
}

/** Budget-aware assembly of one outfit: essentials first, then layer/accessories with what's left. */
function assemble(concept: Concept, ctx: EngineContext, prep: Prepared, batchUsed: Set<string>, rnd: () => number, attempt = 0): Product[] | null {
  const budget = ctx.body.budget;
  const strict = attempt >= 2; // on later attempts, prefer products not yet used by other outfits in this batch
  const fresh = (list: Product[]) => {
    if (!strict) return list;
    const f = list.filter((p) => !batchUsed.has(p.id));
    return f.length ? f : list;
  };
  const cands: Partial<Record<Slot, Product[]>> = {};
  for (const slot of ESSENTIAL_SLOTS) {
    const list = candidates(slot, ctx, prep, false);
    if (!list.length) return null;
    cands[slot] = list;
  }
  const priceFloor = [1.15, 1.15, 1.6, 2.2][Math.min(attempt, 3)];
  const minPrice = (slot: Slot) => Math.min(...cands[slot]!.map((p) => p.price));
  const minTotal = ESSENTIAL_SLOTS.reduce((s, sl) => s + minPrice(sl), 0);
  const chosen: Product[] = [];

  if (minTotal > budget) {
    // Cannot afford a complete outfit: show the cheapest complete set, clearly flagged as over budget.
    for (const slot of ESSENTIAL_SLOTS) {
      const floor = minPrice(slot);
      const cheapest = fresh(cands[slot]!.filter((p) => p.price <= floor * priceFloor));
      chosen.push(pickBest(cheapest, concept, ctx, prep, chosen, 0, batchUsed, rnd)!);
    }
    return chosen;
  }

  const mul = MODE_MUL[concept.mode];
  ESSENTIAL_SLOTS.forEach((slot, i) => {
    const laterMin = ESSENTIAL_SLOTS.slice(i + 1).reduce((s, sl) => s + minPrice(sl), 0);
    const spent = totalPrice(chosen);
    const cap = budget - spent - laterMin;
    const target = SHARE[slot] * budget * mul;
    let options = cands[slot]!.filter((p) => p.price <= cap && p.price <= Math.max(target * 2, minPrice(slot)));
    if (!options.length) options = cands[slot]!.filter((p) => p.price <= cap);
    if (!options.length) options = [...cands[slot]!].sort((a, b) => a.price - b.price).slice(0, 1);
    chosen.push(pickBest(fresh(options), concept, ctx, prep, chosen, target, batchUsed, rnd)!);
  });

  const extras: Slot[] = [...(concept.outer ? (["outer"] as Slot[]) : []), ...ACCESSORY_PRIORITY[ctx.occasion.group]];
  let accessories = 0;
  for (const slot of extras) {
    if (chosen.length >= MAX_ITEMS || (slot !== "outer" && accessories >= 6)) break;
    const remaining = budget - totalPrice(chosen);
    const list = fresh(candidates(slot, ctx, prep, true).filter((p) => p.price <= remaining));
    if (!list.length) continue;
    const pick = pickBest(list, concept, ctx, prep, chosen, remaining * (slot === "outer" ? 0.8 : 0.5), batchUsed, rnd);
    if (pick) {
      chosen.push(pick);
      if (slot !== "outer") accessories++;
    }
  }
  return chosen;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function fragranceFor(group: OccasionGroup): string {
  return { formal: "Fresh woody or citrus-aromatic", party: "Warm amber or musky-woody", casual: "Fresh aquatic or light citrus", ethnic: "Attar or sandalwood-based", sport: "Light deodorant only (skip heavy perfume)" }[group];
}

function groomingFor(ctx: EngineContext, index: number): Grooming {
  const sug = suggestionsFor(ctx.appearance, ctx.body.category);
  const g = ctx.occasion.group;
  const base = ["Moisturiser with SPF in the morning", "Keep brows and edges tidy"];
  if (g === "ethnic") base.push("Light oil or balm to keep hair neat through a long day");
  if (g === "formal") base.push("Fresh haircut or neat trim within a week of the event");
  if (g === "party") base.push("Texture paste or sea-salt spray for a lived-in finish");
  if (g === "sport") base.push("Tie or cut hair back and use a breathable headband or cap");
  return { hairstyle: sug.hairstyles[index % sug.hairstyles.length], tips: base.slice(0, 4), fragrance: fragranceFor(g) };
}

export interface BuildParams {
  id: string;
  name: string;
  style: string;
  concept: Concept;
  items: Product[];
  ctx: EngineContext;
  index: number;
  overrides?: { reason?: string; reasons?: Partial<OutfitReasons>; grooming?: Partial<Grooming>; aiScore?: number };
}

/** Score + explain a finished set of items. Used for both rule-engine and AI-selected outfits. */
export function makeOutfit(p: BuildParams): Outfit {
  const { ctx, concept } = p;
  const prep = prepare(ctx);
  const items = sortItems(p.items);
  const budget = ctx.body.budget;
  const total = totalPrice(items);
  const within = total <= budget;

  const tagHit = items.reduce((s, it) => s + Math.min(1, it.tags.filter((t) => concept.tags.includes(t)).length / Math.max(1, Math.min(2, concept.tags.length))), 0) / items.length;
  const occasionScore = clamp(Math.round(62 + 38 * tagHit), 0, 100);

  const pts: number[] = items.map((it) => (prep.palette.avoid.includes(it.colour) ? 0 : prep.palette.best.includes(it.colour) ? 1 : NEUTRALS.has(it.colour) ? 0.75 : 0.5));
  const accent = new Set(items.filter((it) => !PAIR_SAFE.has(it.colour)).map((it) => it.colour)).size;
  const likedBonus = items.some((it) => prep.liked.has(it.colour)) ? 4 : 0;
  const colourScore = clamp(Math.round(55 + 45 * (pts.reduce((a, b) => a + b, 0) / pts.length) + (accent <= 1 ? 4 : accent >= 3 ? -10 : 0) + likedBonus), 0, 100);

  const premiumScore = clamp(Math.round((items.reduce((s, it) => s + TIER_VALUE[it.tier], 0) / items.length) * 25 + (items.filter((it) => it.tags.includes("premium") || it.tags.includes("luxe")).length / items.length) * 25), 0, 100);

  let fitScore = 72;
  if (ctx.preferences.fit === "Oversized" && items.some((i) => i.tags.includes("oversized"))) fitScore += 10;
  if (ctx.preferences.fit === "Relaxed" && items.some((i) => i.tags.includes("comfy"))) fitScore += 8;
  if (ctx.preferences.fit === "Slim" && items.some((i) => i.tags.includes("classic"))) fitScore += 6;
  if (prep.bp.heightBand === "compact" && items.some((i) => i.tags.includes("oversized") && i.slot === "lower")) fitScore -= 6;
  fitScore = clamp(fitScore, 0, 95);

  const budgetScore = within ? 70 + 30 * Math.min(1, total / budget) : 35;
  const composite = Math.round(0.3 * occasionScore + 0.28 * colourScore + 0.17 * fitScore + 0.25 * budgetScore);
  let suitability = clamp(composite, 55, 98);
  if (p.overrides?.aiScore !== undefined) suitability = clamp(Math.round((suitability + p.overrides.aiScore) / 2), 55, 98);

  const upper = items.find((i) => i.slot === "upper");
  const lower = items.find((i) => i.slot === "lower");
  const foot = items.find((i) => i.slot === "footwear");
  const colours = [...new Set(items.filter((i) => ["upper", "outer", "lower", "footwear"].includes(i.slot)).map((i) => i.colour))];
  const inPalette = colours.filter((c) => prep.palette.best.includes(c) || NEUTRALS.has(c));
  const monochrome = concept.tags.includes("monochrome");

  let balance = "A consistent palette keeps the look cohesive.";
  if (upper && lower) {
    const lu = luminance(upper.hex);
    const ll = luminance(lower.hex);
    if (monochrome || Math.abs(lu - ll) < 0.12) balance = `The ${upper.colour} top and ${lower.colour} bottom sit close in tone, giving one continuous line from shoulder to shoe.`;
    else if (lu > ll) balance = `A lighter ${upper.colour} top over deeper ${lower.colour} bottoms draws the eye upward while the ${foot?.colour ?? "footwear"} footwear grounds the look.`;
    else balance = `A deeper ${upper.colour} top over lighter ${lower.colour} bottoms keeps the look grounded, with ${foot?.colour ?? "the footwear"} tying the pieces together.`;
  }

  const remaining = budget - total;
  const reasons: OutfitReasons = {
    body: bodyReason(prep.bp, ctx.body, { monochrome, outer: items.some((i) => i.slot === "outer"), fit: ctx.preferences.fit }),
    colour: `${colours.map(titleCase).join(", ")} ${colours.length === 1 ? "works" : "work"} with your ${ctx.appearance.skinTone.toLowerCase()} skin tone${ctx.appearance.undertone === "Uncertain" ? " (we kept to versatile shades because the undertone is uncertain)" : ` and ${ctx.appearance.undertone.toLowerCase()} undertone`}; ${inPalette.length} of ${colours.length} main colours come from your suggested palette.`,
    occasion: `${concept.style} styling is appropriate for ${ctx.occasion.label.toLowerCase()}: ${[upper, lower, foot].filter(Boolean).map((i) => i!.subtype.toLowerCase()).join(", ")}. ${seasonNote()}`,
    balance: `${balance} This is about visual balance and proportion, not changing your shape.`,
    budget: within
      ? `Total ${formatINR(total)} against your ${formatINR(budget)} budget, leaving ${formatINR(remaining)}. Top, bottom and footwear were funded first, then layers and accessories.`
      : `Total ${formatINR(total)} is ${formatINR(-remaining)} over your ${formatINR(budget)} budget — the lowest-priced complete set we found is above your budget, so this is shown as over-budget.`,
  };
  Object.assign(reasons, p.overrides?.reasons ?? {});

  const base: Outfit = {
    id: p.id,
    name: p.name,
    style: p.style,
    occasionId: ctx.occasion.id,
    occasionLabel: ctx.occasion.label,
    suitabilityScore: suitability,
    scores: { occasion: occasionScore, colour: colourScore, premium: premiumScore },
    reason: p.overrides?.reason ?? `${concept.style} take on ${ctx.occasion.label.toLowerCase()} in ${colours.slice(0, 3).map(titleCase).join(", ")}, chosen for your proportions, colouring and budget.`,
    reasons,
    items,
    grooming: { ...groomingFor(ctx, p.index), ...(p.overrides?.grooming ?? {}) },
    total,
    withinBudget: within,
    budget,
    photoQuery: concept.photo,
  };
  return recalc(base, items, budget);
}

export function outfitKey(ids: string[]): string {
  return [...ids].sort().join("|");
}

/** Rule-based outfit generation (demo mode, and per-outfit fallback when AI output fails validation). */
export function buildOutfits(ctx: EngineContext, count: number): Outfit[] {
  const prep = prepare(ctx);
  const rnd = seededRandom(ctx.seed);
  const concepts = conceptsFor(ctx.occasion.conceptSet, count, ctx.round, ctx.body.category);
  const used = new Set<string>();
  const seen = new Set<string>();
  const out: Outfit[] = [];
  const missing: Array<[Concept, number]> = [];
  concepts.forEach((concept, index) => {
    let items: Product[] | null = null;
    let key = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const tryItems = assemble(concept, ctx, prep, used, rnd, attempt);
      if (!tryItems) break;
      const k = outfitKey(tryItems.map((i) => i.id));
      if (!seen.has(k)) {
        items = tryItems;
        key = k;
        break;
      }
    }
    if (!items) {
      missing.push([concept, index]);
      return;
    }
    seen.add(key);
    items.forEach((i) => used.add(i.id));
    out.push(makeOutfit({ id: `${ctx.occasion.id}-r${ctx.round}-${index}-${key.length}`, name: concept.name, style: concept.style, concept, items, ctx, index }));
  });

  // Not enough distinct looks fit the budget: add clearly-labelled over-budget "stretch" options
  // (makeOutfit scores against the user's REAL budget, so they are flagged and carry a warning).
  const stretchCtx: EngineContext = { ...ctx, body: { ...ctx.body, budget: Math.round(ctx.body.budget * 1.4) } };
  for (const [concept, index] of missing) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const items = assemble(concept, stretchCtx, prep, used, rnd, attempt);
      if (!items) break;
      const k = outfitKey(items.map((i) => i.id));
      if (seen.has(k)) continue;
      seen.add(k);
      items.forEach((i) => used.add(i.id));
      out.push(makeOutfit({ id: `${ctx.occasion.id}-r${ctx.round}-${index}-${k.length}`, name: concept.name, style: concept.style, concept, items, ctx, index }));
      break;
    }
  }
  return out;
}

/** Rule-based replacement for a single concept (used when an AI outfit is rejected). */
export function buildSingle(concept: Concept, ctx: EngineContext, index: number, usedIds: Set<string>): Outfit | null {
  const prep = prepare(ctx);
  const items = assemble(concept, ctx, prep, usedIds, seededRandom(ctx.seed + index * 7919));
  if (!items) return null;
  const key = outfitKey(items.map((i) => i.id));
  return makeOutfit({ id: `${ctx.occasion.id}-r${ctx.round}-${index}-${key.length}`, name: concept.name, style: concept.style, concept, items, ctx, index });
}

export const SORTERS = {
  best: (a: Outfit, b: Outfit) => b.suitabilityScore - a.suitabilityScore,
  price: (a: Outfit, b: Outfit) => a.total - b.total,
  premium: (a: Outfit, b: Outfit) => b.scores.premium - a.scores.premium,
  occasion: (a: Outfit, b: Outfit) => b.scores.occasion - a.scores.occasion,
  colour: (a: Outfit, b: Outfit) => b.scores.colour - a.scores.colour,
} as const;
export type SortKey = keyof typeof SORTERS;
