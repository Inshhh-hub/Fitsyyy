import type { FashionCategory } from "@/types";
import { COLOUR_HEX } from "./colour";
import type { OccasionGroup } from "./occasions";

/**
 * "Build around my clothes": the kinds of piece a shopper can upload.
 * The shopper picks the type (so we never guess wrongly from a photo); the server reads slot, tags
 * and the occasions it suits from this table, never from the client.
 */
export type AnchorSlot = "upper" | "lower" | "footwear" | "outer";

export interface AnchorType {
  id: string;
  label: string;
  slot: AnchorSlot;
  /** only offered to this shopper category (undefined = everyone) */
  only?: "men" | "women";
  /** occasion groups this piece can sensibly be worn to */
  groups: OccasionGroup[];
  /** same tag vocabulary as the product catalogue and the looks in concepts.ts */
  tags: string[];
}

const t = (id: string, label: string, slot: AnchorSlot, groups: OccasionGroup[], tags: string[], only?: "men" | "women"): AnchorType => ({ id, label, slot, groups, tags, only });

export const ANCHOR_TYPES: AnchorType[] = [
  // Bottomwear
  t("baggy", "Baggy pants / jeans", "lower", ["casual", "party"], ["street", "oversized", "comfy"]),
  t("straight-jeans", "Straight jeans", "lower", ["casual", "party"], ["classic", "minimal", "smartcasual"]),
  t("slim-jeans", "Slim / skinny jeans", "lower", ["casual", "party"], ["classic", "smartcasual", "party"]),
  t("cargo", "Cargo pants", "lower", ["casual", "party"], ["street", "earth", "oversized"]),
  t("chinos", "Chinos", "lower", ["casual", "formal", "party"], ["smartcasual", "classic", "earth", "semiformal"]),
  t("trousers", "Formal trousers", "lower", ["formal", "casual", "party"], ["formal", "classic", "minimal", "semiformal"]),
  t("pleated", "Pleated trousers", "lower", ["formal", "casual", "party"], ["classic", "minimal", "premium", "date"]),
  t("wide-leg", "Wide-leg trousers", "lower", ["casual", "party", "formal"], ["minimal", "date", "street"], "women"),
  t("joggers", "Joggers / track pants", "lower", ["casual", "sport"], ["comfy", "sporty", "oversized"]),
  t("shorts", "Shorts", "lower", ["casual", "sport"], ["comfy", "sporty", "street"]),
  t("skirt", "Skirt", "lower", ["casual", "party"], ["date", "party", "street"], "women"),
  t("ethnic-bottom", "Pyjama / palazzo / salwar", "lower", ["ethnic"], ["traditional", "festive", "wedding"]),
  // Upperwear
  t("tee", "T-shirt", "upper", ["casual", "party", "sport"], ["minimal", "comfy", "street", "smartcasual"]),
  t("oversized-tee", "Oversized / graphic tee", "upper", ["casual", "party"], ["street", "oversized", "statement"]),
  t("polo", "Polo", "upper", ["casual", "formal", "party"], ["smartcasual", "classic", "minimal", "semiformal"]),
  t("shirt", "Casual shirt", "upper", ["casual", "party", "formal"], ["classic", "smartcasual", "date"]),
  t("formal-shirt", "Formal shirt", "upper", ["formal", "casual", "party"], ["formal", "classic", "semiformal"]),
  t("hoodie", "Hoodie / sweatshirt", "upper", ["casual", "sport"], ["comfy", "oversized", "street"]),
  t("sweater", "Sweater / knit", "upper", ["casual", "party", "formal"], ["minimal", "earth", "classic", "date"]),
  t("top", "Top / blouse", "upper", ["casual", "party", "formal"], ["date", "party", "minimal", "street"], "women"),
  t("kurta", "Kurta / kurti", "upper", ["ethnic", "casual"], ["traditional", "festive", "wedding"]),
  t("gym-tee", "Gym tee / tank", "upper", ["sport", "casual"], ["sporty", "comfy"]),
  // Footwear
  t("white-sneakers", "White sneakers", "footwear", ["casual", "party", "formal"], ["minimal", "smartcasual", "street"]),
  t("chunky-sneakers", "Chunky sneakers", "footwear", ["casual", "party"], ["street", "statement", "oversized"]),
  t("formal-shoes", "Formal shoes", "footwear", ["formal", "party"], ["formal", "classic", "premium"]),
  t("loafers", "Loafers", "footwear", ["formal", "casual", "party"], ["classic", "smartcasual", "premium"]),
  t("boots", "Boots", "footwear", ["casual", "party"], ["street", "earth", "date"]),
  t("slides", "Sandals / slides", "footwear", ["casual"], ["comfy", "value"]),
  t("training-shoes", "Running / training shoes", "footwear", ["sport", "casual"], ["sporty", "comfy"]),
  t("heels", "Heels", "footwear", ["party", "formal"], ["party", "date", "statement"], "women"),
  t("juttis", "Juttis / mojaris", "footwear", ["ethnic"], ["traditional", "festive", "wedding"]),
  // Layers
  t("denim-jacket", "Denim jacket", "outer", ["casual", "party"], ["street", "smartcasual"]),
  t("jacket", "Jacket / bomber", "outer", ["casual", "party"], ["street", "statement", "earth"]),
  t("blazer", "Blazer", "outer", ["formal", "party", "casual"], ["formal", "classic", "premium", "semiformal"]),
  t("overshirt", "Overshirt / shacket", "outer", ["casual", "party"], ["earth", "smartcasual", "minimal"]),
  t("ethnic-jacket", "Nehru / ethnic jacket", "outer", ["ethnic"], ["traditional", "festive", "indowestern"]),
];

export const ANCHOR_SLOT_LABEL: Record<AnchorSlot, string> = { upper: "Upperwear", lower: "Bottomwear", footwear: "Footwear", outer: "Layer" };

export function anchorTypesFor(category: FashionCategory): AnchorType[] {
  return ANCHOR_TYPES.filter((a) => !a.only || category === "unisex" || a.only === category);
}

export function getAnchorType(id: string): AnchorType | undefined {
  return ANCHOR_TYPES.find((a) => a.id === id);
}

export const ANCHOR_COLOURS = Object.keys(COLOUR_HEX);

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

/** Closest named colour family to an average photo colour (perceptual Lab distance). */
export function nearestColour(rgb: [number, number, number]): string {
  const lab = toLab(rgb);
  let best = "black";
  let bestD = Infinity;
  for (const [name, hex] of Object.entries(COLOUR_HEX)) {
    const l = toLab(hexToRgb(hex));
    const d = (l[0] - lab[0]) ** 2 + (l[1] - lab[1]) ** 2 + (l[2] - lab[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}
