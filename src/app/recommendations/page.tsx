"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitCompareArrows, Plus, RefreshCw, Sparkles } from "lucide-react";
import { CompareModal } from "@/components/outfit-cards/CompareModal";
import { OutfitCard } from "@/components/outfit-cards/OutfitCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Field, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useStyle } from "@/hooks/useStyle";
import { recalc } from "@/lib/recommendations/budget";
import { SORTERS, type SortKey } from "@/lib/recommendations/engine";
import { cn, formatINR } from "@/lib/utils";
import type { GenerateResponse } from "@/types";

const SORT_LABELS: Record<SortKey, string> = {
  best: "Best overall match",
  price: "Lowest price",
  premium: "Premium appearance",
  occasion: "Most suitable for the occasion",
  colour: "Best colour combination",
};

export default function RecommendationsPage() {
  const router = useRouter();
  const toast = useToast();
  const { hydrated, body, appearance, preferences, result, round, saved, wishlist, setBody, setResult, updateOutfit, toggleSaved, toggleWishlist } = useStyle();
  const [sort, setSort] = useState<SortKey>("best");
  const [onlyWithin, setOnlyWithin] = useState(false);
  const [occFilter, setOccFilter] = useState("all");
  const [compare, setCompare] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | "more" | "fresh">(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetErr, setBudgetErr] = useState<string>();
  const [showCompare, setShowCompare] = useState(false);

  const savedIds = useMemo(() => new Set(saved.map((o) => o.id)), [saved]);
  const wishIds = useMemo(() => new Set(wishlist.map((p) => p.id)), [wishlist]);

  const outfits = useMemo(() => {
    let list = result?.recommendations ?? [];
    if (onlyWithin) list = list.filter((o) => o.withinBudget);
    if (occFilter !== "all") list = list.filter((o) => o.occasionId === occFilter);
    return [...list].sort(SORTERS[sort]);
  }, [result, onlyWithin, occFilter, sort]);

  const occasions = useMemo(() => {
    const m = new Map<string, string>();
    result?.recommendations.forEach((o) => m.set(o.occasionId, o.occasionLabel));
    return [...m];
  }, [result]);

  if (!hydrated) {
    return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-96" />)}</div>;
  }

  if (!result || !body || !appearance || !preferences) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-4xl">No outfits yet</h1>
        <p className="mt-3 text-taupe-dark">Tell us about your budget, appearance and occasion and we&apos;ll style your looks.</p>
        <ButtonLink href={body ? (appearance ? "/occasions" : "/appearance") : "/onboarding"} className="mt-6" size="lg"><Sparkles size={16} /> {body ? "Continue styling" : "Start styling"}</ButtonLink>
      </div>
    );
  }

  async function generate(mode: "more" | "fresh") {
    if (!result || !body || !appearance || !preferences) return;
    setBusy(mode);
    const nextRound = round + 1;
    try {
      const res = await fetch("/api/generate-outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, appearance, preferences, round: nextRound, excludeProductIds: [...new Set(result.recommendations.flatMap((o) => o.items.map((i) => i.id)))].slice(0, 300) }),
      });
      const data = (await res.json()) as GenerateResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate more ideas.");
      const merged = mode === "more" ? [...result.recommendations, ...data.recommendations.filter((n) => !result.recommendations.some((o) => o.id === n.id))] : data.recommendations;
      setResult({ ...data, recommendations: merged }, nextRound);
      setCompare([]);
      toast(mode === "more" ? `${data.recommendations.length} new ideas added.` : "Fresh set of looks ready.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  function applyBudget() {
    const n = Number(budgetInput);
    if (!Number.isFinite(n) || n < 500 || n > 1_000_000) return setBudgetErr("Enter a budget between ₹500 and ₹10,00,000");
    setBudgetErr(undefined);
    setBody({ ...body!, budget: n });
    result!.recommendations.forEach((o) => updateOutfit(recalc(o, o.items, n)));
    setBudgetInput("");
    toast(`Budget updated to ${formatINR(n)}. Totals recalculated. Regenerate for looks built around it.`);
  }

  const toggleCompare = (id: string) =>
    setCompare((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id);
      if (c.length >= 3) {
        toast("Compare up to 3 outfits at a time.", "info");
        return c;
      }
      return [...c, id];
    });

  const within = result.recommendations.filter((o) => o.withinBudget).length;

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage-dark">Your looks</p>
        <h1 className="mt-1 text-4xl sm:text-5xl">{result.recommendations.length} outfits, styled for you</h1>
        <p className="mt-2 text-taupe-dark">{within} within your {formatINR(body.budget)} budget · {result.engine === "ai" ? "AI stylist" : "Built-in stylist engine"}</p>
        <div className="mt-4 space-y-2">
          {result.notices.map((n) => <p key={n} className="rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-900">{n}</p>)}
        </div>
      </header>

      <Card className="mb-6 grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-taupe">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="mt-1 block rounded-full border border-beige-deep bg-ivory px-4 py-2 text-sm outline-none focus:border-sage-dark">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
            </select>
          </label>
          {occasions.length > 1 && (
            <label className="text-xs font-medium text-taupe">
              Occasion
              <select value={occFilter} onChange={(e) => setOccFilter(e.target.value)} className="mt-1 block rounded-full border border-beige-deep bg-ivory px-4 py-2 text-sm outline-none focus:border-sage-dark">
                <option value="all">All occasions</option>
                {occasions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          )}
          <button onClick={() => setOnlyWithin((v) => !v)} aria-pressed={onlyWithin} className={cn("rounded-full border px-4 py-2 text-sm transition", onlyWithin ? "border-sage-dark bg-sage-light text-sage-dark" : "border-beige-deep bg-ivory")}>Within budget only</button>
        </div>
        <div className="flex items-start gap-2">
          <Field label="Adjust budget (₹)" type="number" inputMode="numeric" placeholder={String(body.budget)} value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} error={budgetErr} className="w-40" />
          <Button variant="secondary" className="mt-[26px]" onClick={applyBudget} disabled={!budgetInput}>Update</Button>
        </div>
      </Card>

      {busy === "fresh" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[28rem]" />)}</div>
      ) : outfits.length ? (
        <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((o) => (
            <OutfitCard
              key={o.id}
              outfit={o}
              gender={body.category}
              saved={savedIds.has(o.id)}
              comparing={compare.includes(o.id)}
              wishIds={wishIds}
              onSave={() => toast(toggleSaved(o) ? "Saved to your favourites." : "Removed from favourites.")}
              onCompare={() => toggleCompare(o.id)}
              onWish={(p) => toast(toggleWishlist(p) ? "Added to wishlist." : "Removed from wishlist.")}
              onChange={updateOutfit}
              notify={toast}
            />
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center">
          <p className="font-serif text-2xl">No outfits match these filters</p>
          <Button variant="secondary" className="mt-4" onClick={() => { setOnlyWithin(false); setOccFilter("all"); }}>Clear filters</Button>
        </Card>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button size="lg" loading={busy === "more"} onClick={() => generate("more")} disabled={busy !== null}><Plus size={18} /> Generate More Ideas</Button>
        <Button size="lg" variant="secondary" onClick={() => generate("fresh")} disabled={busy !== null}><RefreshCw size={16} /> Regenerate all</Button>
        <Button size="lg" variant="ghost" onClick={() => router.push("/occasions")}>Change occasions</Button>
      </div>
      <p className="mt-6 text-center text-xs text-taupe">Saved looks live in your <Link href="/profile#saved" className="underline">profile</Link>.</p>

      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full bg-charcoal px-5 py-3 text-sm text-ivory shadow-lift">
            <Badge tone="sage">{compare.length}/3</Badge> selected
            <Button size="sm" variant="secondary" disabled={compare.length < 2} onClick={() => setShowCompare(true)}><GitCompareArrows size={14} /> Compare</Button>
            <button className="text-xs underline" onClick={() => setCompare([])}>Clear</button>
          </div>
        </div>
      )}
      {showCompare && compare.length >= 2 && (
        <CompareModal
          outfits={result.recommendations.filter((o) => compare.includes(o.id))}
          onClose={() => setShowCompare(false)}
          onRemove={(id) => {
            setCompare((c) => c.filter((x) => x !== id));
            if (compare.length <= 2) setShowCompare(false);
          }}
        />
      )}
    </div>
  );
}
