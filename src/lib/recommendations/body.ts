import type { BodyInfo } from "@/types";

export interface BodyProfile {
  bmi: number;
  frame: "lean" | "balanced" | "fuller";
  heightBand: "compact" | "average" | "tall";
  chestToWaist?: number;
  hipToWaist?: number;
  notes: string[];
}

export function analyseBody(b: BodyInfo): BodyProfile {
  const m = b.heightCm / 100;
  const bmi = Math.round((b.weightKg / (m * m)) * 10) / 10;
  const frame = bmi < 19 ? "lean" : bmi <= 25 ? "balanced" : "fuller";

  const [lo, hi] = b.category === "men" ? [168, 180] : b.category === "women" ? [157, 170] : [162, 175];
  const heightBand = b.heightCm < lo ? "compact" : b.heightCm > hi ? "tall" : "average";

  const chestToWaist = b.chestCm && b.waistCm ? Math.round((b.chestCm / b.waistCm) * 100) / 100 : undefined;
  const hipToWaist = b.hipCm && b.waistCm ? Math.round((b.hipCm / b.waistCm) * 100) / 100 : undefined;

  const notes: string[] = [];
  if (chestToWaist && chestToWaist >= 1.15) notes.push("a defined chest-to-waist difference");
  if (hipToWaist && hipToWaist >= 1.25) notes.push("a defined waist-to-hip difference");

  return { bmi, frame, heightBand, chestToWaist, hipToWaist, notes };
}

/** Neutral, non-body-changing language: we talk about balance and proportion, never about "fixing" a body. */
export function bodyReason(bp: BodyProfile, body: BodyInfo, opts: { monochrome: boolean; outer: boolean; fit?: string }): string {
  const parts: string[] = [];
  if (bp.heightBand === "tall") {
    parts.push(`At ${body.heightCm} cm you carry length well, so ${opts.outer ? "a layered top half" : "regular-length tops with a clean hem"} keeps the proportions visually even`);
  } else if (bp.heightBand === "compact") {
    parts.push(`At ${body.heightCm} cm, ${opts.monochrome ? "a tonal top-to-bottom palette" : "keeping the top and bottom in close tones"} and cleanly tapered bottoms keep a continuous line`);
  } else {
    parts.push(`At ${body.heightCm} cm you sit in a versatile height range, so structured and relaxed pieces both sit well`);
  }
  if (bp.frame === "lean") parts.push("textured fabrics and a layer add visual weight where you want it");
  else if (bp.frame === "fuller") parts.push("mid-weight fabrics with a clean drape and a straight or tapered leg keep the silhouette smooth and comfortable");
  else parts.push("a regular-to-tailored fit suits your balanced frame");
  if (bp.notes.length) parts.push(`your measurements show ${bp.notes.join(" and ")}, which the cut is chosen to respect`);
  if (opts.fit) parts.push(`it follows your ${opts.fit.toLowerCase()}-fit preference`);
  return parts.join("; ") + ".";
}
