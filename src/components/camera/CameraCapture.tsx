"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Mounting this component is what requests camera access, and it is only mounted after the user
 * explicitly clicks "Use camera". Tracks are always stopped on capture, cancel or unmount.
 */
export function CameraCapture({ onCapture, onCancel }: { onCapture: (canvas: HTMLCanvasElement) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser doesn't support camera access. Upload a photo or enter details manually.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        setError(name === "NotAllowedError" ? "Camera permission was denied. You can allow it in your browser settings, upload a photo, or enter details manually." : "Couldn't start the camera. Upload a photo or enter details manually.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function snap() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(c);
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>{error}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={onCancel}>Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-charcoal">
        <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full -scale-x-100 object-cover" />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-ivory/80">Starting camera…</div>}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="h-[72%] w-[48%] rounded-[50%] border-2 border-dashed border-ivory/60" />
        </div>
      </div>
      <p className="text-center text-xs text-taupe">Face the camera in soft, even light. Remove sunglasses and keep your hair off your forehead if you can.</p>
      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={onCancel}><X size={16} /> Cancel</Button>
        <Button onClick={snap} disabled={!ready}><Camera size={16} /> Take photo</Button>
      </div>
    </div>
  );
}
