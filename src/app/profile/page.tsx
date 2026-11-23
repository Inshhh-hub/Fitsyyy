"use client";

import { useEffect, useState } from "react";
import { Heart, LogOut, Mail, Pencil, Trash2 } from "lucide-react";
import { OutfitPreview } from "@/components/outfit-cards/OutfitPreview";
import { ProductRow } from "@/components/product-cards/ProductRow";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, Field, Modal, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useStyle } from "@/hooks/useStyle";
import { getSupabase } from "@/lib/database/supabase-browser";
import { getOccasion } from "@/lib/recommendations/occasions";
import { bodyInfoSchema } from "@/lib/validations/schemas";
import { formatINR } from "@/lib/utils";
import { FACE_SHAPES, SKIN_TONES, UNDERTONES, type FaceShape, type FashionCategory, type SkinTone, type Undertone } from "@/types";

const SELECTS: Array<[string, "category" | "face" | "skin" | "under", readonly string[]]> = [
  ["Fashion category", "category", ["men", "women", "unisex"]],
  ["Face shape", "face", FACE_SHAPES],
  ["Skin tone", "skin", SKIN_TONES],
  ["Undertone", "under", UNDERTONES],
];

function Row({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-beige-deep/60 py-2 text-sm last:border-0">
      <dt className="text-taupe">{k}</dt>
      <dd className="text-right font-medium">{v || "—"}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const toast = useToast();
  const { hydrated, body, appearance, preferences, saved, wishlist, history, user, authEnabled, setBody, setAppearance, setPreferences, toggleSaved, toggleWishlist, deleteEverything } = useStyle();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [f, setF] = useState({ height: "", weight: "", budget: "", shoulder: "", chest: "", waist: "", hip: "", category: "men" as FashionCategory, face: "Oval", skin: "Medium", under: "Neutral", liked: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hydrated) return;
    setF({
      height: body?.heightCm?.toString() ?? "", weight: body?.weightKg?.toString() ?? "", budget: body?.budget?.toString() ?? "",
      shoulder: body?.shoulderCm?.toString() ?? "", chest: body?.chestCm?.toString() ?? "", waist: body?.waistCm?.toString() ?? "", hip: body?.hipCm?.toString() ?? "",
      category: body?.category ?? "men", face: appearance?.faceShape ?? "Oval", skin: appearance?.skinTone ?? "Medium", under: appearance?.undertone ?? "Neutral", liked: preferences?.likedColours ?? "",
    });
  }, [hydrated, body, appearance, preferences]);

  if (!hydrated) return <Skeleton className="h-96" />;

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const opt = (v: string) => (v.trim() === "" ? undefined : Number(v));

  function save() {
    const parsed = bodyInfoSchema.safeParse({ heightCm: num(f.height), weightKg: num(f.weight), budget: num(f.budget), category: f.category, shoulderCm: opt(f.shoulder), chestCm: opt(f.chest), waistCm: opt(f.waist), hipCm: opt(f.hip) });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
      setErrs(e);
      return;
    }
    setErrs({});
    setBody(parsed.data);
    setAppearance({ faceShape: f.face as FaceShape, skinTone: f.skin as SkinTone, undertone: f.under as Undertone, source: "manual" });
    setPreferences({ occasions: preferences?.occasions ?? [], ...preferences, likedColours: f.liked.slice(0, 120) || undefined });
    setEditing(false);
    toast("Profile updated.");
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setSending(true);
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/profile` } });
    setSending(false);
    if (error) toast(error.message, "error");
    else setSent(true);
  }

  async function wipe() {
    setDeleting(true);
    try {
      await deleteEverything();
      toast("All your stored data has been deleted.");
      setConfirmDelete(false);
    } catch {
      toast("Couldn't delete everything. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage-dark">Style profile</p>
        <h1 className="mt-1 text-4xl sm:text-5xl">Your profile</h1>
        <p className="mt-2 text-taupe-dark">Using fitsy as a guest? Everything stays in this browser. Sign in only if you want it saved across devices.</p>
      </header>

      {authEnabled && (
        <Card className="p-6">
          <h2 className="mb-2 text-2xl">Account</h2>
          {user ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-taupe-dark">Signed in as <strong>{user.email}</strong>. Your profile and favourites sync automatically.</p>
              <Button variant="secondary" size="sm" onClick={() => getSupabase()?.auth.signOut()}><LogOut size={14} /> Sign out</Button>
            </div>
          ) : sent ? (
            <p className="text-sm text-sage-dark">Check your inbox for a sign-in link.</p>
          ) : (
            <form onSubmit={signIn} className="flex flex-wrap items-end gap-3">
              <Field label="Email (optional)" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-[16rem] flex-1" />
              <Button type="submit" loading={sending}><Mail size={14} /> Email me a sign-in link</Button>
            </form>
          )}
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl">Measurements &amp; preferences</h2>
          {body && !editing && <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</Button>}
        </div>
        {!body ? (
          <div className="text-sm text-taupe-dark">No profile yet. <ButtonLink href="/onboarding" size="sm" className="ml-2">Start styling</ButtonLink></div>
        ) : editing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Height (cm)" type="number" value={f.height} onChange={set("height")} error={errs.heightCm} />
              <Field label="Weight (kg)" type="number" value={f.weight} onChange={set("weight")} error={errs.weightKg} />
              <Field label="Budget (₹)" type="number" value={f.budget} onChange={set("budget")} error={errs.budget} />
              <Field label="Shoulder (cm)" optional type="number" value={f.shoulder} onChange={set("shoulder")} error={errs.shoulderCm} />
              <Field label="Chest (cm)" optional type="number" value={f.chest} onChange={set("chest")} error={errs.chestCm} />
              <Field label="Waist (cm)" optional type="number" value={f.waist} onChange={set("waist")} error={errs.waistCm} />
              <Field label="Hip (cm)" optional type="number" value={f.hip} onChange={set("hip")} error={errs.hipCm} />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              {SELECTS.map(([label, key, opts]) => (
                <label key={key} className="block text-sm font-medium">{label}
                  <select value={f[key]} onChange={set(key)} className="mt-1.5 w-full rounded-2xl border border-beige-deep bg-ivory px-3 py-3 text-sm capitalize">
                    {opts.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <Field label="Preferred clothing colours" optional placeholder="e.g. navy, olive, cream" value={f.liked} onChange={set("liked")} />
            <div className="flex gap-3"><Button onClick={save}>Save changes</Button><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
          </div>
        ) : (
          <dl className="grid gap-x-10 sm:grid-cols-2">
            <div>
              <Row k="Height" v={`${body.heightCm} cm`} />
              <Row k="Weight" v={`${body.weightKg} kg`} />
              <Row k="Budget" v={formatINR(body.budget)} />
              <Row k="Category" v={`${body.category[0].toUpperCase()}${body.category.slice(1)}`} />
              <Row k="Shoulder / chest" v={[body.shoulderCm, body.chestCm].filter(Boolean).join(" / ") || null} />
              <Row k="Waist / hip" v={[body.waistCm, body.hipCm].filter(Boolean).join(" / ") || null} />
            </div>
            <div>
              <Row k="Face shape" v={appearance?.faceShape} />
              <Row k="Skin tone" v={appearance?.skinTone} />
              <Row k="Undertone" v={appearance?.undertone} />
              <Row k="Liked colours" v={preferences?.likedColours} />
              <Row k="Preferred fit" v={preferences?.fit} />
              <Row k="Style" v={preferences?.style} />
            </div>
          </dl>
        )}
      </Card>

      <section id="saved" className="scroll-mt-24">
        <h2 className="mb-4 flex items-center gap-2 text-3xl"><Heart size={22} /> Saved outfits <Badge>{saved.length}</Badge></h2>
        {saved.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((o) => (
              <Card key={o.id} className="flex gap-4 p-4">
                <OutfitPreview items={o.items} className="h-36 w-auto shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[11px] uppercase tracking-wide text-taupe">{getOccasion(o.occasionId).id === "others" ? o.occasionLabel : getOccasion(o.occasionId).label}</p>
                  <p className="font-serif text-xl leading-tight">{o.name}</p>
                  <p className="mt-1 text-sm">{formatINR(o.total)} {o.withinBudget ? <Badge tone="sage">in budget</Badge> : <Badge tone="warn">over</Badge>}</p>
                  <Button variant="ghost" size="sm" className="mt-auto self-start" onClick={() => { toggleSaved(o); toast("Removed from favourites."); }}>Remove</Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-taupe-dark">Nothing saved yet. Tap “Save Favourite” on any outfit.</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-3xl">Wishlist <Badge>{wishlist.length}</Badge></h2>
        {wishlist.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {wishlist.map((p) => <ProductRow key={p.id} item={p} wished onWish={() => { toggleWishlist(p); toast("Removed from wishlist."); }} />)}
          </ul>
        ) : (
          <p className="text-sm text-taupe-dark">Tap the heart on any product to keep it here.</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-3xl">Previous recommendations</h2>
        {history.length ? (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.at} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-beige-deep/70 bg-white/60 px-4 py-3 text-sm">
                <span>{h.occasions.map((o) => getOccasion(o).label).join(", ")}</span>
                <span className="text-taupe">{h.count} outfits · {formatINR(h.budget)} budget · {new Date(h.at).toLocaleDateString("en-IN")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-taupe-dark">Your styling sessions will appear here.</p>
        )}
      </section>

      <Card className="border-red-200 p-6">
        <h2 className="text-2xl">Privacy</h2>
        <p className="mt-2 max-w-2xl text-sm text-taupe-dark">Photos are analysed on your device and never uploaded or stored. You can delete everything else fitsy keeps — your measurements, appearance details, favourites, wishlist and history{authEnabled ? ", including anything synced to your account" : ""} — at any time.</p>
        <Button variant="secondary" className="mt-4 !border-red-300 !text-red-700" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete all my data</Button>
      </Card>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete all data?">
        <p className="text-sm text-taupe-dark">This permanently removes your profile, saved outfits, wishlist and history from this browser{user ? " and from your account" : ""}. It can&apos;t be undone.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep my data</Button>
          <Button loading={deleting} onClick={wipe} className="!bg-red-700 hover:!bg-red-800">Delete everything</Button>
        </div>
      </Modal>
    </div>
  );
}
