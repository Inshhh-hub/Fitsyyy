// Import an affiliate-network product feed (Admitad/Cuelinks/vCommission etc.) for Myntra, Ajio, Amazon
// or any merchant. Supports YML/XML (Admitad "yml"), CSV and JSON (array). Usage:
//   node scripts/import-feed.mjs --merchant Myntra --src "<feed url or local file>" [--format yml|csv|json]
//   optional header overrides for CSV/JSON field names: --map name=title,price=sale_price,url=link,image=img,brand=brand,colour=color,id=sku
// Only items with an https product link, a price and a recognisable slot+colour are kept.
import { readFile } from "node:fs/promises";
import { mapColour, mapSlot, mapGender, mapGroups, mapTags, mapTier } from "./flipkart-map.mjs";
import { mergeMerchant } from "./merge-products.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith("--") ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const merchant = args.merchant, src = args.src;
if (!merchant || !src) { console.error('Usage: node scripts/import-feed.mjs --merchant Myntra --src <url|file> [--format yml|csv|json]'); process.exit(1); }
const prefix = merchant.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
const mapOver = Object.fromEntries((args.map ?? "").split(",").filter(Boolean).map((p) => p.split("=")));

const text = /^https?:\/\//.test(src) ? await (await fetch(src)).text() : await readFile(src, "utf8");
const format = args.format ?? (text.trimStart().startsWith("<") ? "yml" : text.trimStart().startsWith("[") ? "json" : "csv");

const unesc = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i")); return m ? unesc(m[1]) : undefined; };

function rowsFromYml() {
  const cats = {};
  for (const m of text.matchAll(/<category\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/category>/g)) cats[m[1]] = unesc(m[2]);
  return [...text.matchAll(/<offer\b([^>]*)>([\s\S]*?)<\/offer>/g)].map(([, attrs, body]) => {
    const params = {};
    for (const p of body.matchAll(/<param\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/param>/g)) params[p[1].toLowerCase()] = unesc(p[2]);
    return {
      id: attrs.match(/id="([^"]+)"/)?.[1] ?? tag(body, "vendorCode"),
      name: tag(body, "name") ?? tag(body, "model"), price: tag(body, "price"), url: tag(body, "url"),
      image: tag(body, "picture"), brand: tag(body, "vendor"), colour: params.color ?? params.colour,
      size: params.size, category: cats[tag(body, "categoryId")] ?? "", inStock: attrs.match(/available="([^"]+)"/)?.[1] !== "false",
    };
  });
}
function splitCsv(line, d) { const o = []; let c = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (q && line[i + 1] === '"') { c += '"'; i++; } else q = !q; } else if (ch === d && !q) { o.push(c); c = ""; } else c += ch; } o.push(c); return o; }
function rowsFromCsv() {
  const lines = text.split(/\r?\n/).filter(Boolean); const d = lines[0].includes("\t") ? "\t" : lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const head = splitCsv(lines[0], d).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((l) => Object.fromEntries(splitCsv(l, d).map((v, i) => [head[i], v.trim()])));
}
const pick = (r, key, alts) => { const k = (mapOver[key] ?? "").toLowerCase(); const keys = k ? [k] : alts; for (const a of keys) if (r[a] != null && r[a] !== "") return r[a]; };

let raw = format === "yml" ? rowsFromYml() : format === "json" ? JSON.parse(text) : rowsFromCsv();
const out = new Map(); let skipped = 0;
for (const r0 of raw) {
  const r = Object.fromEntries(Object.entries(r0).map(([k, v]) => [k.toLowerCase(), v]));
  const name = pick(r, "name", ["name", "title", "product_name", "productname"]);
  const priceRaw = pick(r, "price", ["price", "sale_price", "saleprice", "selling_price", "current_price"]);
  const url = String(pick(r, "url", ["url", "link", "product_url", "producturl", "deeplink", "affiliate_url"]) ?? "").replace(/^http:\/\//i, "https://");
  const price = Math.round(parseFloat(String(priceRaw ?? "").replace(/[^0-9.]/g, "")));
  if (!name || !price || !url.startsWith("https://")) { skipped++; continue; }
  const category = r.category ?? r.categorypath ?? r.product_type ?? "";
  const text2 = `${name} ${category}`;
  const slot = mapSlot(name) ?? mapSlot(text2);
  const colour = mapColour(pick(r, "colour", ["colour", "color"])) ?? mapColour(name);
  if (!slot || !colour) { skipped++; continue; }
  const tier = mapTier(price);
  const id = `${prefix}-${pick(r, "id", ["id", "sku", "product_id", "productid", "offer_id"]) ?? Buffer.from(url).toString("base64").slice(-16)}`;
  out.set(id, {
    id, name: String(name).slice(0, 150), brand: String(pick(r, "brand", ["brand", "vendor", "manufacturer"]) || merchant).slice(0, 70), merchant,
    slot, subtype: slot, price, colour, gender: mapGender(text2), groups: mapGroups(text2), tags: mapTags(text2, tier), tier, productUrl: url,
    imageUrl: pick(r, "image", ["image", "image_url", "imageurl", "picture", "img"]), inStock: r.instock === undefined ? undefined : r.instock !== false,
    sizes: r.size ? [String(r.size).slice(0, 12)] : undefined,
  });
}
console.log(`${merchant}: parsed ${raw.length}, kept ${out.size}, skipped ${skipped}`);
await mergeMerchant(merchant, [...out.values()]);
