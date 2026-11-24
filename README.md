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

## Connect real products (Flipkart, step by step)

1. Join the Flipkart Affiliate Program at affiliate.flipkart.com and get approved.
2. In the dashboard open the API section and click **Generate API Token** (one token per account; generating a new one disables the old).
3. Locally: `FLIPKART_AFFILIATE_ID=<tracking id> FLIPKART_AFFILIATE_TOKEN=<token> npm run sync:flipkart:list` prints the category names. Then run `npm run sync:flipkart` (optionally `FLIPKART_CATEGORIES=a,b,c`). It writes `data/products.json` with real products, prices, images and `dl.flipkart.com` product links (your tracking id is already in them).
4. Commit `data/products.json` and push. fitsy detects it automatically and switches off demo data.
5. Keep it fresh: in GitHub → Settings → Secrets → Actions add `FLIPKART_AFFILIATE_ID` and `FLIPKART_AFFILIATE_TOKEN`. `.github/workflows/sync-products.yml` then refreshes the file daily and Vercel redeploys.

Flipkart feed links expire after 10 hours and return 500 items per page, which is why products are synced to a file instead of fetched live. Check the sync log: items we can't classify (unknown slot or colour) are skipped, so look at the "By slot" counts. Myntra/Ajio don't run direct programs; they're available through networks such as Cuelinks, vCommission or Admitad. If a network gives you a product feed, convert it to the same JSON shape and merge it into `data/products.json`. Amazon's PA-API is being replaced by the Creators API and requires qualifying sales, so it's a poor first choice.

## Real outfit photos (inspiration)

Set one free key: `UNSPLASH_ACCESS_KEY` (unsplash.com/developers, recommended, demo limit 50 requests/hour, results cached 24h), `PIXABAY_API_KEY` (pixabay.com/api/docs) or `PEXELS_API_KEY` (new Pexels keys were paused in Nov 2026). Each outfit card then shows real photos matching its pieces, credited to the photographer with a link to the source. They are inspiration, not the exact products. Without a key the card shows product photos or plain colour tiles. Prices on sample products are shown as estimates ("≈"). Pinterest has no open image API and its terms don't allow copying pins, so fitsy doesn't pull Pinterest images.

## AI outfit preview (free, labelled)

Each card has an "AI preview" button that generates a picture of a person wearing that outfit's pieces. It is AI-generated, not a real photo, so patterns, logos and small details can differ from the real products, and the card says so. The prompt describes an invented person from the shopper's height and weight (build), face shape and skin tone, plus the outfit's pieces and men/women/unisex. It never includes the shopper's photo or any face data. Those few text details are sent to the image service (Cloudflare Workers AI, or Pollinations as the fallback). The generated face is made up and is not the shopper's. The shopper can choose a pose (standing, walking, hands in pockets, sitting, candid) and a background (auto-picked from the occasion, or a plain studio, street, cafe, nightclub, wedding hall and so on). The pose and background come from fixed lists on the server, never free text. It runs only when pressed to save the free quota; every new pose or background is a new picture and uses some of it. For better reliability add a free Cloudflare account and set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (a Workers AI API token); the free allowance is roughly 10,000 "neurons" a day, about 20 to 50 pictures. Without them the app uses the anonymous Pollinations endpoint, which is slower, limited to about one request every 15 seconds and may add a watermark.

## Curated looks (exact outfits, free)

`data/lookbook.json` holds hand-made looks. Each look lists the exact pieces (slot, name, colour, estimated price), so the item list is the look. They are shown first on the results page when the occasion, men/women choice and budget fit, labelled "curated". To make the photo match exactly, add a real photo that shows that outfit:

- `"unsplashId": "abc123XYZ"`: the last part of an Unsplash photo URL (unsplash.com/photos/...-abc123XYZ). Needs `UNSPLASH_ACCESS_KEY`. The photographer is credited automatically.
- or `"photoUrl"` with your own photo URL (https) plus `"credit"` and `"creditUrl"`. Only use photos you own or may use.

Each item can also have `"url"`: a real https product link (for Myntra/Ajio paste the affiliate deep link from your network). Items with a url show a direct "View on Myntra/Ajio" button; items without show the search buttons.

Without a photo the card searches for a similar one using `photoQuery`. Prices are your estimates and are shown with "≈". Items without a direct product link show "Search: Flipkart / Myntra / Ajio / Amazon" buttons that open that shop's search results for the piece (search pages, not product pages).

## Add Myntra, Ajio and Amazon

None of the three has a free public product API, so each needs an approved affiliate account. `npm run import:feed` takes a product feed and merges it into `data/products.json` (other merchants are kept; only that merchant's rows are replaced).

**Myntra and Ajio** (via an affiliate network such as Admitad, vCommission or Cuelinks):
1. Create a publisher account on the network and apply to the Myntra / Ajio program. Approval is by the network and brand.
2. Once approved, open the program's **product feed / data feed** (YML, XML or CSV) and copy its URL. Not every program offers one; ask the network's support.
3. Run `npm run import:feed -- --merchant Myntra --src "<feed url>"` (and the same for Ajio). If your CSV uses different column names, add `--map name=title,price=sale_price,url=link,image=img`.
4. Commit `data/products.json` and push.

**Shopify-based brand stores** (many Indian D2C brands): `npm run import:shopify -- --merchant "Brand" --store https://brand.com` reads the store's public `/products.json` (name, price, photo, stock, product link). Ask the brand first or join their affiliate program, and add its tracking query with `--aff "ref=yourid"` so links carry it. Not every store exposes this file.

**Amazon**: the old PA-API was retired on May 15, 2026 in favour of the Creators API, which requires an approved Associates account with qualifying sales. When you have access, export products to a CSV/JSON in the same shape and use the same `import:feed` command with `--merchant Amazon`. A live Amazon adapter is not included.

Links are only kept if they are https product or tracking links, and items we can't place into a slot or colour are skipped (see the printed counts).

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

## Build around my clothes

Open **My clothes** in the menu (`/build-around`). The shopper uploads a photo of one piece they own, picks what it is (baggy pants, shirt, sneakers…) and confirms its colour (read from the photo in the browser). fitsy builds six outfits around it. Each one says which occasions it is best for.

- The photo stays in the browser. Only the clothing type and colour are sent to `/api/build-around`.
- The owned piece is locked into every look at ₹0. Every other piece is chosen to go with it, within the budget (or clearly flagged over budget).
- Looks come from the same concept sets as the main stylist, ranked by how well they suit the piece (`buildAround` in `src/lib/recommendations/engine.ts`).
- Clothing types and the occasions each suits are listed in `src/lib/recommendations/anchor.ts`. Add a type there to offer it in the picker.
- The AI preview uses the same invented-face Cloudflare flow as the main outfits. It draws a similar piece (same type and colour), not the exact one in the photo, and the uploaded photo is shown next to it as "Yours".
