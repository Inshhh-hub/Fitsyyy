// Maps a Flipkart Affiliate Product Feed item (v1.1.0 productBaseInfoV1) to fitsy's Product shape.
// Items we can't classify confidently (slot / colour) are skipped rather than guessed.

const COLOURS = ["black", "white", "navy", "grey", "charcoal", "beige", "olive", "sage", "maroon", "burgundy", "mustard", "rust", "teal", "cream", "ivory", "brown", "tan", "blue", "pink", "red", "emerald", "gold", "silver", "denim", "khaki", "lavender", "peach", "camel"];
const SYNONYMS = [[/navy|dark blue|midnight/, "navy"], [/light blue|sky blue|baby blue/, "lightblue"], [/off.?white|ivory/, "ivory"], [/gr[ae]y|charcoal/, "grey"], [/wine|maroon/, "maroon"], [/green/, "olive"], [/yellow/, "mustard"], [/orange/, "rust"], [/purple|violet/, "lavender"], [/golden/, "gold"], [/coffee|chocolate/, "brown"]];

export function mapColour(raw) {
  const c = String(raw || "").toLowerCase();
  if (!c || /multi/.test(c)) return null;
  for (const [re, name] of SYNONYMS) if (re.test(c)) return name;
  return COLOURS.find((n) => new RegExp(`\\b${n}\\b`).test(c)) ?? null;
}

const SLOT_RULES = [
  ["wallet", /\bwallets?\b/], ["watch", /\bwatch(es)?\b/], ["eyewear", /sunglass|goggle|\beyewear\b/], ["belt", /\bbelts?\b/],
  ["bracelet", /bracelet|bangle|kada/], ["chain", /\bchains?\b|necklace|pendant/], ["cap", /\b(cap|caps|hat|beanie)\b/],
  ["bag", /backpack|\bbags?\b|sling|tote|duffle|clutch/],
  ["footwear", /\bshoes?\b|sneaker|loafer|\bboots?\b|sandal|slipper|flip.?flop|\bheels?\b|jutti|mojari|kolhapuri|\bflats?\b|slides?/],
  ["outer", /blazer|jacket|waistcoat|dupatta|shrug|\bcoat\b|nehru/],
  ["lower", /jeans|trouser|\bpants?\b|chino|cargo|shorts?|jogger|legging|skirt|palazzo|sharara|pyjama|churidar|dhoti|track ?pant/],
  ["upper", /t-?shirt|\bshirts?\b|\bpolo\b|kurta|kurti|\btops?\b|sweater|hoodie|sweatshirt|blouse|\btank\b|\bvest\b/],
];

export function mapSlot(text) {
  const t = text.toLowerCase();
  if (/kurta|kurti/.test(t) && !/footwear|shoe/.test(t)) return "upper"; // kurta sets are classed by the kurta
  for (const [slot, re] of SLOT_RULES) if (re.test(t)) return slot;
  return null;
}

export function mapGender(text) {
  const t = text.toLowerCase();
  if (/\bwom[ae]n|\bgirls?\b|\bladies\b|\bfemale\b/.test(t)) return "women";
  if (/\bmen'?s?\b|\bboys?\b|\bmale\b/.test(t)) return "men";
  return "unisex";
}

export function mapGroups(text) {
  const t = text.toLowerCase();
  const g = new Set();
  if (/formal|office|blazer|trouser|oxford|derby|brogue|waistcoat/.test(t)) g.add("formal");
  if (/party|satin|velvet|clubwear|chelsea|sequin|bodycon/.test(t)) g.add("party");
  if (/kurta|kurti|sherwani|nehru|saree|sharara|palazzo|dupatta|jutti|mojari|churidar|ethnic|dhoti|kolhapuri|bangle|kundan/.test(t)) g.add("ethnic");
  if (/sport|gym|running|training|track|jogger|dri.?fit|legging|workout/.test(t)) g.add("sport");
  if (!g.size || /casual|jeans|t-?shirt|sneaker|hoodie|polo|chino|cargo/.test(t)) g.add("casual");
  return [...g];
}

export function mapTags(text, tier) {
  const t = text.toLowerCase();
  const tags = new Set();
  if (/oversized|baggy|loose/.test(t)) tags.add("oversized"), tags.add("street");
  if (/graphic|printed|cargo|hoodie|street/.test(t)) tags.add("street");
  if (/solid|plain|basic/.test(t)) tags.add("minimal");
  if (/slim|classic|formal|oxford|derby/.test(t)) tags.add("classic");
  if (/formal|office/.test(t)) tags.add("formal");
  if (/linen|cotton|casual/.test(t)) tags.add("smartcasual");
  if (/kurta|kurti|sherwani|nehru|ethnic|dhoti|jutti|mojari/.test(t)) tags.add("traditional");
  if (/wedding|festive|silk|embroider|zari/.test(t)) tags.add("wedding"), tags.add("festive");
  if (/indo.?western|asymmetric/.test(t)) tags.add("indowestern");
  if (/sport|gym|running|training|dri.?fit|jogger|track/.test(t)) tags.add("sporty");
  if (/party|satin|velvet|sequin/.test(t)) tags.add("party");
  if (/comfort|relaxed|lounge/.test(t)) tags.add("comfy");
  if (tier === "premium") tags.add("premium");
  if (tier === "budget") tags.add("value");
  return [...tags];
}

export function mapTier(price) {
  return price < 1000 ? "budget" : price < 2500 ? "mid" : "premium";
}

/** Returns a fitsy product or null if it can't be classified reliably. */
export function mapProduct(info) {
  const b = info?.productBaseInfoV1;
  if (!b?.productId || !b.title || !b.productUrl) return null;
  const price = b.flipkartSpecialPrice?.amount ?? b.flipkartSellingPrice?.amount;
  if (!price || price <= 0) return null;
  const text = `${b.title} ${b.categoryPath ?? ""}`;
  const slot = mapSlot(b.title) ?? mapSlot(text);
  if (!slot) return null;
  const colour = mapColour(b.attributes?.color) ?? mapColour(b.title);
  if (!colour) return null;
  const url = String(b.productUrl).replace(/^http:\/\//i, "https://");
  if (!url.startsWith("https://")) return null;
  const tier = mapTier(price);
  return {
    id: `fk-${b.productId}`,
    name: String(b.title).slice(0, 150),
    brand: String(b.productBrand || "Flipkart").slice(0, 70),
    merchant: "Flipkart",
    slot,
    subtype: slot,
    price: Math.round(price),
    colour,
    gender: mapGender(text),
    groups: mapGroups(text),
    tags: mapTags(text, tier),
    tier,
    productUrl: url,
    imageUrl: b.imageUrls?.["400x400"] || b.imageUrls?.["800x800"] || b.imageUrls?.unknown || undefined,
    sizes: b.attributes?.size ? [String(b.attributes.size).slice(0, 12)] : undefined,
    inStock: typeof b.inStock === "boolean" ? b.inStock : undefined,
  };
}
