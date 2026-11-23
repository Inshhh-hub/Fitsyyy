"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Photo { id: string; source: string; src: string; alt: string; photographer: string; photographerUrl: string; pageUrl: string }
const cache = new Map<string, Photo[]>();

/** Real outfit photos (Unsplash / Pexels / Pixabay) used as inspiration for an outfit. Calls onLoaded(true) once photos are available. */
export function InspirationPhotos({ query, fixed, className, onLoaded }: { query: string; fixed?: { unsplashId?: string; url?: string; credit?: string; creditUrl?: string }; className?: string; onLoaded?: (ok: boolean) => void }) {
  const key = fixed?.unsplashId ? `id:${fixed.unsplashId}` : fixed?.url ? `url:${fixed.url}` : query;
  const [photos, setPhotos] = useState<Photo[] | null>(cache.get(key) ?? null);
  const [i, setI] = useState(0);

  useEffect(() => {
    let live = true;
    if (cache.has(key)) { onLoaded?.(cache.get(key)!.length > 0); return; }
    if (fixed?.url && !fixed.unsplashId) {
      const one: Photo[] = [{ id: fixed.url, source: fixed.credit ? "Source" : "Photo", src: fixed.url, alt: "Outfit photo", photographer: fixed.credit ?? "Photo", photographerUrl: fixed.creditUrl ?? fixed.url, pageUrl: fixed.creditUrl ?? fixed.url }];
      cache.set(key, one); setPhotos(one); onLoaded?.(true); return;
    }
    const endpoint = fixed?.unsplashId ? `/api/inspiration?photo=${encodeURIComponent(fixed.unsplashId)}` : `/api/inspiration?q=${encodeURIComponent(query)}`;
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((d: { photos?: Photo[] }) => {
        const list = d.photos ?? [];
        cache.set(key, list);
        if (live) { setPhotos(list); onLoaded?.(list.length > 0); }
      })
      .catch(() => live && (setPhotos([]), onLoaded?.(false)));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!photos?.length) return null;
  const p = photos[Math.min(i, photos.length - 1)];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-beige", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt={p.alt} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      {photos.length > 1 && (
        <>
          <button aria-label="Previous photo" onClick={() => setI((i - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ivory/90 p-1.5 shadow-soft"><ChevronLeft size={16} /></button>
          <button aria-label="Next photo" onClick={() => setI((i + 1) % photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ivory/90 p-1.5 shadow-soft"><ChevronRight size={16} /></button>
        </>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 text-[10px]">
        <a href={p.photographerUrl} target="_blank" rel="noopener noreferrer" className="truncate rounded-full bg-ivory/90 px-2 py-1">Photo: {p.photographer}</a>
        <a href={p.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ivory/90 px-2 py-1">{p.source} <ExternalLink size={10} /></a>
      </div>
    </div>
  );
}
