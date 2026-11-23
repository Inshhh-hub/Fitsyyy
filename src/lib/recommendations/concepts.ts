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
}

const c = (name: string, style: string, tags: string[], bias: Bias, mode: PriceMode, outer: boolean): Concept => ({
  name, style, tags, bias, mode, outer,
});

export const CONCEPT_SETS: Record<ConceptSetId, Concept[]> = {
  wedding: [
    c("Classic Ethnic", "Classic Ethnic", ["traditional", "classic", "wedding"], "any", "standard", true),
    c("Indo-Western Edit", "Indo-Western", ["indowestern", "wedding", "statement"], "any", "standard", true),
    c("Minimal Luxury", "Minimal Luxury", ["minimal", "premium", "luxe", "traditional"], "neutral", "premium", false),
    c("Contemporary Formal", "Contemporary Formal", ["indowestern", "classic", "minimal"], "dark", "standard", true),
    c("Traditional Statement", "Traditional Statement", ["traditional", "statement", "wedding"], "bright", "premium", true),
    c("Budget-Friendly Wedding", "Budget-Friendly", ["traditional", "value", "festive"], "any", "value", false),
  ],
  formal: [
    c("Smart Formal", "Smart Formal", ["formal", "classic"], "dark", "standard", true),
    c("Business Casual", "Business Casual", ["smartcasual", "semiformal"], "earth", "standard", false),
    c("Minimal Professional", "Minimal Professional", ["formal", "minimal"], "neutral", "standard", false),
    c("Modern Corporate", "Modern Corporate", ["formal", "premium"], "dark", "premium", true),
    c("Semi-Formal", "Semi-Formal", ["semiformal", "classic"], "light", "standard", false),
    c("Budget-Friendly Professional", "Budget-Friendly", ["formal", "value"], "neutral", "value", false),
  ],
  party: [
    c("Streetwear Night", "Streetwear", ["street", "statement"], "dark", "standard", true),
    c("Smart Casual Party", "Smart Casual", ["smartcasual", "party"], "dark", "standard", false),
    c("Minimal Monochrome", "Minimal Monochrome", ["minimal", "monochrome"], "neutral", "standard", false),
    c("Premium Party Look", "Premium Party", ["party", "premium", "statement"], "dark", "premium", true),
    c("Oversized Street Style", "Oversized Street", ["oversized", "street"], "any", "standard", false),
    c("Contemporary Evening", "Contemporary Evening", ["party", "date", "classic"], "dark", "standard", true),
  ],
  date: [
    c("Effortless Smart Casual", "Smart Casual", ["smartcasual", "date"], "earth", "standard", false),
    c("Soft Minimal", "Soft Minimal", ["minimal", "date"], "light", "standard", false),
    c("Evening Polish", "Evening Polish", ["classic", "date", "premium"], "dark", "premium", true),
    c("Textured Neutrals", "Textured Neutrals", ["earth", "minimal", "premium"], "earth", "standard", false),
    c("Relaxed Romantic", "Relaxed", ["comfy", "date", "minimal"], "light", "value", false),
    c("Budget Date Night", "Budget-Friendly", ["date", "value"], "any", "value", false),
  ],
  casual: [
    c("Smart Casual Minimalist", "Smart Casual", ["smartcasual", "minimal"], "neutral", "standard", false),
    c("Street Casual", "Streetwear", ["street", "oversized"], "dark", "standard", true),
    c("Earth-Tone Easy", "Earth Tones", ["earth", "smartcasual"], "earth", "standard", true),
    c("Classic Weekend", "Classic", ["classic", "smartcasual"], "light", "standard", false),
    c("Comfort-First", "Comfort", ["comfy", "value"], "any", "value", false),
    c("Elevated Everyday", "Elevated", ["premium", "minimal"], "neutral", "premium", true),
  ],
  festival: [
    c("Festive Classic", "Festive Classic", ["traditional", "festive"], "bright", "standard", true),
    c("Indo-Western Festive", "Indo-Western", ["indowestern", "festive"], "earth", "standard", true),
    c("Minimal Ethnic", "Minimal Ethnic", ["minimal", "traditional"], "light", "standard", false),
    c("Rich Heritage", "Heritage", ["traditional", "statement", "premium"], "bright", "premium", true),
    c("Everyday Ethnic", "Everyday Ethnic", ["traditional", "value", "comfy"], "any", "value", false),
    c("Colour-Pop Festive", "Colour Pop", ["festive", "statement"], "bright", "standard", false),
  ],
  gym: [
    c("Performance Core", "Performance", ["sporty", "value"], "dark", "standard", false),
    c("Monochrome Trainer", "Monochrome", ["sporty", "monochrome"], "neutral", "standard", false),
    c("Premium Training", "Premium Training", ["sporty", "premium"], "dark", "premium", true),
    c("Colour-Pop Active", "Colour Pop", ["sporty", "statement"], "bright", "standard", false),
    c("Budget Gym Kit", "Budget-Friendly", ["sporty", "value"], "any", "value", false),
    c("Layered Warm-Up", "Layered", ["sporty", "comfy"], "neutral", "standard", true),
  ],
};

/** Used on "Generate more ideas" so later rounds introduce genuinely different styling concepts. */
export const EXTRA_CONCEPTS: Concept[] = [
  c("Monochrome Edit", "Monochrome", ["monochrome", "minimal"], "neutral", "standard", false),
  c("Earth Tone Edit", "Earth Tones", ["earth", "classic"], "earth", "standard", true),
  c("Colour Pop Edit", "Colour Pop", ["statement"], "bright", "standard", false),
  c("Quiet Luxury Edit", "Quiet Luxury", ["premium", "minimal", "luxe"], "neutral", "premium", true),
];

export function conceptsFor(set: ConceptSetId, count: number, round: number): Concept[] {
  const base = CONCEPT_SETS[set];
  if (round <= 0) return base.slice(0, Math.min(count, base.length));
  // Rotate the base list and mix in extras so each round feels fresh.
  const rotated = [...base.slice(round % base.length), ...base.slice(0, round % base.length)];
  const extras = EXTRA_CONCEPTS.slice((round * 2) % EXTRA_CONCEPTS.length).concat(EXTRA_CONCEPTS.slice(0, (round * 2) % EXTRA_CONCEPTS.length));
  const mix = [rotated[0], extras[0], rotated[1], extras[1], rotated[2], rotated[3]];
  return mix.slice(0, Math.min(count, mix.length));
}
