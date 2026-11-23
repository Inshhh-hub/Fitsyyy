export type FashionCategory = "men" | "women" | "unisex";
export type FaceShape = "Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Oblong";
export type SkinTone = "Fair" | "Light" | "Medium" | "Olive" | "Tan" | "Deep";
export type Undertone = "Warm" | "Cool" | "Neutral" | "Uncertain";
export type Fit = "Slim" | "Regular" | "Relaxed" | "Oversized";

export const FACE_SHAPES: FaceShape[] = ["Oval", "Round", "Square", "Heart", "Diamond", "Oblong"];
export const SKIN_TONES: SkinTone[] = ["Fair", "Light", "Medium", "Olive", "Tan", "Deep"];
export const UNDERTONES: Undertone[] = ["Warm", "Cool", "Neutral", "Uncertain"];
export const FITS: Fit[] = ["Slim", "Regular", "Relaxed", "Oversized"];

export interface BodyInfo {
  heightCm: number;
  weightKg: number;
  budget: number; // INR, total for the complete outfit
  category: FashionCategory;
  shoulderCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
}

export interface Appearance {
  faceShape: FaceShape;
  skinTone: SkinTone;
  undertone: Undertone;
  source: "ai" | "manual";
  confidence?: number; // 0..1, AI only
  proportionNotes?: string[]; // optional, from full-body photo
}

export interface AppearanceSuggestions {
  hairstyles: string[];
  clothingColours: string[];
  avoidColours: string[];
  eyewear: string[];
  accessories: string[];
}

export interface Preferences {
  occasions: string[]; // occasion ids
  customOccasion?: string;
  style?: string;
  likedColours?: string;
  dislikedColours?: string;
  fit?: Fit;
  restrictions?: string;
}

export type Slot =
  | "upper"
  | "outer"
  | "lower"
  | "footwear"
  | "watch"
  | "belt"
  | "eyewear"
  | "bag"
  | "bracelet"
  | "chain"
  | "cap"
  | "wallet";

export type Tier = "budget" | "mid" | "premium";

export interface Product {
  id: string;
  name: string;
  brand: string;
  merchant: string;
  slot: Slot;
  subtype: string;
  price: number;
  colour: string; // colour family name, e.g. "navy"
  hex: string; // used for the preview illustration
  gender: FashionCategory;
  groups: string[]; // occasion groups this suits
  tags: string[];
  tier: Tier;
  productUrl?: string; // ONLY ever a genuine URL from an authorised source
  imageUrl?: string;
  sizes?: string[];
  inStock?: boolean;
  isSample: boolean; // true = demo data, not a real listing
}

export interface OutfitReasons {
  body: string;
  colour: string;
  occasion: string;
  balance: string;
  budget: string;
}

export interface Grooming {
  hairstyle: string;
  tips: string[];
  fragrance: string;
}

export interface Outfit {
  id: string;
  name: string;
  style: string;
  occasionId: string;
  occasionLabel: string;
  suitabilityScore: number;
  scores: { occasion: number; colour: number; premium: number };
  reason: string; // short summary
  reasons: OutfitReasons;
  items: Product[];
  grooming: Grooming;
  total: number;
  withinBudget: boolean;
  budget: number;
  warning?: string;
}

export interface GenerateResponse {
  currency: "INR";
  engine: "ai" | "rules";
  demoData: boolean; // product catalogue is sample data
  occasions: string[];
  recommendations: Outfit[];
  suggestions: AppearanceSuggestions;
  notices: string[];
}

export interface StyleProfile {
  body?: BodyInfo;
  appearance?: Appearance;
  preferences?: Preferences;
}
