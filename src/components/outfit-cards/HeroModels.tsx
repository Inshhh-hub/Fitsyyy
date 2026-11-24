"use client";

import { useEffect, useState } from "react";
import { OutfitPreview, type PreviewItem } from "./OutfitPreview";
import { cn } from "@/lib/utils";

interface Photo { id: string; src: string; alt: string; photographer: string; photographerUrl: string; pageUrl: string; source: string }

/** One search per card: real full-length fashion photos from the free stock-photo API. */
const QUERIES = [
  "man full length fashion model standing neutral outfit beige background",
  "woman full length fashion model standing minimal outfit studio",
  "man full length street style model olive jacket white sneakers",
];

/** Only used if no photo key is configured, or the photo service is down. */
const FALLBACK: PreviewItem[][] = [
  [{ slot: "upper", hex: "#efe6d2", subtype: "Shirt" }, { slot: "lower", hex: "#1f2a44", subtype: "Trousers" }, { slot: "footwear", hex: "#6b4a32", subtype: "Loafers" }, { slot: "belt", hex: "#6b4a32", subtype: "Belt" }, { slot: "watch", hex: "#b8b8bc", subtype: "Watch" }],
  [{ slot: "upper", hex: "#9aa88a", subtype: "Kurta" }, { slot: "outer", hex: "#d9c9a9", subtype: "Jacket" }, { slot: "lower", hex: "#efe6d2", subtype: "Pyjama" }, { slot: "footwear", hex: "#c9a24a", subtype: "Mojari" }],
  [{ slot: "upper", hex: "#1f1f1f", subtype: "T-shirt" }, { slot: "outer", hex: "#6b7050", subtype: "Jacket" }, { slot: "lower", hex: "#3a3a3a", subtype: "Cargo" }, { slot: "footwear", hex: "#f3f0e8", subtype: "Sneakers" }, { slot: "eyewear", hex: "#1f1f1f", subtype: "Sunglasses" }],
];

const cache: { photos?: Array<Photo | null> } = {};

export function HeroModels() {
  const [photos, setPhotos] = useState<Array<Photo | null> | undefined>(cache.photos);

  useEffect(() => {
    if (cache.photos) return;
    let live = true;
    Promise.all(
      QUERIES.map((q) =>
        fetch(`/api/inspiration?q=${encodeURIComponent(q)}`)
          .then((r) => (r.ok ? r.json() : { photos: [] }))
          .then((d: { photos?: Photo[] }) => d.photos?.[0] ?? null)
          .catch(() => null),
      ),
    ).then((list) => {
      cache.photos = list;
      if (live) setPhotos(list);
    });
    return () => { live = false; };
  }, []);

  const loading = photos === undefined;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-beige-deep/70 bg-gradient-to-br from-beige via-ivory to-sage-light/70 p-4 shadow-soft sm:p-6">
      {/* soft light, kept very quiet so the photos are the focus */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lime/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-sage/25 blur-3xl" />
      <div className="relative grid grid-cols-3 gap-2.5 sm:gap-4">
        {QUERIES.map((_, i) => {
          const p = photos?.[i];
          return (
            <div key={i} className={i === 1 ? "mt-6 sm:mt-10" : ""}>
              {loading ? (
                <div className="aspect-[3/4] w-full animate-pulse rounded-3xl bg-beige-deep/50" />
              ) : p ? (
                <figure className="relative aspect-[3/4] overflow-hidden rounded-3xl border-[3px] border-ivory bg-beige shadow-lift transition-transform duration-300 hover:-translate-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.alt} loading={i === 0 ? "eager" : "lazy"} referrerPolicy="no-referrer" className="h-full w-full object-cover object-top" />
                  <figcaption className="absolute inset-x-1.5 bottom-1.5 truncate">
                    <a href={p.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-block max-w-full truncate rounded-full bg-ivory/85 px-2 py-0.5 text-[9px] text-charcoal backdrop-blur">
                      {p.photographer} · {p.source}
                    </a>
                  </figcaption>
                </figure>
              ) : (
                <OutfitPreview items={FALLBACK[i]} className={cn("w-full rounded-3xl")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
