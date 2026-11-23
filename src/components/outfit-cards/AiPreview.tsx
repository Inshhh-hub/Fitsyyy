"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { Outfit } from "@/types";
import { useStyle } from "@/hooks/useStyle";

const POSES: Array<[string, string]> = [
  ["standing", "Standing"], ["walking", "Walking"], ["pockets", "Hands in pockets"], ["sitting", "Sitting"], ["candid", "Candid"],
];
const SCENES: Array<[string, string]> = [
  ["auto", "Auto for occasion"], ["studio", "Plain studio"], ["street", "City street"], ["cafe", "Cafe"], ["nightclub", "Nightclub"], ["party", "Party venue"],
  ["wedding", "Wedding hall"], ["office", "Office"], ["gym", "Gym"], ["home", "Home"], ["campus", "Campus"], ["festive", "Festive courtyard"], ["evening", "Evening terrace"],
];

/** Free AI-generated picture of an invented person (matching the shopper's build and skin tone) wearing this outfit. Always labelled as AI. */
export function AiPreview({ outfit, gender, onImage }: { outfit: Outfit; gender: string; onImage: (src: string | null) => void }) {
  const { body, appearance } = useStyle();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shown, setShown] = useState(false);
  const [pose, setPose] = useState("standing");
  const [scene, setScene] = useState("auto");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/outfit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: gender === "women" ? "women" : gender === "men" ? "men" : "unisex",
          pose,
          scene,
          occasion: outfit.occasionId,
          items: outfit.items.slice(0, 8).map((i) => ({ slot: i.slot, colour: i.colour, name: i.name })),
          model: body ? { heightCm: body.heightCm, weightKg: body.weightKg, faceShape: appearance?.faceShape, skinTone: appearance?.skinTone, undertone: appearance?.undertone } : undefined,
        }),
      });
      const data = (await res.json()) as { image?: string; error?: string };
      if (!res.ok || !data.image) throw new Error(data.error ?? "Couldn't make the preview.");
      onImage(data.image);
      setShown(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't make the preview.");
    } finally {
      setBusy(false);
    }
  }

  const sel = "rounded-full border border-beige-deep bg-ivory px-2 py-1 text-[11px] text-charcoal";
  return (
    <div className="px-4 pb-1 pt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <select aria-label="Pose" value={pose} onChange={(e) => setPose(e.target.value)} className={sel}>
          {POSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="Background" value={scene} onChange={(e) => setScene(e.target.value)} className={sel}>
          {SCENES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={run} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-xs font-medium text-charcoal disabled:opacity-60">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {busy ? "Making it, up to a minute…" : shown ? "Make another" : "AI preview (free)"}
        </button>
        {shown && <button onClick={() => { onImage(null); setShown(false); }} className="text-xs text-taupe underline">Back to photos</button>}
      </div>
      {err && <p className="mt-1 text-[11px] text-red-700">{err}</p>}
      <p className="mt-1 text-[10px] text-taupe">AI-generated picture of an invented person with a similar build and skin tone to yours. Not a real photo and not you; details can differ from the actual products. Each picture uses part of the free daily limit.</p>
    </div>
  );
}
