"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ProgressSteps } from "@/components/onboarding/ProgressSteps";
import { Button } from "@/components/ui/Button";
import { Card, Field } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useStyle } from "@/hooks/useStyle";
import { bodyInfoSchema } from "@/lib/validations/schemas";
import type { FashionCategory } from "@/types";
import { cn, formatINR } from "@/lib/utils";

const RANGES = [
  { label: "Below ₹1,000", max: 1000 },
  { label: "₹1,000–₹2,500", max: 2500 },
  { label: "₹2,500–₹5,000", max: 5000 },
  { label: "₹5,000–₹10,000", max: 10000 },
  { label: "₹10,000–₹20,000", max: 20000 },
  { label: "Above ₹20,000", max: 30000 },
];
const CATEGORIES: Array<{ id: FashionCategory; label: string; sub: string }> = [
  { id: "men", label: "Men's fashion", sub: "Menswear & unisex" },
  { id: "women", label: "Women's fashion", sub: "Womenswear & unisex" },
  { id: "unisex", label: "Unisex fashion", sub: "Show me everything" },
];

type Form = Record<"budget" | "height" | "weight" | "shoulder" | "chest" | "waist" | "hip", string>;

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { body, setBody, hydrated } = useStyle();
  const [form, setForm] = useState<Form>({ budget: "", height: "", weight: "", shoulder: "", chest: "", waist: "", hip: "" });
  const [category, setCategory] = useState<FashionCategory | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (hydrated && body) {
      setForm({ budget: String(body.budget), height: String(body.heightCm), weight: String(body.weightKg), shoulder: body.shoulderCm?.toString() ?? "", chest: body.chestCm?.toString() ?? "", waist: body.waistCm?.toString() ?? "", hip: body.hipCm?.toString() ?? "" });
      setCategory(body.category);
    }
  }, [hydrated, body]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const opt = (v: string) => (v.trim() === "" ? undefined : Number(v));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = bodyInfoSchema.safeParse({
      budget: num(form.budget),
      heightCm: num(form.height),
      weightKg: num(form.weight),
      category: category || undefined,
      shoulderCm: opt(form.shoulder),
      chestCm: opt(form.chest),
      waistCm: opt(form.waist),
      hipCm: opt(form.hip),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.path[0] === "category" ? "Choose a fashion category" : issue.message;
      setErrors(errs);
      toast("Please fix the highlighted fields.", "error");
      return;
    }
    setErrors({});
    setBody(parsed.data);
    router.push("/appearance");
  }

  const budgetNum = Number(form.budget);

  return (
    <div className="mx-auto max-w-2xl">
      <ProgressSteps current={1} />
      <h1 className="text-center text-4xl">Let&apos;s start with your budget</h1>
      <p className="mx-auto mt-3 max-w-md text-center text-taupe-dark">Then a few body details so every outfit fits your proportions.</p>

      <form onSubmit={submit} className="mt-10 space-y-6" noValidate>
        <Card className="p-6">
          <h2 className="text-2xl">Total outfit budget</h2>
          <p className="mt-1 text-sm text-taupe">For the complete look: clothing, footwear and accessories. We treat a range as your maximum.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <button key={r.label} type="button" onClick={() => setForm((f) => ({ ...f, budget: String(r.max) }))} className={cn("rounded-full border px-4 py-2 text-sm transition", budgetNum === r.max ? "border-charcoal bg-charcoal text-ivory" : "border-beige-deep bg-ivory hover:border-taupe")}>
                {r.label}
              </button>
            ))}
          </div>
          <Field label="Custom amount" type="number" inputMode="numeric" min={500} placeholder="e.g. 5000" suffix="INR ₹" value={form.budget} onChange={set("budget")} error={errors.budget} hint={budgetNum >= 500 ? `Budget: ${formatINR(budgetNum)}` : undefined} className="mt-4" />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-2xl">Basic body information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Height" type="number" inputMode="decimal" placeholder="175" suffix="cm" value={form.height} onChange={set("height")} error={errors.heightCm} />
            <Field label="Weight" type="number" inputMode="decimal" placeholder="70" suffix="kg" value={form.weight} onChange={set("weight")} error={errors.weightKg} />
          </div>
          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-medium">Fashion category</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <label key={c.id} className={cn("cursor-pointer rounded-2xl border p-4 transition", category === c.id ? "border-charcoal bg-beige" : "border-beige-deep bg-ivory hover:border-taupe")}>
                  <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="sr-only" />
                  <span className="block text-sm font-medium">{c.label}</span>
                  <span className="text-xs text-taupe">{c.sub}</span>
                </label>
              ))}
            </div>
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
          </fieldset>
        </Card>

        <div className="rounded-3xl border border-dashed border-taupe/50 bg-beige/40 p-6">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-2xl">Optional measurements</h2>
            <span className="rounded-full bg-ivory px-2.5 py-0.5 text-[11px] text-taupe">Optional</span>
          </div>
          <p className="mb-4 text-sm text-taupe">Skip any you don&apos;t know. They simply sharpen fit advice.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shoulder width" optional type="number" inputMode="decimal" suffix="cm" value={form.shoulder} onChange={set("shoulder")} error={errors.shoulderCm} />
            <Field label="Chest" optional type="number" inputMode="decimal" suffix="cm" value={form.chest} onChange={set("chest")} error={errors.chestCm} />
            <Field label="Waist" optional type="number" inputMode="decimal" suffix="cm" value={form.waist} onChange={set("waist")} error={errors.waistCm} />
            <Field label="Hip" optional type="number" inputMode="decimal" suffix="cm" value={form.hip} onChange={set("hip")} error={errors.hipCm} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg">Continue <ArrowRight size={18} /></Button>
        </div>
      </form>
    </div>
  );
}
