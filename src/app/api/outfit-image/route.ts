import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validations/sanitize";

export const runtime = "nodejs";
export const maxDuration = 60;

const POSES: Record<string, string> = {
  standing: "standing relaxed, facing the camera",
  walking: "mid-stride walking toward the camera, natural movement",
  pockets: "standing casually with hands in pockets, slight lean",
  sitting: "sitting down relaxed, full outfit still visible",
  candid: "candid pose looking away from the camera, laughing naturally",
};

const SCENES: Record<string, string> = {
  studio: "plain neutral studio background",
  street: "a city street in daylight, soft blurred background",
  cafe: "a cosy cafe with warm light, blurred background",
  nightclub: "a nightclub with neon and coloured lights, blurred background",
  party: "a lively party venue with string lights, blurred background",
  wedding: "an elegant decorated wedding hall with flowers and warm lights, blurred background",
  office: "a modern office with glass walls, blurred background",
  gym: "a bright modern gym, blurred background",
  home: "a warm living room at home, blurred background",
  campus: "a green university campus, blurred background",
  festive: "a festive courtyard decorated with marigold flowers and diyas, blurred background",
  evening: "a city terrace at golden hour with soft lights, blurred background",
};

/** Picks a background that suits the occasion when the shopper leaves it on "auto". */
const SCENE_FOR_OCCASION: Record<string, string> = {
  clubbing: "nightclub", birthday: "party", wedding: "wedding", casual: "street", interview: "office", office: "office",
  gym: "gym", family: "home", date: "evening", college: "campus", festival: "festive",
};

const bodySchema = z.object({
  pose: z.enum(["standing", "walking", "pockets", "sitting", "candid"]).default("standing"),
  scene: z.enum(["auto", "studio", "street", "cafe", "nightclub", "party", "wedding", "office", "gym", "home", "campus", "festive", "evening"]).default("auto"),
  occasion: z.string().max(30).optional(),
  gender: z.enum(["men", "women", "unisex"]),
  items: z
    .array(z.object({ slot: z.string().max(20), colour: z.string().max(20), name: z.string().max(80) }))
    .min(2)
    .max(8),
  /** shopper details used only to describe an invented model: no photo, no real face */
  model: z
    .object({
      heightCm: z.number().min(120).max(230),
      weightKg: z.number().min(30).max(200),
      faceShape: z.enum(["Oval", "Round", "Square", "Heart", "Diamond", "Oblong"]).optional(),
      skinTone: z.enum(["Fair", "Light", "Medium", "Olive", "Tan", "Deep"]).optional(),
      undertone: z.enum(["Warm", "Cool", "Neutral", "Uncertain"]).optional(),
    })
    .optional(),
});

type ModelInfo = NonNullable<z.infer<typeof bodySchema>["model"]>;

const SKIN: Record<string, string> = {
  Fair: "fair skin", Light: "light skin", Medium: "medium brown skin", Olive: "olive skin", Tan: "tan brown skin", Deep: "deep dark brown skin",
};

/** Describes an invented person who matches the shopper's proportions, face shape and skin tone. */
function describeModel(gender: "men" | "women" | "unisex", m?: ModelInfo): string {
  const who = gender === "women" ? "woman" : gender === "men" ? "man" : "person";
  if (!m) return `young Indian ${who}`;
  const bmi = m.weightKg / Math.pow(m.heightCm / 100, 2);
  const build = bmi < 19 ? "slim lean build" : bmi <= 25 ? "average athletic build" : bmi <= 30 ? "broad sturdy build" : "heavier, fuller build";
  const [lo, hi] = gender === "men" ? [168, 180] : gender === "women" ? [157, 170] : [162, 175];
  const height = m.heightCm < lo ? "shorter than average" : m.heightCm > hi ? "tall" : "average height";
  const parts = [`young Indian ${who}`, build, height];
  if (m.skinTone) parts.push(SKIN[m.skinTone]);
  if (m.undertone && m.undertone !== "Uncertain") parts.push(`${m.undertone.toLowerCase()} undertone`);
  if (m.faceShape) parts.push(`${m.faceShape.toLowerCase()} face shape`);
  return `fictional ${parts.join(", ")}`;
}

const cache = new Map<string, { at: number; image: string }>();
const TTL = 24 * 60 * 60 * 1000;

/** The prompt is built here from item data only (never a photo or face of the user), so callers can't use this endpoint to make arbitrary images. */
function buildPrompt(gender: "men" | "women" | "unisex", items: Array<{ slot: string; colour: string; name: string }>, model: ModelInfo | undefined, pose: string, scene: string, occasion?: string): string {
  const who = describeModel(gender, model);
  const sceneKey = scene === "auto" ? SCENE_FOR_OCCASION[occasion ?? ""] ?? "street" : scene;
  const sceneText = SCENES[sceneKey] ?? SCENES.street;
  const order = ["upper", "outer", "lower", "footwear"];
  const sorted = [...items].sort((a, b) => (order.indexOf(a.slot) + 1 || 9) - (order.indexOf(b.slot) + 1 || 9));
  const pieces = sorted.map((i) => `${sanitizeText(i.colour, 20)} ${sanitizeText(i.name, 60)}`.toLowerCase()).join(", ");
  return `Full-body fashion photograph of a ${who}, ${POSES[pose] ?? POSES.standing}, an invented person who is not a real individual, wearing exactly: ${pieces}. Setting: ${sceneText}. Street style photography, sharp focus, realistic clothing details, no text, no logos.`;
}

async function viaCloudflare(prompt: string, accountId: string, token: string): Promise<string | null> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt.slice(0, 1800), steps: 6 }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: { image?: string } };
  return data.result?.image ? `data:image/jpeg;base64,${data.result.image}` : null;
}

/** Free anonymous endpoint. Slower, rate limited, and may add a watermark. */
async function viaPollinations(prompt: string): Promise<string | null> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&model=flux&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(55_000) });
  if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 4_000_000) return null;
  return `data:${res.headers.get("content-type")};base64,${buf.toString("base64")}`;
}

/** POST /api/outfit-image — AI-generated preview of a person wearing the outfit's pieces (clearly labelled in the UI). */
export async function POST(req: Request) {
  const rl = rateLimit(`oimg:${clientIp(req)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many previews. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const prompt = buildPrompt(parsed.data.gender, parsed.data.items, parsed.data.model, parsed.data.pose, parsed.data.scene, parsed.data.occasion);
  const hit = cache.get(prompt);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ image: hit.image, cached: true });

  try {
    const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    let image = acct && token ? await viaCloudflare(prompt, acct, token) : null;
    if (!image) image = await viaPollinations(prompt);
    if (!image) return NextResponse.json({ error: "The free image service is busy or out of quota. Try again in a minute." }, { status: 503 });
    if (cache.size > 40) cache.clear();
    cache.set(prompt, { at: Date.now(), image });
    return NextResponse.json({ image });
  } catch {
    return NextResponse.json({ error: "The free image service didn't respond. Try again in a minute." }, { status: 503 });
  }
}
