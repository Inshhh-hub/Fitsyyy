"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, Shirt, Sparkles, Upload } from "lucide-react";
import { OutfitCard } from "@/components/outfit-cards/OutfitCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useStyle } from "@/hooks/useStyle";
import { ANCHOR_COLOURS, ANCHOR_SLOT_LABEL, anchorTypesFor, getAnchorType, nearestColour, type AnchorSlot } from "@/lib/recommendations/anchor";
import { hexFor } from "@/lib/recommendations/colour";
import { cn, formatINR } from "@/lib/utils";
import type { Outfit, Product } from "@/types";

const SLOT_ORDER: AnchorSlot[] = ["lower", "upper", "footwear", "outer"];

/** Shrinks the photo (so nothing heavy is kept in memory) and reads its main colour. Runs in the browser only. */
async function readPhoto(file: File): Promise<{ dataUrl: string; colour: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that photo. Try a JPG or PNG."));
      el.src = url;
    });
    const scale = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Your browser can't process photos.");
    ctx.drawImage(img, 0, 0, w, h);
    // Median colour of the middle of the picture, where the clothing usually is.
    const x0 = Math.round(w * 0.3), y0 = Math.round(h * 0.3);
    const data = ctx.getImageData(x0, y0, Math.max(1, Math.round(w * 0.4)), Math.max(1, Math.round(h * 0.4))).data;
    const r: number[] = [], g: number[] = [], b: number[] = [];
    for (let i = 0; i < data.length; i += 16) { r.push(data[i]); g.push(data[i + 1]); b.push(data[i + 2]); }
    const med = (a: number[]) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 128;
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.8), colour: nearestColour([med(r), med(g), med(b)]) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const withoutPhoto = (o: Outfit): Outfit => ({ ...o, items: o.items.map((i) => (i.owned ? { ...i, imageUrl: undefined } : i)) });

export default function BuildAroundPage() {
  const toast = useToast();
  const { hydrated, body, appearance, preferences, saved, wishlist, toggleSaved, toggleWishlist } = useStyle();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [colour, setColour] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recognising, setRecognising] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [variant, setVariant] = useState(0);
  const savedIds = useMemo(() => new Set(saved.map((o) => o.id)), [saved]);
  const wishIds = useMemo(() => new Set(wishlist.map((p) => p.id)), [wishlist]);

  if (!hydrated) return <Skeleton className="h-96" />;

  if (!body || !appearance) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-4xl">Tell us about you first</h1>
        <p className="mt-3 text-taupe-dark">We match every outfit to your build, skin tone and budget, so we need those once before we can build around your clothes.</p>
        <ButtonLink href={body ? "/appearance" : "/onboarding"} className="mt-6" size="lg"><Sparkles size={16} /> {body ? "Add my appearance" : "Start styling"}</ButtonLink>
      </div>
    );
  }
  const cat = body.category;
  const types = anchorTypesFor(cat);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) return toast("Choose a photo under 15 MB (JPG or PNG).", "error");
    try {
      const r = await readPhoto(file);
      setPhoto(r.dataUrl);
      setDetected(r.colour);
      setColour(r.colour);
      setTypeId(null);
      setSeen(null);
      setOutfits(null);
      setShowManual(false);
      await recogniseAndBuild(r.dataUrl, r.colour);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't read that photo.", "error");
    }
  }

  /** Ask the free AI what the garment is. On success, build the outfits straight away. On failure, fall back to picking by hand. */
  async function recogniseAndBuild(dataUrl: string, pixelColour: string) {
    if (!body) return;
    setRecognising(true);
    try {
      const res = await fetch("/api/recognize-clothing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, category: body.category }),
      });
      const data = (await res.json()) as { typeId?: string; colour?: string; seen?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't recognise that photo.");
      const col = data.colour ?? pixelColour;
      setColour(col);
      setSeen(data.seen ?? null);
      if (!data.typeId) {
        setShowManual(true);
        toast(`We see "${data.seen ?? "a clothing item"}" but aren't sure what type it is. Please pick it below.`, "info");
        return;
      }
      setTypeId(data.typeId);
      await build(0, { photo: dataUrl, typeId: data.typeId, colour: col });
    } catch (e) {
      setShowManual(true);
      toast(e instanceof Error ? e.message : "Couldn't recognise that photo. Pick the type yourself.", "info");
    } finally {
      setRecognising(false);
    }
  }

  async function build(nextVariant: number, o?: { photo: string; typeId: string; colour: string }) {
    const ph = o?.photo ?? photo;
    const ty = o?.typeId ?? typeId;
    const co = o?.colour ?? colour;
    if (!ph || !ty || !co || !body || !appearance) return;
    setBusy(true);
    try {
      const res = await fetch("/api/build-around", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, appearance, preferences, anchor: { typeId: ty, colour: co }, variant: nextVariant }),
      });
      const data = (await res.json()) as { anchor?: Product; outfits?: Outfit[]; error?: string };
      if (!res.ok || !data.outfits) throw new Error(data.error ?? "Couldn't build outfits.");
      // The photo is added here, in the browser, so it is never stored with the outfits.
      setOutfits(data.outfits.map((x) => ({ ...x, items: x.items.map((i) => (i.owned ? { ...i, imageUrl: ph } : i)) })));
      setVariant(nextVariant);
      toast(`${data.outfits.length} outfits built around your piece.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.", "error");
    } finally {
      setBusy(false);
    }
  }

  const chosen = typeId ? getAnchorType(typeId) : undefined;

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage-dark">Build around my clothes</p>
        <h1 className="mt-1 text-4xl sm:text-5xl">Start with something you already own</h1>
        <p className="mt-2 max-w-2xl text-taupe-dark">Upload one piece, like your black baggy pants. We build at least five complete outfits around it, matched to your body, colouring and budget, and tell you which occasion each one is best for.</p>
      </header>

      <Card className="mb-8 grid gap-6 p-5 md:grid-cols-[220px_1fr]">
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} className={cn("flex h-64 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-beige-deep bg-beige/40 text-taupe-dark transition hover:border-charcoal", photo && "border-solid p-0")} aria-label="Upload a photo of your clothing">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Your uploaded piece" className="h-full w-full object-cover" />
            ) : (
              <>
                <Upload size={26} />
                <span className="text-sm font-medium">Add a photo</span>
                <span className="px-4 text-center text-[11px] text-taupe">Lay the piece flat or hold it up, filling most of the frame.</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          {photo && <button onClick={() => fileRef.current?.click()} className="mt-2 inline-flex items-center gap-1 text-xs text-taupe underline"><Camera size={12} /> Use a different photo</button>}
          <p className="mt-2 text-[11px] text-taupe">Show just the clothing. The photo is sent once to a free AI (Cloudflare) to work out what it is, and is not saved. Only the type and colour are used to build your outfits.</p>
        </div>

        <div className="space-y-5">
          {(recognising || (photo && seen) || (photo && !typeId)) && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-lime/30 px-4 py-3 text-sm">
              {recognising ? (
                <><Loader2 size={16} className="animate-spin" /> Looking at your photo…</>
              ) : (
                <>
                  <span>
                    {chosen ? <>We think this is <strong>{colour} {chosen.name.toLowerCase()}</strong>.</> : seen ? <>We see &quot;{seen}&quot;.</> : <>We couldn&apos;t tell what this is.</>}
                  </span>
                  {chosen && <button onClick={() => setShowManual((v) => !v)} className="text-xs underline">{showManual ? "Hide options" : "Not right? Change"}</button>}
                </>
              )}
            </div>
          )}

          {(!photo || showManual || (!recognising && !typeId)) && (
          <div>
            <p className="mb-2 text-sm font-medium">{photo ? "Pick what it is" : "Or pick it yourself"}</p>
            <div className="space-y-3">
              {SLOT_ORDER.map((slot) => {
                const list = types.filter((t) => t.slot === slot);
                if (!list.length) return null;
                return (
                  <div key={slot}>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-taupe">{ANCHOR_SLOT_LABEL[slot]}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((t) => (
                        <button key={t.id} onClick={() => { setTypeId(t.id); setOutfits(null); }} aria-pressed={typeId === t.id} className={cn("rounded-full border px-3 py-1.5 text-xs transition", typeId === t.id ? "border-charcoal bg-charcoal text-ivory" : "border-beige-deep bg-ivory hover:bg-beige")}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          <div>
            <p className="mb-1 text-sm font-medium">{photo ? "Colour" : "Colour (we read it from the photo)"}</p>
            <p className="mb-2 text-[11px] text-taupe">{detected ? "Wrong colour? Tap the right one and rebuild." : "Add a photo and we'll read the colour. You can change it."}</p>
            <div className="flex flex-wrap gap-1.5">
              {ANCHOR_COLOURS.map((c) => (
                <button key={c} onClick={() => { setColour(c); setOutfits(null); }} aria-pressed={colour === c} aria-label={c} title={c} className={cn("h-8 w-8 rounded-full border-2 transition", colour === c ? "border-charcoal ring-2 ring-lime" : "border-charcoal/15")} style={{ background: hexFor(c) }} />
              ))}
            </div>
            {colour && <p className="mt-1.5 text-xs capitalize text-taupe-dark">{colour}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void build(0)} loading={busy} disabled={!photo || !typeId || !colour || recognising}>
              <Shirt size={16} /> {outfits ? "Rebuild with these choices" : "Build 6 outfits"}
            </Button>
            {!photo && <span className="text-xs text-taupe">Add a photo to start.</span>}
            {photo && !typeId && !recognising && <span className="text-xs text-taupe">Pick what it is.</span>}
          </div>
          <p className="text-[11px] text-taupe">Budget {formatINR(body.budget)} applies to the pieces you&apos;d add. Your own piece costs nothing.</p>
        </div>
      </Card>

      {busy && !outfits && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-96" />)}</div>}

      {outfits && (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl">{outfits.length} outfits around your {chosen ? chosen.name.toLowerCase() : "piece"}</h2>
              <p className="text-sm text-taupe-dark">Each card says which occasions it suits. Tap &quot;AI preview&quot; for a picture of a person wearing it.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void build(variant + 1)} loading={busy}><RefreshCw size={14} /> Build another set</Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {outfits.map((o) => (
              <OutfitCard
                key={o.id}
                outfit={o}
                gender={cat}
                saved={savedIds.has(o.id)}
                comparing={false}
                wishIds={wishIds}
                onSave={() => toast(toggleSaved(withoutPhoto(o)) ? "Saved to your favourites." : "Removed from favourites.", "info")}
                onWish={(p) => toast(toggleWishlist(p) ? "Added to wishlist." : "Removed from wishlist.", "info")}
                onChange={(n) => setOutfits((list) => (list ? list.map((x) => (x.id === n.id ? n : x)) : list))}
                notify={toast}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
