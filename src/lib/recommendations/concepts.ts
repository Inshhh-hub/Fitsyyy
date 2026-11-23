import type { Bias } from "./colour";
import type { ConceptSetId } from "./occasions";

export type PriceMode = "value" | "standard" | "premium";

export interface Concept {
  name: string;
  style: string;
  tags: string[];
  bias: Bias;
  mode: PriceMode;
  /** include an outer layer (blazer, jacket, dupatta) when budget allows */
  outer: boolean;
  /** words describing the look, used to search for matching inspiration photos */
  photo: string;
  /** hand-picked "drip": items whose name/subtype/colour match get a strong boost for that slot */
  recipe?: Partial<Record<"upper" | "lower" | "footwear" | "outer", RegExp>>;
  /** limit this look to one shopper category (others see it never) */
  only?: "men" | "women";
}

const c = (name: string, style: string, tags: string[], bias: Bias, mode: PriceMode, outer: boolean, photo: string, recipe?: Concept["recipe"]): Concept => ({
  name, style, tags, bias, mode, outer, photo, recipe,
});

const men = (x: Concept): Concept => ({ ...x, only: "men" });
const women = (x: Concept): Concept => ({ ...x, only: "women" });

export const CONCEPT_SETS: Record<ConceptSetId, Concept[]> = {
  wedding: [
    c("Classic Ethnic", "Classic Ethnic", ["traditional", "classic", "wedding"], "any", "standard", true, "traditional indian wedding guest outfit kurta", { upper: /kurta|anarkali|sherwani/i }),
    c("Indo-Western Edit", "Indo-Western", ["indowestern", "wedding", "statement"], "any", "standard", true, "indo western outfit wedding jacket kurta"),
    c("Minimal Luxury", "Minimal Luxury", ["minimal", "premium", "luxe", "traditional"], "neutral", "premium", false, "minimal ivory ethnic outfit wedding"),
    c("Contemporary Formal", "Contemporary Formal", ["indowestern", "classic", "minimal"], "dark", "standard", true, "dark ethnic outfit reception nehru jacket"),
    c("Traditional Statement", "Traditional Statement", ["traditional", "statement", "wedding"], "bright", "premium", true, "rich silk ethnic outfit wedding festive colours"),
    c("Budget-Friendly Wedding", "Budget-Friendly", ["traditional", "value", "festive"], "any", "value", false, "simple cotton kurta outfit wedding guest"),
  ],
  formal: [
    c("Smart Formal", "Smart Formal", ["formal", "classic"], "dark", "standard", true, "formal office outfit shirt trousers blazer", { upper: /formal|work shirt|twill|oxford/i, lower: /trousers/i, outer: /blazer/i }),
    c("Quiet Luxury Office", "Quiet Luxury", ["formal", "minimal", "premium", "luxe"], "neutral", "premium", true, "quiet luxury office outfit neutral tailored", { lower: /trousers/i, footwear: /loafer|derby|oxford|brogue|flats/i }),
    c("Power Neutrals", "Power Neutrals", ["formal", "minimal"], "neutral", "standard", false, "beige grey tailored trousers shirt office outfit", { lower: /trousers/i }),
    c("Modern Corporate", "Modern Corporate", ["formal", "premium"], "dark", "premium", true, "modern corporate outfit navy blazer"),
    c("Smart Casual Friday", "Smart Casual", ["semiformal", "smartcasual"], "earth", "standard", false, "smart casual office outfit chinos shirt loafers", { upper: /polo|oxford|linen|shirt/i, lower: /chino|trousers/i, footwear: /loafer|sneaker|derby/i }),
    c("Budget-Friendly Professional", "Budget-Friendly", ["formal", "value"], "neutral", "value", false, "simple formal shirt trousers outfit"),
  ],
  party: [
    c("Y2K Night Out", "Y2K", ["street", "statement", "party"], "dark", "standard", false, "y2k night out outfit baggy jeans", { upper: /baby tee|corset|halter|cropped|cami|off-shoulder|band tee|boxy/i, lower: /baggy|parachute|mini skirt|cargo/i, footwear: /chunky|platform|retro|heels/i }),
    c("Black Fit Club", "All Black", ["monochrome", "street", "party"], "dark", "standard", true, "all black outfit night out", { upper: /black|charcoal/i, lower: /black|charcoal/i, footwear: /black/i }),
    c("Streetwear Night", "Streetwear", ["street", "statement", "oversized"], "dark", "standard", true, "streetwear oversized hoodie baggy jeans chunky sneakers", { upper: /oversized|hoodie|graphic|band tee|boxy/i, lower: /baggy|cargo|parachute|carpenter/i, footwear: /chunky|dad|retro|terrace/i, outer: /varsity|bomber|puffer/i }),
    men(c("Satin Shirt Night", "Smart Party", ["party", "date", "classic"], "dark", "premium", true, "men satin shirt tailored trousers chelsea boots night out", { upper: /satin|cuban|mandarin|resort/i, lower: /trousers|pleated/i, footwear: /chelsea|loafer/i, outer: /blazer|biker/i })),
    women(c("Soft Glam", "Soft Glam", ["party", "date", "statement"], "dark", "standard", false, "women going out outfit corset top wide leg trousers heels", { upper: /corset|halter|cami|off-shoulder/i, footwear: /heels|platform/i })),
    c("Denim On Denim", "Double Denim", ["street", "smartcasual"], "any", "standard", true, "double denim outfit street style", { upper: /denim/i, lower: /jeans|denim/i, outer: /denim/i }),
    c("Smart Casual Party", "Smart Casual", ["smartcasual", "party", "date"], "dark", "standard", false, "smart casual party outfit shirt trousers loafers", { upper: /shirt|top/i, lower: /trousers|jeans/i, footwear: /loafer|chelsea|sneaker|heels/i }),
  ],
  date: [
    men(c("Resort Date Night", "Resort Smart", ["date", "statement", "smartcasual"], "light", "standard", false, "men printed resort shirt cream trousers white sneakers", { upper: /resort|camp collar|cuban/i, lower: /cream pleated|pleated/i, footwear: /minimal white|white sneakers|leather sneakers/i })),
    women(c("Clean Girl Date", "Clean Girl", ["minimal", "date"], "light", "standard", false, "women clean girl outfit ribbed top wide leg trousers date", { upper: /ribbed|baby tee|poplin|knit/i, lower: /wide-leg|straight|trousers/i, footwear: /flats|sneakers|loafer/i })),
    women(c("Skirt And Tee Date", "Skirt Set", ["date", "street", "party"], "dark", "standard", false, "women mini skirt baby tee date outfit heels", { upper: /baby tee|cami|corset|halter/i, lower: /skirt/i, footwear: /heels|platform|flats/i })),
    women(c("Soft Neutrals Date", "Soft Neutrals", ["minimal", "date", "earth"], "neutral", "standard", false, "women neutral outfit knit top wide leg trousers date", { upper: /knit|ribbed|poplin|sweater/i, lower: /wide-leg|trousers|skirt/i, footwear: /flats|loafer|sneakers/i })),
    c("Old Money Lite", "Old Money", ["classic", "premium", "minimal"], "neutral", "premium", true, "old money outfit polo chinos loafers", { upper: /polo|oxford|knit|sweater/i, lower: /chino|trousers/i, footwear: /loafer|flats/i, outer: /blazer|trench/i }),
    men(c("Soft Boy Layers", "Soft Layers", ["earth", "minimal", "date"], "earth", "standard", true, "men soft boy outfit knit sweater straight jeans", { upper: /sweater|knit|camp collar|overshirt/i, lower: /jeans|chino/i, footwear: /sneaker|desert|loafer/i, outer: /overshirt|chore/i })),
    c("Evening Polish", "Evening Polish", ["classic", "date", "premium"], "dark", "premium", true, "date night smart outfit blazer dark shirt", { upper: /satin|mandarin|black|shirt|top|cami/i, lower: /black|trousers/i, footwear: /chelsea|loafer|boots|heels/i, outer: /blazer/i }),
    c("Relaxed Linen Date", "Relaxed", ["comfy", "date", "minimal"], "light", "value", false, "linen shirt beige trousers casual date outfit", { upper: /linen|camp|poplin|ribbed/i, lower: /beige|cream|wide|chino/i }),
    men(c("Smart Shirt And Chinos", "Smart Casual", ["smartcasual", "date", "classic"], "earth", "standard", false, "men smart casual date outfit shirt chinos loafers", { upper: /oxford|linen|polo|shirt/i, lower: /chino/i, footwear: /loafer|sneaker|desert/i })),
  ],
  casual: [
    c("Baggy Fit Basics", "Baggy Fit", ["street", "oversized", "comfy"], "dark", "standard", false, "oversized graphic tee baggy jeans sneakers street style", { upper: /oversized|graphic|boxy|acid wash|band tee/i, lower: /baggy|wide-leg/i, footwear: /chunky|dad|retro|terrace|sneakers/i }),
    c("Cargo Core", "Cargo Core", ["street", "earth", "oversized"], "earth", "standard", true, "cargo pants boxy tee sneakers cap street style", { upper: /boxy|pocket|tee/i, lower: /cargo|parachute|carpenter/i, footwear: /retro|canvas|sneakers/i }),
    c("Clean Basics", "Clean Basics", ["minimal", "smartcasual"], "neutral", "standard", false, "white tee straight jeans white sneakers minimal outfit", { upper: /plain|crew|poplin|ribbed|baby tee/i, lower: /straight|jeans/i, footwear: /minimal white|white|canvas/i }),
    c("Earth Tone Layers", "Earth Tones", ["earth", "smartcasual"], "earth", "standard", true, "earth tone layered outfit overshirt chinos boots", { upper: /linen|overshirt|knit|boxy pocket|sweater/i, lower: /chino|cargo|khaki|olive|beige/i, footwear: /desert|loafer|boots|sneakers/i }),
    c("Sweats Day", "Comfort", ["comfy", "value", "oversized"], "any", "value", false, "oversized sweatshirt track pants sneakers beanie casual", { upper: /sweatshirt|hoodie|oversized/i, lower: /track|jogger|cargo|baggy/i, footwear: /sneaker|slides|trainers/i }),
    c("Elevated Everyday", "Elevated", ["premium", "minimal", "classic"], "neutral", "premium", true, "elevated everyday outfit neutral tailored casual", { upper: /polo|knit|sweater|poplin/i, lower: /trousers|chino|wide-leg/i, footwear: /leather sneakers|loafer|minimal white/i }),
  ],
  festival: [
    c("Festive Classic", "Festive Classic", ["traditional", "festive"], "bright", "standard", true, "festive indian outfit kurta diwali", { upper: /kurta|kurti|anarkali/i }),
    c("Indo-Western Festive", "Indo-Western", ["indowestern", "festive"], "earth", "standard", true, "indo western festive outfit jacket kurta"),
    c("Minimal Ethnic", "Minimal Ethnic", ["minimal", "traditional"], "light", "standard", false, "minimal white ethnic outfit chikankari kurta", { upper: /chikankari|cotton straight|ivory/i }),
    c("Rich Heritage", "Heritage", ["traditional", "statement", "premium"], "bright", "premium", true, "silk ethnic outfit festive jewellery"),
    c("Everyday Ethnic", "Everyday Ethnic", ["traditional", "value", "comfy"], "any", "value", false, "everyday cotton kurta outfit"),
    c("Colour-Pop Festive", "Colour Pop", ["festive", "statement"], "bright", "standard", false, "bright coloured ethnic outfit festival"),
  ],
  gym: [
    c("Performance Core", "Performance", ["sporty", "value"], "dark", "standard", false, "gym workout outfit tee shorts training shoes"),
    c("Monochrome Trainer", "Monochrome", ["sporty", "monochrome"], "neutral", "standard", false, "all black gym outfit workout"),
    c("Premium Training", "Premium Training", ["sporty", "premium"], "dark", "premium", true, "premium gym outfit training jacket"),
    c("Colour-Pop Active", "Colour Pop", ["sporty", "statement"], "bright", "standard", false, "colourful activewear gym outfit"),
    c("Budget Gym Kit", "Budget-Friendly", ["sporty", "value"], "any", "value", false, "simple gym outfit tee shorts"),
    c("Layered Warm-Up", "Layered", ["sporty", "comfy"], "neutral", "standard", true, "gym warm up outfit track jacket joggers"),
  ],
};

/** Used on "Generate more ideas" so later rounds introduce genuinely different styling concepts. */
export const EXTRA_CONCEPTS: Concept[] = [
  c("Monochrome Edit", "Monochrome", ["monochrome", "minimal"], "neutral", "standard", false, "monochrome outfit neutral minimal"),
  c("Earth Tone Edit", "Earth Tones", ["earth", "classic"], "earth", "standard", true, "earth tone outfit brown beige olive"),
  c("Colour Pop Edit", "Colour Pop", ["statement"], "bright", "standard", false, "colourful street style outfit"),
  c("Quiet Luxury Edit", "Quiet Luxury", ["premium", "minimal", "luxe"], "neutral", "premium", true, "quiet luxury outfit neutral tailored"),
];

export function conceptsFor(set: ConceptSetId, count: number, round: number, category: "men" | "women" | "unisex" = "unisex"): Concept[] {
  const ok = (x: Concept) => !x.only || category === "unisex" || x.only === category;
  const base = CONCEPT_SETS[set].filter(ok);
  const pool = base.length >= count ? base : [...base, ...EXTRA_CONCEPTS.filter(ok)];
  if (round <= 0) return pool.slice(0, Math.min(count, pool.length));
  // Rotate the base list and mix in extras so each round feels fresh.
  const rotated = [...base.slice(round % base.length), ...base.slice(0, round % base.length)];
  const extras = EXTRA_CONCEPTS.slice((round * 2) % EXTRA_CONCEPTS.length).concat(EXTRA_CONCEPTS.slice(0, (round * 2) % EXTRA_CONCEPTS.length));
  const mix = [rotated[0], extras[0], rotated[1], extras[1], rotated[2], rotated[3]].filter(Boolean);
  return mix.slice(0, Math.min(count, mix.length));
}
