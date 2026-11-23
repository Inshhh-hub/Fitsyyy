import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validations/sanitize";

export const runtime = "nodejs";

interface Photo { id: string; src: string; alt: string; photographer: string; photographerUrl: string; pageUrl: string; source: string }
const cache = new Map<string, { at: number; photos: Photo[] }>();
const TTL = 24 * 60 * 60 * 1000; // Pixabay requires 24h caching; it also keeps us inside Unsplash's 50 requests/hour demo limit.
const UTM = "utm_source=fitsy&utm_medium=referral";

type Fetcher = (q: string) => Promise<Photo[]>;

const unsplash = (key: string): Fetcher => async (q) => {
  const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=6&orientation=portrait`, {
    headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const d = (await res.json()) as { results?: Array<{ id: string; alt_description?: string | null; urls: { regular: string; small: string }; links: { html: string }; user: { name: string; links: { html: string } } }> };
  return (d.results ?? []).map((p) => ({
    id: p.id, src: p.urls.regular || p.urls.small, alt: p.alt_description || q, photographer: p.user.name,
    photographerUrl: `${p.user.links.html}?${UTM}`, pageUrl: `${p.links.html}?${UTM}`, source: "Unsplash",
  }));
};

const pexels = (key: string): Fetcher => async (q) => {
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=6&orientation=portrait`, {
    headers: { Authorization: key }, signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const d = (await res.json()) as { photos?: Array<{ id: number; alt?: string; url: string; photographer: string; photographer_url: string; src: { large: string; medium: string } }> };
  return (d.photos ?? []).map((p) => ({
    id: String(p.id), src: p.src.large || p.src.medium, alt: p.alt || q, photographer: p.photographer, photographerUrl: p.photographer_url, pageUrl: p.url, source: "Pexels",
  }));
};

const pixabay = (key: string): Fetcher => async (q) => {
  const res = await fetch(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q.slice(0, 100))}&image_type=photo&orientation=vertical&safesearch=true&per_page=6`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const d = (await res.json()) as { hits?: Array<{ id: number; tags?: string; webformatURL: string; largeImageURL: string; user: string; user_id: number; pageURL: string }> };
  return (d.hits ?? []).map((p) => ({
    id: String(p.id), src: p.largeImageURL || p.webformatURL, alt: p.tags || q, photographer: p.user,
    photographerUrl: `https://pixabay.com/users/${encodeURIComponent(p.user)}-${p.user_id}/`, pageUrl: p.pageURL, source: "Pixabay",
  }));
};

/** First configured provider wins: Unsplash (best fashion photos) → Pexels → Pixabay. */
function provider(): Fetcher | null {
  if (process.env.UNSPLASH_ACCESS_KEY) return unsplash(process.env.UNSPLASH_ACCESS_KEY);
  if (process.env.PEXELS_API_KEY) return pexels(process.env.PEXELS_API_KEY);
  if (process.env.PIXABAY_API_KEY) return pixabay(process.env.PIXABAY_API_KEY);
  return null;
}

/**
 * GET /api/inspiration?q=man wearing navy shirt beige trousers white sneakers outfit
 * Real outfit photos from a free stock-photo API, shown as inspiration only with photographer credit and
 * a link to the source. With no key configured it returns { photos: [] } and the UI falls back to product images.
 */
export async function GET(req: Request) {
  const fetcher = provider();
  if (!fetcher) return NextResponse.json({ photos: [], configured: false });

  const rl = rateLimit(`insp:${clientIp(req)}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const sp = new URL(req.url).searchParams;
  const photoId = sp.get("photo");
  if (photoId) {
    const ukey = process.env.UNSPLASH_ACCESS_KEY;
    if (!ukey || !/^[A-Za-z0-9_-]{6,20}$/.test(photoId)) return NextResponse.json({ photos: [] });
    const ck = `id:${photoId}`;
    const got = cache.get(ck);
    if (got && Date.now() - got.at < TTL) return NextResponse.json({ photos: got.photos });
    try {
      const r = await fetch(`https://api.unsplash.com/photos/${photoId}`, { headers: { Authorization: `Client-ID ${ukey}`, "Accept-Version": "v1" }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) return NextResponse.json({ photos: [] });
      const p = (await r.json()) as { id: string; alt_description?: string | null; urls: { regular: string }; links: { html: string }; user: { name: string; links: { html: string } } };
      const photos: Photo[] = [{ id: p.id, src: p.urls.regular, alt: p.alt_description || "Outfit photo", photographer: p.user.name, photographerUrl: `${p.user.links.html}?${UTM}`, pageUrl: `${p.links.html}?${UTM}`, source: "Unsplash" }];
      cache.set(ck, { at: Date.now(), photos });
      return NextResponse.json({ photos });
    } catch { return NextResponse.json({ photos: [] }); }
  }
  const q = sanitizeText(sp.get("q") ?? "", 80);
  if (q.length < 3) return NextResponse.json({ error: "Invalid query." }, { status: 400 });

  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ photos: hit.photos, configured: true });

  try {
    const photos = await fetcher(q);
    if (photos.length) {
      if (cache.size > 300) cache.clear();
      cache.set(q, { at: Date.now(), photos });
    }
    return NextResponse.json({ photos, configured: true });
  } catch {
    return NextResponse.json({ photos: [], configured: true });
  }
}
