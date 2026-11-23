"use client";

/**
 * On-device appearance analysis with MediaPipe Face Landmarker.
 * - The image never leaves the browser; nothing is uploaded or stored.
 * - We only estimate face shape (geometry), skin depth and undertone (pixel colour). Nothing else is inferred:
 *   no ethnicity, race, identity, age, health or emotion.
 * - Thresholds below are heuristics. They are exposed as constants so you can tune them, and the UI always
 *   lets the user correct every result manually.
 */
import type { FaceLandmarker as FaceLandmarkerType, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { Appearance, FaceShape, SkinTone, Undertone } from "@/types";

const WASM_BASE =
  process.env.NEXT_PUBLIC_MEDIAPIPE_WASM_URL ?? "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL =
  process.env.NEXT_PUBLIC_MEDIAPIPE_MODEL_URL ??
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Face Mesh landmark indices
const IDX = {
  top: 10,
  chin: 152,
  cheekL: 234,
  cheekR: 454,
  jawL: 172,
  jawR: 397,
  foreheadL: 103,
  foreheadR: 332,
  nose: 1,
  // skin sampling spots (cheeks + forehead centre)
  skin: [50, 280, 205, 425, 151],
};

export const SHAPE_THRESHOLDS = {
  oblongLength: 1.38, // face length / cheekbone width
  heartForeheadMinusJaw: 0.15,
  diamondMax: 0.78, // forehead AND jaw narrower than this fraction of cheek width
  squareJaw: 0.9,
  roundLengthMax: 1.2,
};

export interface FaceAnalysisResult {
  appearance: Pick<Appearance, "faceShape" | "skinTone" | "undertone" | "confidence">;
  warnings: string[];
  metrics: { lengthRatio: number; jawRatio: number; foreheadRatio: number; skinL: number; hue: number };
}

export class FaceAnalysisError extends Error {}

let landmarkerPromise: Promise<FaceLandmarkerType> | null = null;

async function getLandmarker(): Promise<FaceLandmarkerType> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      const make = (delegate: "GPU" | "CPU") =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "IMAGE",
          numFaces: 2, // detect 2 so we can warn if more than one face is present
        });
      try {
        return await make("GPU");
      } catch {
        return await make("CPU");
      }
    })().catch((e) => {
      landmarkerPromise = null; // allow retry
      throw e;
    });
  }
  return landmarkerPromise;
}

const dist = (a: NormalizedLandmark, b: NormalizedLandmark, w: number, h: number) =>
  Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);

function classifyShape(L: number, J: number, F: number): FaceShape {
  const t = SHAPE_THRESHOLDS;
  if (L >= t.oblongLength) return "Oblong";
  if (F - J >= t.heartForeheadMinusJaw) return "Heart";
  if (F <= t.diamondMax && J <= t.diamondMax) return "Diamond";
  if (J >= t.squareJaw && L < t.oblongLength) return "Square";
  if (L < t.roundLengthMax && J < t.squareJaw) return "Round";
  return "Oval";
}

// sRGB -> CIE Lab (D65)
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function samplePatch(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): [number, number, number] | null {
  const half = Math.floor(size / 2);
  const sx = Math.max(0, Math.round(x) - half);
  const sy = Math.max(0, Math.round(y) - half);
  const data = ctx.getImageData(sx, sy, size, size).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  return n ? [r / n, g / n, b / n] : null;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function classifySkin(L: number, hue: number): SkinTone {
  if (L >= 72) return "Fair";
  if (L >= 64) return "Light";
  if (L >= 55) return hue >= 60 ? "Olive" : "Medium";
  if (L >= 42) return "Tan";
  return "Deep";
}

function classifyUndertone(hue: number, lightingOk: boolean): Undertone {
  if (!lightingOk) return "Uncertain";
  if (hue >= 57) return "Warm";
  if (hue <= 48) return "Cool";
  return "Neutral";
}

export async function analyseFace(source: HTMLImageElement | HTMLCanvasElement): Promise<FaceAnalysisResult> {
  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!w || !h) throw new FaceAnalysisError("The image could not be read.");

  let landmarker: FaceLandmarkerType;
  try {
    landmarker = await getLandmarker();
  } catch {
    throw new FaceAnalysisError("Couldn't load the on-device face model (check your connection). You can enter details manually instead.");
  }

  const result = landmarker.detect(source);
  const warnings: string[] = [];
  if (!result.faceLandmarks.length) throw new FaceAnalysisError("No face found. Use a well-lit, front-facing photo with your whole face visible.");
  if (result.faceLandmarks.length > 1) warnings.push("More than one face was detected; we analysed the most prominent one.");
  const lm = result.faceLandmarks[0];

  // Frontal check: nose should sit roughly midway between the cheekbones.
  const dl = dist(lm[IDX.nose], lm[IDX.cheekL], w, h);
  const dr = dist(lm[IDX.nose], lm[IDX.cheekR], w, h);
  const yawRatio = dl / dr;
  if (yawRatio < 0.8 || yawRatio > 1.25) warnings.push("Your face is turned to one side; face the camera straight on for a more reliable result.");

  const cheek = dist(lm[IDX.cheekL], lm[IDX.cheekR], w, h);
  const lengthRatio = dist(lm[IDX.top], lm[IDX.chin], w, h) / cheek;
  const jawRatio = dist(lm[IDX.jawL], lm[IDX.jawR], w, h) / cheek;
  const foreheadRatio = dist(lm[IDX.foreheadL], lm[IDX.foreheadR], w, h) / cheek;
  const faceShape = classifyShape(lengthRatio, jawRatio, foreheadRatio);

  // Skin colour from small patches on cheeks / forehead
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new FaceAnalysisError("Canvas is not available in this browser.");
  ctx.drawImage(source, 0, 0, w, h);
  const patch = Math.max(5, Math.round(cheek * 0.04));
  const labs: Array<[number, number, number]> = [];
  for (const i of IDX.skin) {
    const rgb = samplePatch(ctx, lm[i].x * w, lm[i].y * h, patch);
    if (rgb) labs.push(rgbToLab(...rgb));
  }
  if (labs.length < 3) throw new FaceAnalysisError("Couldn't sample skin colour from this photo.");
  const Ls = labs.map((l) => l[0]);
  const L = median(Ls);
  const a = median(labs.map((l) => l[1]));
  const bb = median(labs.map((l) => l[2]));
  const hue = (Math.atan2(bb, a) * 180) / Math.PI;

  const spread = Math.max(...Ls) - Math.min(...Ls);
  const lightingOk = L > 25 && L < 88 && spread < 18;
  if (!lightingOk) warnings.push("Lighting looks uneven or extreme, so undertone is marked Uncertain. Try soft daylight facing a window.");

  const skinTone = classifySkin(L, hue);
  const undertone = classifyUndertone(hue, lightingOk);
  const confidence = Math.round((0.5 + (lightingOk ? 0.2 : 0) + (warnings.length === 0 ? 0.1 : 0)) * 100) / 100;

  return {
    appearance: { faceShape, skinTone, undertone, confidence },
    warnings,
    metrics: {
      lengthRatio: Math.round(lengthRatio * 100) / 100,
      jawRatio: Math.round(jawRatio * 100) / 100,
      foreheadRatio: Math.round(foreheadRatio * 100) / 100,
      skinL: Math.round(L),
      hue: Math.round(hue),
    },
  };
}

/** Load a File/Blob or data URL into an HTMLImageElement, downscaled for speed. */
export async function loadImage(src: Blob | string, maxSide = 1024): Promise<HTMLCanvasElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new FaceAnalysisError("That file isn't a readable image."));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    if (typeof src !== "string") URL.revokeObjectURL(url);
  }
}
