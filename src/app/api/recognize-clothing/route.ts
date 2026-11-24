import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { parseRecognition } from "@/lib/recommendations/recognise";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const bodySchema = z.object({
  image: z.string().max(450_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Send a JPG, PNG or WebP photo."),
  category: z.enum(["men", "women", "unisex"]),
});

const PROMPT = [
  "Look at the single clothing item (or shoes) in this photo. Ignore any person, background or hands.",
  "Reply with exactly these three lines and nothing else:",
  "ITEM: <what it is, for example: baggy jeans, white sneakers, oversized graphic t-shirt, pleated trousers, resort shirt, denim jacket, kurta>",
  "COLOUR: <its main colour in one or two words>",
  "FIT: <one of: baggy, relaxed, regular, slim, oversized>",
].join("\n");

async function run(url: string, token: string, payload: unknown): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });
  let json: Record<string, unknown> = {};
  try { json = (await res.json()) as Record<string, unknown>; } catch { /* non-JSON error body */ }
  return { ok: res.ok, status: res.status, json };
}

function replyText(json: Record<string, unknown>): string {
  const r = json.result as unknown;
  if (typeof r === "string") return r;
  if (r && typeof r === "object") {
    const o = r as { response?: unknown; description?: unknown };
    if (typeof o.response === "string") return o.response;
    if (typeof o.description === "string") return o.description;
  }
  return "";
}

/**
 * POST /api/recognize-clothing
 * Sends ONE small photo to Cloudflare Workers AI (free daily allowance), which describes the garment.
 * We turn that description into one of our clothing types and a colour. The photo is not stored or logged.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`recog:${clientIp(req)}`, 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Too many photos. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });

  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });

  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!acct || !token) return NextResponse.json({ error: "Automatic recognition isn't switched on yet. Pick the type yourself." }, { status: 503 });

  const url = `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${MODEL}`;
  const payload = { messages: [{ role: "user", content: PROMPT }], image: parsed.data.image, max_tokens: 90, temperature: 0.1 };

  try {
    let r = await run(url, token, payload);
    // First use of this model needs a one-time licence acceptance. Do it automatically, then retry once.
    if (!r.ok && /agree|licen[sc]e/i.test(JSON.stringify(r.json))) {
      await run(url, token, { prompt: "agree" });
      r = await run(url, token, payload);
    }
    if (!r.ok) {
      console.error("[recognize-clothing] model error", r.status, JSON.stringify(r.json).slice(0, 300));
      return NextResponse.json({ error: "The free AI couldn't look at that photo right now. Pick the type yourself." }, { status: 502 });
    }
    const text = replyText(r.json);
    if (!text.trim()) return NextResponse.json({ error: "The AI didn't recognise anything. Pick the type yourself." }, { status: 502 });
    const rec = parseRecognition(text, parsed.data.category);
    return NextResponse.json(rec);
  } catch {
    return NextResponse.json({ error: "The free AI didn't respond in time. Pick the type yourself." }, { status: 504 });
  }
}
