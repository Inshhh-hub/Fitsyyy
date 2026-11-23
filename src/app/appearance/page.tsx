"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, Lock, PenLine, RefreshCw, Upload } from "lucide-react";
import { CameraCapture } from "@/components/camera/CameraCapture";
import { ProgressSteps } from "@/components/onboarding/ProgressSteps";
import { Button } from "@/components/ui/Button";
import { Badge, Card, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useStyle } from "@/hooks/useStyle";
import { suggestionsFor } from "@/lib/recommendations/appearance";
import { COLOUR_HEX } from "@/lib/recommendations/colour";
import { analyseFace, FaceAnalysisError, loadImage } from "@/lib/vision/faceAnalysis";
import { FACE_SHAPES, SKIN_TONES, UNDERTONES, type Appearance, type FaceShape, type SkinTone, type Undertone } from "@/types";

type Mode = "choose" | "camera" | "analysing" | "confirm";

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="mt-1.5 w-full rounded-2xl border border-beige-deep bg-ivory px-4 py-3 text-sm outline-none focus:border-sage-dark focus:ring-2 focus:ring-sage/40">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

export default function AppearancePage() {
  const router = useRouter();
  const toast = useToast();
  const { body, appearance, setAppearance, hydrated } = useStyle();
  const fileRef = useRef<HTMLInputElement>(null);

  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [preview, setPreview] = useState<string | null>(null); // held in memory only, never persisted
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [faceShape, setFaceShape] = useState<FaceShape>("Oval");
  const [skinTone, setSkinTone] = useState<SkinTone>("Medium");
  const [undertone, setUndertone] = useState<Undertone>("Neutral");
  const [detected, setDetected] = useState<{ faceShape: FaceShape; skinTone: SkinTone; undertone: Undertone; confidence?: number } | null>(null);

  useEffect(() => {
    if (hydrated && !body) router.replace("/onboarding");
  }, [hydrated, body, router]);

  useEffect(() => {
    if (appearance && mode === "choose" && !detected) {
      setFaceShape(appearance.faceShape);
      setSkinTone(appearance.skinTone);
      setUndertone(appearance.undertone);
    }
  }, [appearance, mode, detected]);

  async function run(canvas: HTMLCanvasElement) {
    setMode("analysing");
    setError(null);
    setPreview(canvas.toDataURL("image/jpeg", 0.8));
    try {
      const r = await analyseFace(canvas);
      setDetected({ ...r.appearance });
      setFaceShape(r.appearance.faceShape);
      setSkinTone(r.appearance.skinTone);
      setUndertone(r.appearance.undertone);
      setWarnings(r.warnings);
      setMode("confirm");
    } catch (e) {
      setError(e instanceof FaceAnalysisError ? e.message : "Analysis failed. You can retake the photo or enter details manually.");
      setPreview(null);
      setMode("choose");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      toast("Please choose a JPEG, PNG or WebP image.", "error");
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      toast("That image is over 12 MB. Try a smaller one.", "error");
      return;
    }
    try {
      await run(await loadImage(f));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that image.");
    }
  }

  function retake() {
    setPreview(null);
    setDetected(null);
    setWarnings([]);
    setMode("choose");
  }

  function manual() {
    setDetected(null);
    setPreview(null);
    setMode("confirm");
  }

  function proceed() {
    const changed = detected && (detected.faceShape !== faceShape || detected.skinTone !== skinTone || detected.undertone !== undertone);
    const a: Appearance = { faceShape, skinTone, undertone, source: detected && !changed ? "ai" : "manual", confidence: detected && !changed ? detected.confidence : undefined };
    setAppearance(a);
    setPreview(null); // discard the photo
    router.push("/occasions");
  }

  const sug = suggestionsFor({ faceShape, skinTone, undertone, source: "manual" }, body?.category ?? "unisex");

  return (
    <div className="mx-auto max-w-2xl">
      <ProgressSteps current={2} />
      <h1 className="text-center text-4xl">Your appearance</h1>
      <p className="mx-auto mt-3 max-w-md text-center text-taupe-dark">Face shape, skin tone and undertone help us choose flattering cuts and colours.</p>

      {mode === "choose" && (
        <div className="mt-10 space-y-5">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <Lock size={20} className="mt-0.5 shrink-0 text-sage-dark" />
              <div className="text-sm text-taupe-dark">
                <h2 className="mb-1 font-serif text-xl text-charcoal">Why we ask for a photo</h2>
                <p>The camera lets us measure the proportions of your face and sample your skin colour. The analysis runs <strong>on your device</strong> with MediaPipe. Your photo is never uploaded or stored, and we never infer ethnicity, race or identity. Nothing starts until you press a button below.</p>
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-beige/60 p-4 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#62785E]" />
              <span>I agree to my photo being analysed on this device for face shape, skin tone and undertone.</span>
            </label>
            {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button disabled={!consent} onClick={() => setMode("camera")}><Camera size={16} /> Use camera</Button>
              <Button variant="secondary" disabled={!consent} onClick={() => fileRef.current?.click()}><Upload size={16} /> Upload a photo</Button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} aria-label="Upload a photo" />
            </div>
          </Card>
          <div className="text-center">
            <Button variant="ghost" onClick={manual}><PenLine size={16} /> Skip and enter manually</Button>
          </div>
        </div>
      )}

      {mode === "camera" && (
        <div className="mt-10">
          <CameraCapture onCapture={run} onCancel={() => setMode("choose")} />
        </div>
      )}

      {mode === "analysing" && (
        <div className="mt-10 space-y-4" aria-busy="true">
          <Skeleton className="mx-auto h-64 w-64" />
          <p className="text-center text-sm text-taupe">Analysing on your device…</p>
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {mode === "confirm" && (
        <div className="mt-10 space-y-5">
          <Card className="p-6">
            <div className="flex flex-col gap-6 sm:flex-row">
              {preview && (
                <div className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Your photo (kept on this device only)" className="h-40 w-40 -scale-x-100 rounded-2xl object-cover" />
                  <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={retake}><RefreshCw size={14} /> Retake photo</Button>
                </div>
              )}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl">{detected ? "Detected attributes" : "Your appearance"}</h2>
                  {detected && <Badge tone="sage">Estimated · edit if needed</Badge>}
                </div>
                {!detected && <p className="text-sm text-taupe">Choose what matches you best. Not sure of your undertone? Pick Uncertain.</p>}
                <Select label="Face shape" value={faceShape} options={FACE_SHAPES} onChange={setFaceShape} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select label="Skin tone" value={skinTone} options={SKIN_TONES} onChange={setSkinTone} />
                  <Select label="Undertone" value={undertone} options={UNDERTONES} onChange={setUndertone} />
                </div>
              </div>
            </div>
            {warnings.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 rounded-2xl bg-amber-50 p-3 pl-7 text-xs text-amber-900">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
          </Card>

          <Card className="space-y-4 p-6 text-sm">
            <h3 className="text-xl">What this means for your style</h3>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-taupe">Colours that suit you</p>
              <div className="flex flex-wrap gap-2">
                {sug.clothingColours.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-beige-deep bg-ivory px-3 py-1 text-xs">
                    <span className="h-3 w-3 rounded-full border border-charcoal/20" style={{ background: COLOUR_HEX[c.toLowerCase()] ?? "#999" }} />{c}
                  </span>
                ))}
              </div>
              {sug.avoidColours.length > 0 && <p className="mt-2 text-xs text-taupe">Use sparingly: {sug.avoidColours.join(", ")}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-taupe">Hairstyles</p><ul className="space-y-0.5">{sug.hairstyles.map((h) => <li key={h}>{h}</li>)}</ul></div>
              <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-taupe">Eyewear</p><ul className="space-y-0.5">{sug.eyewear.map((h) => <li key={h}>{h}</li>)}</ul></div>
              <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-taupe">Accessories</p><ul className="space-y-0.5">{sug.accessories.map((h) => <li key={h}>{h}</li>)}</ul></div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={retake}>Back</Button>
            <Button size="lg" onClick={proceed}>Looks right, continue <ArrowRight size={18} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
