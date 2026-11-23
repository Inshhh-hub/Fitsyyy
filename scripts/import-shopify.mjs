// Import products from a Shopify-based brand store's public /products.json.
// Usage: node scripts/import-shopify.mjs --merchant "Brand Name" --store https://brand.example.com [--pages 8] [--aff "utm_source=fitsy"]
// Only use stores whose owners allow it (ask them, or join their affiliate program and pass its tracking query via --aff).
import { mapColour, mapSlot, mapGender, mapGroups, mapTags, mapTier } from "./flipkart-map.mjs";
import { mergeMerchant } from "./merge-products.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith("--") ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const { merchant, store } = args;
if (!merchant || !store) { console.error('Usage: node scripts/import-shopify.mjs --merchant "Brand" --store https://brand.com [--pages 8] [--aff "ref=xyz"]'); process.exit(1); }
const base = store.replace(/\/+$/, "");
const pages = Number(args.pages ?? 8);
const prefix = "sh" + merchant.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);

const out = new Map(); let seen = 0;
for (let page = 1; page <= pages; page++) {
  let data;
  try {
    const res = await fetch(`${base}/products.json?limit=250&page=${page}`, { headers: { accept: "application/json" } });
    if (!res.ok) { console.warn(`page ${page}: HTTP ${res.status}${page === 1 ? " (this store may not expose products.json)" : ""}`); break; }
    data = await res.json();
  } catch (e) { console.warn(`page ${page}: ${e.message}`); break; }
  const list = data.products ?? [];
  if (!list.length) break;
  for (const p of list) {
    seen++;
    const variants = (p.variants ?? []).filter((v) => v.available !== false);
    if (!variants.length || !p.handle || !p.title) continue;
    const price = Math.round(Math.min(...variants.map((v) => parseFloat(v.price)).filter((n) => n > 0)));
    if (!Number.isFinite(price) || price <= 0) continue;
    const tags = Array.isArray(p.tags) ? p.tags.join(" ") : String(p.tags ?? "");
    const text = `${p.title} ${p.product_type ?? ""} ${tags}`;
    const slot = mapSlot(p.title) ?? mapSlot(text);
    const colOpt = (p.options ?? []).findIndex((o) => /colou?r/i.test(o.name));
    const optColour = colOpt >= 0 ? p.options[colOpt].values?.[0] : undefined;
    const colour = mapColour(optColour) ?? mapColour(p.title);
    if (!slot || !colour) continue;
    const sizeOpt = (p.options ?? []).find((o) => /size/i.test(o.name));
    const tier = mapTier(price);
    const url = new URL(`${base}/products/${p.handle}`);
    if (args.aff) for (const [k, v] of new URLSearchParams(args.aff)) url.searchParams.set(k, v);
    const id = `${prefix}-${p.id}`;
    out.set(id, {
      id, name: String(p.title).slice(0, 150), brand: String(p.vendor || merchant).slice(0, 70), merchant, slot, subtype: slot, price, colour,
      gender: mapGender(text), groups: mapGroups(text), tags: mapTags(text, tier), tier, productUrl: url.toString().replace(/^http:/, "https:"),
      imageUrl: p.images?.[0]?.src, sizes: sizeOpt?.values?.slice(0, 8).map((s) => String(s).slice(0, 12)), inStock: true,
    });
  }
  if (list.length < 250) break;
}
console.log(`${merchant}: read ${seen} products, kept ${out.size}`);
if (!out.size) { console.error("Nothing kept, so data/products.json was not changed."); process.exit(1); }
await mergeMerchant(merchant, [...out.values()]);
