import { readFile, writeFile } from "node:fs/promises";
const FILE = new URL("../data/products.json", import.meta.url);

/** Replace all products from `merchant` in data/products.json with `fresh`, keeping other merchants. */
export async function mergeMerchant(merchant, fresh) {
  let existing = [];
  try { existing = JSON.parse(await readFile(FILE, "utf8")); } catch {}
  const kept = existing.filter((p) => p.merchant !== merchant);
  const all = [...kept, ...fresh];
  await writeFile(FILE, JSON.stringify(all));
  const bySlot = {};
  for (const p of fresh) bySlot[p.slot] = (bySlot[p.slot] ?? 0) + 1;
  console.log(`${merchant}: wrote ${fresh.length} products (total file: ${all.length}). By slot:`, bySlot);
}
