import type { Appearance, AppearanceSuggestions, FaceShape, FashionCategory } from "@/types";
import { paletteFor, titleCase } from "./colour";

type Pair = { men: string[]; women: string[] };

const HAIR: Record<FaceShape, Pair> = {
  Oval: { men: ["Textured crop", "Side part", "Classic quiff"], women: ["Layered lob", "Soft waves", "Sleek straight"] },
  Round: { men: ["Textured quiff with tapered sides", "Pompadour", "Side-swept volume on top"], women: ["Long layers", "Side-swept fringe", "Waves below the chin"] },
  Square: { men: ["Textured crop", "Longer top with soft fade", "Side part"], women: ["Soft waves", "Side parting", "Wispy layers"] },
  Heart: { men: ["Side-swept fringe", "Medium-length textured cut", "Fuller sides"], women: ["Chin-length bob", "Side-swept bangs", "Layers at the jaw"] },
  Diamond: { men: ["Textured fringe", "Side part", "Fuller sides with a short top"], women: ["Side-swept bangs", "Chin-length bob with volume", "Soft face-framing layers"] },
  Oblong: { men: ["Fringe with fuller sides", "Short side-part", "Avoid extra height on top"], women: ["Curtain bangs", "Waves for width", "Chin-to-shoulder lengths"] },
};

const EYEWEAR: Record<FaceShape, string[]> = {
  Oval: ["Wayfarer", "Aviator", "Most frame shapes work"],
  Round: ["Rectangular frames", "Angular wayfarers", "Square-edged frames"],
  Square: ["Round frames", "Oval frames", "Thin metal aviators"],
  Heart: ["Light rimless frames", "Aviators", "Bottom-heavy or round frames"],
  Diamond: ["Oval frames", "Cat-eye", "Rimless"],
  Oblong: ["Oversized frames", "Wide, deep frames", "Wayfarers"],
};

const ACCESSORIES: Record<FaceShape, string[]> = {
  Oval: ["Most necklines and chain lengths suit you", "Studs or small hoops"],
  Round: ["Longer chains and V-necks add length", "Angular or drop earrings"],
  Square: ["Round pendants soften the jawline", "Curved, rounded accessories"],
  Heart: ["Medium-length chains", "Earrings that widen toward the bottom"],
  Diamond: ["Studs or short drops", "Simple chains that don't compete with cheekbones"],
  Oblong: ["Shorter chains and wider collars", "Wider hoops or button earrings"],
};

export function suggestionsFor(a: Appearance, category: FashionCategory): AppearanceSuggestions {
  const pal = paletteFor(a);
  const hair = HAIR[a.faceShape];
  const hairstyles = category === "men" ? hair.men : category === "women" ? hair.women : [...hair.men.slice(0, 2), ...hair.women.slice(0, 2)];
  return {
    hairstyles,
    clothingColours: pal.best.slice(0, 8).map(titleCase),
    avoidColours: pal.avoid.map(titleCase),
    eyewear: EYEWEAR[a.faceShape],
    accessories: ACCESSORIES[a.faceShape],
  };
}
