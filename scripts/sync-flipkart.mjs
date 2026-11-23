// Pulls fashion products from the Flipkart Affiliate Product Feed API into data/products.json.
//   FLIPKART_AFFILIATE_ID=... FLIPKART_AFFILIATE_TOKEN=... node scripts/sync-flipkart.mjs [--list]
// Optional: FLIPKART_CATEGORIES=a,b,c   FLIPKART_MAX_PAGES=6 (500 items/page)   FLIPKART_MAX_ITEMS=4000
import { mergeMerchant } from "./merge-products.mjs";
import { mapProduct } from "./flipkart-map.mjs";

const id = process.env.FLIPKART_AFFILIATE_ID;
const token = process.env.FLIPKART_AFFILIATE_TOKEN;
if (!id || !token) {
  console.error("Set FLIPKART_AFFILIATE_ID and FLIPKART_AFFILIATE_TOKEN (Flipkart Affiliate dashboard → API).");
  process.exit(1);
}
const headers = { "Fk-Affiliate-Id": id, "Fk-Affiliate-Token": token, Accept: "application/json" };
const maxPages = Number(process.env.FLIPKART_MAX_PAGES || 6);
const maxItems = Number(process.env.FLIPKART_MAX_ITEMS || 4000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.split("?")[0]}`);
  return res.json();
}

const listing = await get(`https://affiliate-api.flipkart.net/affiliate/api/${id}.json`);
const all = listing?.apiGroups?.affiliate?.apiListings ?? {};
const names = Object.keys(all);
if (process.argv.includes("--list")) {
  console.log(names.join("\n"));
  process.exit(0);
}

const FASHION = /cloth|shoe|footwear|watch|sunglass|bag|belt|wallet|jewel|ethnic|fashion|apparel|kurta|saree|men|women/i;
const wanted = process.env.FLIPKART_CATEGORIES ? process.env.FLIPKART_CATEGORIES.split(",").map((s) => s.trim()) : names.filter((n) => FASHION.test(n));
if (!wanted.length) {
  console.error("No fashion-looking categories found. Run with --list and set FLIPKART_CATEGORIES.\nAvailable:\n" + names.join(", "));
  process.exit(1);
}
console.log("Categories:", wanted.join(", "));

const out = new Map();
for (const name of wanted) {
  const variants = all[name]?.availableVariants ?? {};
  let url = (variants["v1.1.0"] ?? variants["v0.1.0"])?.get;
  if (!url) { console.warn(`skip ${name}: no feed URL`); continue; }
  url += (url.includes("?") ? "&" : "?") + "inStock=true";
  let kept = 0;
  for (let page = 0; page < maxPages && url && out.size < maxItems; page++) {
    try {
      const data = await get(url);
      for (const info of data.productInfoList ?? []) {
        const p = mapProduct(info);
        if (p && !out.has(p.id)) { out.set(p.id, p); kept++; }
      }
      url = data.nextUrl;
    } catch (e) {
      console.warn(`  ${name} page ${page + 1}: ${e.message}`);
      break;
    }
    await sleep(120); // Flipkart limit is 20 calls/sec per affiliate
  }
  console.log(`  ${name}: kept ${kept}`);
}

const products = [...out.values()];
await mergeMerchant("Flipkart", products);
