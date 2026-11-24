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
  /** short noun phrase used inside outfit text, e.g. "Baggy pants" */
  name: string;
  slot: AnchorSlot;
  /** only offered to this shopper category (undefined = everyone) */
  only?: "men" | "women";
  /** occasion groups this piece can sensibly be worn to */
  groups: OccasionGroup[];
  /** same tag vocabulary as the product catalogue and the looks in concepts.ts */
  tags: string[];
}

const t = (id: string, label: string, name: string, slot: AnchorSlot, groups: OccasionGroup[], tags: string[], only?: "men" | "women"): AnchorType => ({ id, label, name, slot, groups, tags, only });

export const ANCHOR_TYPES: AnchorType[] = [
  // Bottomwear
  t("baggy", "Baggy / loose pants & jeans", "Baggy pants", "lower", ["casual", "party"], ["street", "oversized", "comfy"]),
  t("parachute", "Parachute pants", "Parachute pants", "lower", ["casual", "party"], ["street", "oversized", "statement"]),
  t("flared", "Flared / bootcut jeans", "Flared jeans", "lower", ["casual", "party"], ["street", "party", "statement"]),
  t("jorts", "Jorts / baggy shorts", "Jorts", "lower", ["casual"], ["street", "oversized", "comfy"]),
  t("trousers", "Formal trousers", "Formal trousers", "lower", ["formal", "casual", "party"], ["formal", "classic", "minimal", "semiformal"]),
  t("pleated", "Pleated trousers", "Pleated trousers", "lower", ["formal", "casual", "party"], ["classic", "minimal", "premium", "date"]),
  t("wide-leg", "Wide-leg trousers", "Wide-leg trousers", "lower", ["casual", "party", "formal"], ["minimal", "date", "street"], "women"),
  t("joggers", "Joggers / track pants", "Joggers", "lower", ["casual", "sport"], ["comfy", "sporty", "oversized"]),
  t("shorts", "Shorts", "Shorts", "lower", ["casual", "sport"], ["comfy", "sporty", "street"]),
  t("leggings", "Leggings / jeggings", "Leggings", "lower", ["casual", "sport"], ["comfy", "sporty", "minimal"], "women"),
  t("skirt", "Skirt", "Skirt", "lower", ["casual", "party"], ["date", "party", "street"], "women"),
  t("ethnic-bottom", "Pyjama / palazzo / salwar", "Palazzo pants", "lower", ["ethnic"], ["traditional", "festive", "wedding"]),
  // Upperwear
  t("tee", "T-shirt", "T-shirt", "upper", ["casual", "party", "sport"], ["minimal", "comfy", "street", "smartcasual"]),
  t("oversized-tee", "Oversized / graphic tee", "Oversized tee", "upper", ["casual", "party"], ["street", "oversized", "statement"]),
  t("henley", "Henley / full-sleeve tee", "Henley", "upper", ["casual", "party"], ["minimal", "classic", "smartcasual"]),
  t("polo", "Polo", "Polo", "upper", ["casual", "formal", "party"], ["smartcasual", "classic", "minimal", "semiformal"]),
  t("shirt", "Casual shirt", "Casual shirt", "upper", ["casual", "party", "formal"], ["classic", "smartcasual", "date"]),
  t("resort-shirt", "Resort / printed shirt", "Resort shirt", "upper", ["casual", "party"], ["date", "statement", "smartcasual"]),
  t("linen-shirt", "Linen shirt", "Linen shirt", "upper", ["casual", "party", "formal"], ["minimal", "date", "earth", "smartcasual"]),
  t("flannel", "Flannel / checked shirt", "Flannel shirt", "upper", ["casual", "party"], ["earth", "street", "smartcasual"]),
  t("formal-shirt", "Formal shirt", "Formal shirt", "upper", ["formal", "casual", "party"], ["formal", "classic", "semiformal"]),
  t("hoodie", "Hoodie / sweatshirt", "Hoodie", "upper", ["casual", "sport"], ["comfy", "oversized", "street"]),
  t("sweater", "Sweater / knit", "Sweater", "upper", ["casual", "party", "formal"], ["minimal", "earth", "classic", "date"]),
  t("top", "Top / blouse", "Top", "upper", ["casual", "party", "formal"], ["date", "party", "minimal", "street"], "women"),
  t("crop-top", "Crop top", "Crop top", "upper", ["casual", "party"], ["party", "street", "date"], "women"),
  t("kurta", "Kurta / kurti", "Kurta", "upper", ["ethnic", "casual"], ["traditional", "festive", "wedding"]),
  t("gym-tee", "Gym tee / tank", "Gym tee", "upper", ["sport", "casual"], ["sporty", "comfy"]),
  // Footwear
  t("white-sneakers", "Sneakers (white / minimal)", "White sneakers", "footwear", ["casual", "party", "formal"], ["minimal", "smartcasual", "street"]),
  t("chunky-sneakers", "Chunky sneakers", "Chunky sneakers", "footwear", ["casual", "party"], ["street", "statement", "oversized"]),
  t("canvas", "Canvas / slip-on shoes", "Canvas shoes", "footwear", ["casual"], ["minimal", "comfy", "value"]),
  t("formal-shoes", "Formal shoes (oxford / derby)", "Formal shoes", "footwear", ["formal", "party"], ["formal", "classic", "premium"]),
  t("loafers", "Loafers", "Loafers", "footwear", ["formal", "casual", "party"], ["classic", "smartcasual", "premium"]),
  t("boots", "Boots", "Boots", "footwear", ["casual", "party"], ["street", "earth", "date"]),
  t("slides", "Sandals / slides", "Sandals", "footwear", ["casual"], ["comfy", "value"]),
  t("training-shoes", "Running / training shoes", "Running shoes", "footwear", ["sport", "casual"], ["sporty", "comfy"]),
  t("heels", "Heels", "Heels", "footwear", ["party", "formal"], ["party", "date", "statement"], "women"),
  t("flats", "Flats / ballerinas", "Flats", "footwear", ["casual", "formal"], ["minimal", "classic", "date"], "women"),
  t("juttis", "Juttis / mojaris", "Juttis", "footwear", ["ethnic"], ["traditional", "festive", "wedding"]),
  // Layers
  t("denim-jacket", "Denim jacket", "Denim jacket", "outer", ["casual", "party"], ["street", "smartcasual"]),
  t("jacket", "Jacket / bomber", "Jacket", "outer", ["casual", "party"], ["street", "statement", "earth"]),
  t("leather-jacket", "Leather / biker jacket", "Leather jacket", "outer", ["casual", "party"], ["street", "statement", "party"]),
  t("puffer", "Puffer jacket", "Puffer jacket", "outer", ["casual", "party"], ["street", "comfy"]),
  t("track-jacket", "Track jacket / windcheater", "Track jacket", "outer", ["casual", "sport"], ["sporty", "street", "comfy"]),
  t("blazer", "Blazer", "Blazer", "outer", ["formal", "party", "casual"], ["formal", "classic", "premium", "semiformal"]),
  t("coat", "Trench / long coat", "Long coat", "outer", ["formal", "casual"], ["classic", "premium", "minimal"]),
  t("cardigan", "Cardigan / shrug", "Cardigan", "outer", ["casual", "party"], ["minimal", "earth", "date"]),
  t("overshirt", "Overshirt / shacket", "Overshirt", "outer", ["casual", "party"], ["earth", "smartcasual", "minimal"]),
  t("ethnic-jacket", "Nehru / ethnic jacket / waistcoat", "Nehru jacket", "outer", ["ethnic"], ["traditional", "festive", "indowestern"]),
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
