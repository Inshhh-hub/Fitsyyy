import { z } from "zod";
import { FACE_SHAPES, FITS, SKIN_TONES, UNDERTONES } from "@/types";

const optionalCm = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || Number.isNaN(v) ? undefined : v),
    z.number().min(min).max(max).optional(),
  );

export const bodyInfoSchema = z.object({
  heightCm: z.number({ invalid_type_error: "Enter your height in cm" }).min(120, "Height must be 120–230 cm").max(230, "Height must be 120–230 cm"),
  weightKg: z.number({ invalid_type_error: "Enter your weight in kg" }).min(30, "Weight must be 30–250 kg").max(250, "Weight must be 30–250 kg"),
  budget: z.number({ invalid_type_error: "Enter your budget" }).min(500, "Minimum budget is ₹500").max(1_000_000, "Budget is too large"),
  category: z.enum(["men", "women", "unisex"]),
  shoulderCm: optionalCm(25, 80),
  chestCm: optionalCm(50, 170),
  waistCm: optionalCm(40, 170),
  hipCm: optionalCm(50, 180),
});

export const appearanceSchema = z.object({
  faceShape: z.enum(FACE_SHAPES as [string, ...string[]]),
  skinTone: z.enum(SKIN_TONES as [string, ...string[]]),
  undertone: z.enum(UNDERTONES as [string, ...string[]]),
  source: z.enum(["ai", "manual"]),
  confidence: z.number().min(0).max(1).optional(),
  proportionNotes: z.array(z.string().max(160)).max(4).optional(),
});

export const preferencesSchema = z.object({
  occasions: z.array(z.string().max(40)).min(1, "Pick at least one occasion").max(4, "Pick up to 4 occasions"),
  customOccasion: z.string().max(80).optional(),
  style: z.string().max(80).optional(),
  likedColours: z.string().max(120).optional(),
  dislikedColours: z.string().max(120).optional(),
  fit: z.enum(FITS as [string, ...string[]]).optional(),
  restrictions: z.string().max(200).optional(),
});

export const generateRequestSchema = z.object({
  body: bodyInfoSchema,
  appearance: appearanceSchema,
  preferences: preferencesSchema,
  round: z.number().int().min(0).max(20).default(0),
  excludeProductIds: z.array(z.string().max(80)).max(300).default([]),
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/** AI stylist output. Mirrors the spec's JSON shape; items are referenced by catalogue product id. */
export const aiOutfitSchema = z.object({
  name: z.string().min(2).max(60),
  style: z.string().min(2).max(40),
  occasion: z.string().min(2).max(60),
  suitability_score: z.number().min(0).max(100),
  reason: z.string().min(10).max(400),
  reasons: z.object({
    body: z.string().min(5).max(400),
    colour: z.string().min(5).max(400),
    occasion: z.string().min(5).max(400),
    balance: z.string().min(5).max(400),
    budget: z.string().min(5).max(400),
  }),
  item_ids: z.array(z.string().max(80)).min(3).max(10),
  grooming: z.object({
    hairstyle: z.string().max(160),
    tips: z.array(z.string().max(160)).max(4),
    fragrance: z.string().max(120),
  }),
});

export const aiResponseSchema = z.object({
  occasion: z.string(),
  currency: z.literal("INR"),
  recommendations: z.array(aiOutfitSchema).min(1).max(14),
});
export type AiResponse = z.infer<typeof aiResponseSchema>;

export const productQuerySchema = z.object({
  slot: z.string().max(20),
  gender: z.enum(["men", "women", "unisex"]).default("unisex"),
  group: z.string().max(30).optional(),
  maxPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  q: z.string().max(60).optional(),
  exclude: z.string().max(400).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});
