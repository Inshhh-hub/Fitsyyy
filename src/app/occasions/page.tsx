"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Briefcase, Check, Coffee, Dumbbell, GraduationCap, Heart, Music, PartyPopper, Plus, Sparkles, Users, Wine, type LucideIcon } from "lucide-react";
import { ProgressSteps } from "@/components/onboarding/ProgressSteps";
import { Button } from "@/components/ui/Button";
import { Card, Field, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useStyle } from "@/hooks/useStyle";
import { COLOUR_HEX, parseColours, titleCase } from "@/lib/recommendations/colour";
import { OCCASIONS, type Occasion } from "@/lib/recommendations/occasions";
import { preferencesSchema } from "@/lib/validations/schemas";
import { cn } from "@/lib/utils";
import { FITS, type Fit, type GenerateResponse } from "@/types";

const ICONS: Record<Occasion["icon"], LucideIcon> = { Music, Heart, PartyPopper, Coffee, Briefcase, Building2, Dumbbell, Users, Wine, GraduationCap, Sparkles, Plus };
const PICKABLE = ["black", "white", "navy", "grey", "beige", "olive", "sage", "maroon", "burgundy", "mustard", "rust", "teal", "blue", "pink", "red", "emerald", "brown", "cream"];
const LOADING_LINES = ["Reading your proportions…", "Matching colours to your skin tone…", "Balancing the budget…", "Composing six distinct looks…"];

function ColourChips({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {PICKABLE.map((c) => {
          const on = value.includes(c);
          return (
            <button key={c} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== c) : [...value, c])} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition", on ? "border-charcoal bg-charcoal text-ivory" : "border-beige-deep bg-ivory hover:border-taupe")}>
              <span className="h-3 w-3 rounded-full border border-charcoal/20" style={{ background: COLOUR_HEX[c] }} />
              {titleCase(c)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OccasionsPage() {
  const router = useRouter();
  const toast = useToast();
  const { body, appearance, preferences, setPreferences, setResult, hydrated } = useStyle();
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [style, setStyle] = useState("");
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [fit, setFit] = useState<Fit | "">("");
  const [restrictions, setRestrictions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    if (!body) router.replace("/onboarding");
    else if (!appearance) router.replace("/appearance");
  }, [hydrated, body, appearance, router]);

  useEffect(() => {
    if (hydrated && preferences) {
      setPicked(preferences.occasions ?? []);
      setCustom(preferences.customOccasion ?? "");
      setStyle(preferences.style ?? "");
      setLiked(parseColours(preferences.likedColours));
      setDisliked(parseColours(preferences.dislikedColours));
      setFit(preferences.fit ?? "");
      setRestrictions(preferences.restrictions ?? "");
    }
  }, [hydrated, preferences]);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1800);
    return () => clearInterval(t);
  }, [loading]);

  function toggle(id: string) {
    setError(null);
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= 4) {
        toast("You can pick up to 4 occasions.", "info");
        return p;
      }
      return [...p, id];
    });
  }

  async function generate() {
    if (!body || !appearance) return;
    const prefs = {
      occasions: picked,
      customOccasion: picked.includes("others") ? custom.trim() : undefined,
      style: style.trim() || undefined,
      likedColours: liked.join(", ") || undefined,
      dislikedColours: disliked.join(", ") || undefined,
      fit: fit || undefined,
      restrictions: restrictions.trim() || undefined,
    };
    const parsed = preferencesSchema.safeParse(prefs);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    if (picked.includes("others") && !custom.trim()) return setError("Tell us what the 'Others' occasion is.");
    const overlap = liked.filter((c) => disliked.includes(c));
    if (overlap.length) return setError(`${titleCase(overlap[0])} is in both liked and disliked colours.`);

    setError(null);
    setLoading(true);
    setPreferences(prefs);
    try {
      const res = await fetch("/api/generate-outfits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, appearance, preferences: prefs, round: 0, excludeProductIds: [] }) });
      const data = (await res.json()) as GenerateResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data, 0);
      router.push("/recommendations");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      toast(msg, "error");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center" aria-busy="true">
        <h1 className="text-4xl">Styling your looks</h1>
        <p className="mt-3 h-6 text-taupe-dark">{LOADING_LINES[line]}</p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ProgressSteps current={3} />
      <h1 className="text-center text-4xl">What are you dressing for?</h1>
      <p className="mx-auto mt-3 max-w-md text-center text-taupe-dark">Pick up to four occasions. Each gets its own set of distinct looks.</p>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {OCCASIONS.map((o) => {
          const Icon = ICONS[o.icon];
          const on = picked.includes(o.id);
          return (
            <motion.button key={o.id} type="button" whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} aria-pressed={on} onClick={() => toggle(o.id)} className={cn("relative flex h-36 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-left shadow-soft transition", o.tone, on && "ring-2 ring-sage-dark ring-offset-2 ring-offset-ivory")}>
              <Icon size={26} strokeWidth={1.5} />
              <div>
                <p className="font-serif text-lg leading-tight">{o.label}</p>
                <p className="mt-0.5 text-[11px] opacity-75">{o.blurb}</p>
              </div>
              {on && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-sage-dark text-ivory"><Check size={14} /></span>}
            </motion.button>
          );
        })}
      </div>

      {picked.includes("others") && (
        <Field className="mt-5 max-w-md" label="Describe your occasion" placeholder="e.g. Sangeet night, college farewell" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={80} />
      )}

      <Card className="mt-10 space-y-6 p-6">
        <div>
          <h2 className="text-2xl">Preferences <span className="ml-1 text-sm font-sans text-taupe">Optional</span></h2>
          <p className="mt-1 text-sm text-taupe">Everything here is optional, but it makes the picks more yours.</p>
        </div>
        <Field label="Preferred clothing style" optional placeholder="e.g. minimal, streetwear, classic" value={style} onChange={(e) => setStyle(e.target.value)} maxLength={80} />
        <ColourChips label="Colours you like" value={liked} onChange={setLiked} />
        <ColourChips label="Colours you dislike" value={disliked} onChange={setDisliked} />
        <div>
          <p className="mb-2 text-sm font-medium">Preferred fit</p>
          <div className="flex flex-wrap gap-2">
            {FITS.map((f) => (
              <button key={f} type="button" aria-pressed={fit === f} onClick={() => setFit(fit === f ? "" : f)} className={cn("rounded-full border px-4 py-2 text-sm transition", fit === f ? "border-charcoal bg-charcoal text-ivory" : "border-beige-deep bg-ivory hover:border-taupe")}>{f}</button>
            ))}
          </div>
        </div>
        <Field label="Clothing restrictions or preferences" optional placeholder="e.g. no shorts, avoid leather" value={restrictions} onChange={(e) => setRestrictions(e.target.value)} maxLength={200} hint="Words after “no” or “avoid” are excluded from your outfits." />
      </Card>

      {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/appearance")}>Back</Button>
        <Button size="lg" disabled={!picked.length} onClick={generate}><Sparkles size={18} /> Generate my outfits</Button>
      </div>
    </div>
  );
}
