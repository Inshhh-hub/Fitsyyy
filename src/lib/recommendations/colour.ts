import type { Appearance } from "@/types";

export const COLOUR_HEX: Record<string, string> = {
  black: "#1f1f1f", white: "#f3f0e8", navy: "#1f2a44", grey: "#8c8c8c", charcoal: "#3a3a3a",
  beige: "#d9c9a9", olive: "#6b7050", sage: "#9aa88a", maroon: "#6d1f2b", burgundy: "#5d1a33",
  mustard: "#c8962b", rust: "#a4512f", teal: "#2f6f6f", cream: "#efe6d2", ivory: "#f4eddc",
  brown: "#6b4a32", tan: "#b08a60", blue: "#3b6aa0", lightblue: "#a9c4e0", pink: "#d9a3a8",
  red: "#b3262e", emerald: "#1f6b52", gold: "#c9a24a", silver: "#b8b8bc", denim: "#4a6a94",
  khaki: "#b5a67a", lavender: "#b7a9d3", peach: "#e8b496", camel: "#b98f5a",
};

export function hexFor(colour: string): string {
  return COLOUR_HEX[colour.toLowerCase()] ?? "#8c8c8c";
}

/** Colours that go with almost everything. */
export const NEUTRALS = new Set(["black", "white", "grey", "charcoal", "navy", "beige", "cream", "ivory", "denim"]);
/** Neutral-ish for pairing purposes (leather tones and metals don't count as a "second colour"). */
export const PAIR_SAFE = new Set([...NEUTRALS, "brown", "tan", "camel", "khaki", "gold", "silver"]);

export type Bias = "neutral" | "dark" | "earth" | "bright" | "light" | "any";
export const BIAS_COLOURS: Record<Exclude<Bias, "any">, string[]> = {
  neutral: ["black", "white", "grey", "charcoal", "navy", "beige", "cream", "ivory"],
  dark: ["black", "charcoal", "navy", "burgundy", "maroon", "emerald"],
  earth: ["olive", "beige", "khaki", "tan", "brown", "rust", "camel", "cream", "sage"],
  bright: ["mustard", "teal", "red", "emerald", "pink", "blue", "burgundy", "gold"],
  light: ["white", "cream", "ivory", "beige", "lightblue", "sage", "pink", "lavender"],
};

const UNDERTONE_BEST: Record<string, string[]> = {
  Warm: ["olive", "mustard", "rust", "maroon", "cream", "camel", "brown", "emerald", "teal", "peach", "khaki", "gold"],
  Cool: ["navy", "blue", "lavender", "emerald", "burgundy", "pink", "silver", "grey", "white", "lightblue", "charcoal"],
  Neutral: ["navy", "olive", "teal", "burgundy", "sage", "cream", "charcoal", "blue", "maroon", "emerald", "white"],
  Uncertain: ["navy", "olive", "teal", "burgundy", "sage", "cream", "charcoal", "blue", "white", "black"],
};
const UNDERTONE_AVOID: Record<string, string[]> = {
  Warm: ["lavender", "silver"],
  Cool: ["mustard", "rust", "khaki"],
  Neutral: [],
  Uncertain: [],
};
const SKIN_ADD: Record<string, { add: string[]; avoid: string[] }> = {
  Fair: { add: ["lightblue", "sage", "pink", "navy"], avoid: ["beige"] }, // beige can sit too close to very fair skin
  Light: { add: ["lightblue", "sage", "burgundy"], avoid: [] },
  Medium: { add: ["olive", "teal", "maroon"], avoid: [] },
  Olive: { add: ["maroon", "mustard", "cream", "burgundy"], avoid: ["khaki"] },
  Tan: { add: ["white", "cream", "teal", "emerald", "mustard"], avoid: [] },
  Deep: { add: ["white", "mustard", "emerald", "red", "blue", "gold", "pink"], avoid: ["brown"] }, // low contrast
};

export interface Palette {
  best: string[];
  avoid: string[];
}

export function paletteFor(a: Pick<Appearance, "skinTone" | "undertone">): Palette {
  const base = UNDERTONE_BEST[a.undertone] ?? UNDERTONE_BEST.Uncertain;
  const skin = SKIN_ADD[a.skinTone] ?? { add: [], avoid: [] };
  const avoid = new Set([...(UNDERTONE_AVOID[a.undertone] ?? []), ...skin.avoid]);
  const best = [...new Set([...skin.add, ...base])].filter((c) => !avoid.has(c));
  return { best, avoid: [...avoid] };
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Parse "navy, olive and black" style free text into known colour names. */
export function parseColours(text: string | undefined): string[] {
  if (!text) return [];
  const t = text.toLowerCase();
  const out: string[] = [];
  for (const name of Object.keys(COLOUR_HEX)) if (new RegExp(`\\b${name}\\b`).test(t)) out.push(name);
  if (/\bblue\b/.test(t) && !out.includes("blue")) out.push("blue");
  if (/\bgreen\b/.test(t)) out.push("olive", "sage", "emerald");
  if (/\byellow\b/.test(t)) out.push("mustard");
  if (/\borange\b/.test(t)) out.push("rust");
  if (/\bpurple\b/.test(t)) out.push("lavender");
  if (/\bgolden\b/.test(t)) out.push("gold");
  return [...new Set(out)];
}
