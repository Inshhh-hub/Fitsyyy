# fitsy — AI-powered personal fashion stylist (India)

<img src="public/brand/fitsy-logo.svg" alt="fitsy" width="320" />

> Your Style. Your Identity. Perfectly Matched.

Next.js (App Router) · React · TypeScript · Tailwind · Framer Motion · Lucide · Supabase · OpenAI · MediaPipe Face Landmarker.

Users enter budget first, then body details, then a selfie (analysed **on-device**) or manual appearance, then one or more occasions. fitsy returns 6+ distinct, budget-checked outfits with reasons, grooming tips, swap-an-item, compare, favourites and wishlist.

## Honest status

- **Works with zero credentials (demo mode):** the built-in rule-based stylist runs over a **sample catalogue**. Sample items are labelled "Sample data" and have **no product links, images or stock info** — we never fabricate URLs.
- **Real products need a real source.** Plug in an authorised feed (see [Product providers](#product-providers)). Until then, "Shop this outfit" explains that no live links exist.
- **Face shape / skin tone are heuristics** from MediaPipe landmarks and sampled pixel colour. Thresholds are in `src/lib/vision/faceAnalysis.ts` (`SHAPE_THRESHOLDS`) and should be tuned on real faces. The user can always correct results.
- This repo was generated without being able to run `npm install` / `npm run build` in the authoring environment. The recommendation engine was executed and tested; **run `npm install && npm run build` once locally and fix any type nits before deploying.**
- Not implemented: optional full-body photo analysis, storing photos (the private `user-photos` bucket and policies exist for a future opt-in), distributed rate limiting (in-memory only).

## Quick start

```bash
npm install
cp .env.example .env.local   # all keys optional
npm run dev                  # http://localhost:3000
npm run build                # production build
```

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | server | Enables the AI stylist. Without it the rule engine is used. |
| `OPENAI_MODEL` | server | Default `gpt-4o-mini` (must support JSON output). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Optional accounts + sync. Guests work without them. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Reserved for admin jobs. **Never** `NEXT_PUBLIC_`. Not used by the client code. |
| `PRODUCT_FEED_URL`, `PRODUCT_FEED_TOKEN` | server | Optional live product feed. |
| `NEXT_PUBLIC_MEDIAPIPE_WASM_URL`, `NEXT_PUBLIC_MEDIAPIPE_MODEL_URL` | client | Optional self-hosted MediaPipe assets (defaults to jsDelivr + Google storage CDN). |

## Database (Supabase)

1. Create a project at supabase.com.
2. SQL editor → run `supabase/migrations/0001_init.sql` (or `supabase db push`).
3. Authentication → Providers: enable **Email** (magic links). Add your site URL and `http://localhost:3000` to redirect URLs.
4. Copy Project URL + anon key into env vars.

Tables: `style_profiles`, `saved_outfits`, `wishlist_items`, `recommendation_history` — all with Row Level Security (users only access their own rows). Photos are never stored.

## How it works

```
/onboarding  budget → height/weight/category → optional measurements
/appearance  consent → camera/upload → MediaPipe (browser) → confirm/edit → suggestions
/occasions   12 occasions (multi-select, "Others" free text) + preferences
POST /api/generate-outfits → product pool (providers) → AI or rule engine → validate → JSON
/recommendations  sort, filter, expand, replace item, compare, save, shop, more ideas
/profile     edit, saved outfits, wishlist, history, sign-in, delete all data
```

**Face analysis (on-device).** `@mediapipe/tasks-vision` Face Landmarker returns 478 landmarks. Face shape comes from length/cheekbone/jaw/forehead ratios; skin depth and undertone from Lab colour of small cheek/forehead patches; lighting and head-turn warnings are shown. The image never leaves the browser and is dropped when you continue. Nothing about ethnicity, race or identity is inferred.

**Stylist.** For each occasion a set of 6 distinct styling concepts is chosen (e.g. wedding: Classic Ethnic, Indo-Western, Minimal Luxury, Contemporary Formal, Traditional Statement, Budget-Friendly). With `OPENAI_API_KEY`, the model composes outfits **only from real candidate products by id**. The server then validates the JSON against a Zod schema, rejects unknown ids / duplicate slots / missing essentials / over-budget sets (replacing them with rule-engine outfits), and **recomputes every price and total from product data** — the model's numbers are never trusted.

**Budget.** Essentials (top, bottom, footwear) are funded first, then an outer layer and accessories. If no complete outfit fits, the cheapest complete set is shown clearly flagged **Over budget**; "stretch" and premium swap options are always labelled with how far over budget they go. Replacing an item recalculates the total and remaining budget instantly. Budget can be changed on the results page.

### AI / API response shape

`POST /api/generate-outfits` body: `{ body, appearance, preferences, round, excludeProductIds }`. The model is asked for the spec's structure, keyed by catalogue id:

```json
{ "occasion": "Casual Outing", "currency": "INR",
  "recommendations": [{ "name": "…", "style": "…", "occasion": "…", "suitability_score": 95,
    "reason": "…", "reasons": { "body": "…", "colour": "…", "occasion": "…", "balance": "…", "budget": "…" },
    "item_ids": ["…"], "grooming": { "hairstyle": "…", "tips": ["…"], "fragrance": "…" } }] }
```

The API returns normalised outfits (`items[]` with `name`, `price`, `brand`, `productUrl`, `imageUrl`, plus `total`, `withinBudget`). Other routes: `GET /api/products?slot=&gender=&group=` (alternatives for Replace). Face analysis has no API route — it is client-side.

## Product providers

`src/lib/product-providers/` — implement `ProductProvider` (`search(query) → Product[]`) and add it to `LIVE_PROVIDERS` in `index.ts`. Rules: only set `productUrl` to a genuine product page from an authorised source; never invent price/stock.

**Included:** `feed.ts` reads `PRODUCT_FEED_URL` returning an array or `{ "products": [...] }`:

```json
{ "id": "myntra-123", "name": "Slim Fit Chinos", "brand": "…", "merchant": "Myntra",
  "slot": "lower", "subtype": "Chinos", "price": 1499, "colour": "olive", "gender": "men",
  "groups": ["casual"], "tags": ["smartcasual","earth"], "tier": "mid",
  "productUrl": "https://…", "imageUrl": "https://…", "sizes": ["30","32"], "inStock": true }
```

Items without an `https` product URL are dropped. `slot` ∈ upper, outer, lower, footwear, watch, belt, eyewear, bag, bracelet, chain, cap, wallet; `groups` ∈ casual, formal, party, ethnic, sport. Add the image host to `next.config.mjs` only if you switch to `next/image` (the app uses plain `<img>` today). Use affiliate programmes / merchant feeds that permit this use (Myntra, Ajio, Amazon India, Flipkart, etc. each have their own terms); don't scrape.

## Self-hosting MediaPipe (optional)

By default WASM loads from jsDelivr and the model from Google storage. To self-host: copy `node_modules/@mediapipe/tasks-vision/wasm` to `public/mediapipe/wasm`, download `face_landmarker.task` to `public/mediapipe/`, and set `NEXT_PUBLIC_MEDIAPIPE_WASM_URL=/mediapipe/wasm` and `NEXT_PUBLIC_MEDIAPIPE_MODEL_URL=/mediapipe/face_landmarker.task`.

## Security notes

Zod validation on every API input; text sanitisation; secrets only read server-side; RLS on all tables; security headers (`next.config.mjs`); camera only started by an explicit click and stopped on capture/cancel/unmount; in-memory rate limiting (`src/lib/rate-limit.ts` — swap for Upstash/Vercel KV for strict limits on serverless).

## GitHub

```bash
cd fitsy
git init -b main
git add .
git commit -m "Initial commit: fitsy"
git remote add origin https://github.com/<you>/fitsy.git
git push -u origin main
```

## Deploy to Vercel

1. Push to GitHub (above).
2. vercel.com → **Add New… → Project** → import the repo. Framework preset: Next.js (auto). Build command `npm run build`.
3. **Settings → Environment Variables**: add the variables above (at least none are required for demo mode).
4. Deploy. `/api/generate-outfits` sets `maxDuration = 60` (needs a plan that allows it; otherwise lower it or reduce occasions).
5. In Supabase → Auth → URL Configuration add your Vercel domain as Site URL / redirect.

## Project layout

```
src/app/            pages + api/{generate-outfits,products}
src/components/     ui, onboarding, camera, outfit-cards, product-cards, budget, navigation
src/lib/            ai, database, product-providers, recommendations, validations, vision
src/hooks/          useStyle (state + localStorage + Supabase sync)
supabase/migrations 0001_init.sql
```
