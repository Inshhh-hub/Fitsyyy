import type { Product } from "@/types";

export type PreviewItem = Pick<Product, "slot" | "hex" | "subtype">;

const SKIN = "#E6D6BF"; // neutral mannequin tone — deliberately NOT derived from the user's skin tone

/** Flat illustrated preview of an outfit, coloured from the real product colours. */
export function OutfitPreview({ items, className }: { items: PreviewItem[]; className?: string }) {
  const by = (slot: Product["slot"]) => items.find((i) => i.slot === slot);
  const upper = by("upper")?.hex ?? "#bbb";
  const outer = by("outer");
  const lower = by("lower");
  const foot = by("footwear")?.hex ?? "#444";
  const belt = by("belt");
  const watch = by("watch");
  const eyewear = by("eyewear");
  const cap = by("cap");
  const chain = by("chain");
  const bag = by("bag");
  const lowerType = (lower?.subtype ?? "").toLowerCase();
  const isShorts = /shorts/.test(lowerType);
  const isFlow = /skirt|palazzo|sharara|dhoti/.test(lowerType);
  const hemY = isShorts ? 225 : isFlow ? (/skirt/.test(lowerType) ? 245 : 284) : 286;
  const stroke = "rgba(31,31,31,0.18)";
  const lowerHex = lower?.hex ?? "#777";

  return (
    <svg viewBox="0 0 200 320" className={className} role="img" aria-label="Outfit illustration">
      <defs>
        <linearGradient id="pv-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EFE6D6" />
          <stop offset="1" stopColor="#FAF6EE" />
        </linearGradient>
      </defs>
      <rect width="200" height="320" rx="22" fill="url(#pv-bg)" />
      {/* legs / bottom */}
      {isFlow ? (
        <path d={`M68 168 L132 168 L${isFinite(hemY) && /skirt/.test(lowerType) ? 138 : 146} ${hemY} L${/skirt/.test(lowerType) ? 62 : 54} ${hemY} Z`} fill={lowerHex} stroke={stroke} />
      ) : (
        <>
          <path d={`M68 168 L100 168 L98 ${hemY} L${isShorts ? 74 : 75} ${hemY} Z`} fill={lowerHex} stroke={stroke} />
          <path d={`M100 168 L132 168 L${isShorts ? 126 : 125} ${hemY} L102 ${hemY} Z`} fill={lowerHex} stroke={stroke} />
        </>
      )}
      {(isShorts || /skirt/.test(lowerType)) && (
        <>
          <rect x="77" y={hemY} width="19" height={284 - hemY} fill={SKIN} />
          <rect x="104" y={hemY} width="19" height={284 - hemY} fill={SKIN} />
        </>
      )}
      {/* shoes */}
      <ellipse cx="84" cy="297" rx="17" ry="8" fill={foot} stroke={stroke} />
      <ellipse cx="116" cy="297" rx="17" ry="8" fill={foot} stroke={stroke} />
      {/* torso + sleeves */}
      <path d="M60 70 L140 70 L132 172 L68 172 Z" fill={upper} stroke={stroke} />
      <path d="M60 70 L38 150 L53 155 L70 92 Z" fill={outer?.hex ?? upper} stroke={stroke} />
      <path d="M140 70 L162 150 L147 155 L130 92 Z" fill={outer?.hex ?? upper} stroke={stroke} />
      {outer && (
        <>
          <path d="M60 70 L90 70 L86 174 L66 174 Z" fill={outer.hex} stroke={stroke} />
          <path d="M140 70 L110 70 L114 174 L134 174 Z" fill={outer.hex} stroke={stroke} />
        </>
      )}
      {belt && <rect x="67" y="164" width="66" height="7" fill={belt.hex} stroke={stroke} />}
      {/* neck + head */}
      <rect x="92" y="54" width="16" height="18" fill={SKIN} />
      <circle cx="100" cy="38" r="20" fill={SKIN} stroke={stroke} />
      {cap && <path d="M80 36 A20 20 0 0 1 120 36 L126 38 L80 38 Z" fill={cap.hex} stroke={stroke} />}
      {eyewear && (
        <g fill={eyewear.hex} stroke={stroke}>
          <rect x="85" y="35" width="13" height="8" rx="3" />
          <rect x="102" y="35" width="13" height="8" rx="3" />
        </g>
      )}
      {chain && <path d="M86 72 Q100 92 114 72" fill="none" stroke={chain.hex} strokeWidth="2.5" />}
      {watch && <rect x="39" y="147" width="14" height="7" rx="2" fill={watch.hex} stroke={stroke} />}
      {bag && <rect x="150" y="150" width="26" height="20" rx="4" fill={bag.hex} stroke={stroke} />}
    </svg>
  );
}
