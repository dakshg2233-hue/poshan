"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Camera } from "lucide-react";
import { useProfile } from "@/lib/hooks/use-profile";

const MAX_EDGE = 900;

const SCALE_LABEL: Record<number, string> = {
  0.75: "Smaller than standard",
  1: "Standard size",
  1.25: "Larger than standard",
  1.5: "Much larger than standard",
};

/**
 * A one-time (or occasional) calibration: photograph your usual bowl next
 * to a ₹10 coin, and Poshan estimates how your actual katori compares to
 * the standard portion MEAL_LIBRARY's macros assume. This never changes
 * which dish gets recommended — only annotates the displayed kcal total
 * on the Today card with a number closer to your real bowl. An estimate
 * stated as one, with a manual override always available underneath it.
 */
export function PortionCalibration() {
  const { profile, updateProfile } = useProfile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const currentScale = profile?.portion_scale ?? 1;

  async function startCamera() {
    setStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch {
      setStatus("Camera access denied.");
    }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    setShowCamera(false);
  }

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    setBusy(true);
    setStatus(null);
    setSuggested(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    stopCamera();

    try {
      const res = await fetch("/api/portion-calibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (data.configured === false || data.matched === false) {
        setStatus(data.reason ?? "Couldn't read that photo.");
      } else if (data.retryable) {
        setStatus(data.reason);
      } else if (data.matched) {
        setSuggested(data.suggestedScale);
        setNote(data.note ?? null);
      } else {
        setStatus("Something went wrong.");
      }
    } catch {
      setStatus("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function saveScale(scale: number) {
    setBusy(true);
    try {
      await updateProfile({ portion_scale: scale });
      setSuggested(null);
      setStatus(`Saved — using ${SCALE_LABEL[scale]?.toLowerCase() ?? scale}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <Ruler className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Calibrate your katori
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">
          Photograph your usual bowl next to a ₹10 coin. Poshan compares the two to estimate your real portion size — an
          estimate, not a lab measurement, and it never changes which dish gets recommended.
        </p>

        <p className="mb-3 text-xs text-[var(--ink-soft)]">
          Currently using: <strong style={{ color: "var(--ink)" }}>{SCALE_LABEL[currentScale] ?? `${currentScale}×`}</strong>
        </p>

        {!showCamera && (
          <button
            onClick={startCamera}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--kesar-fill)" }}
          >
            <Camera className="h-4 w-4" /> Take a photo
          </button>
        )}

        {showCamera && (
          <div className="panel-in" data-no-swipe>
            <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: 220, borderRadius: 8, margin: "8px 0" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="flex gap-2">
              <button
                onClick={capture}
                disabled={busy}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--kesar-fill)" }}
              >
                {busy ? "Reading…" : "Capture"}
              </button>
              <button onClick={stopCamera} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {suggested !== null && (
          <div className="mt-3 rounded-lg p-3" style={{ background: "var(--roti-2, var(--roti))" }}>
            <p className="text-sm" style={{ color: "var(--ink)" }}>
              Looks like: <strong>{SCALE_LABEL[suggested] ?? `${suggested}×`}</strong>
            </p>
            {note && <p className="mt-1 text-xs text-[var(--ink-soft)]">{note}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {[0.75, 1, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  onClick={() => saveScale(s)}
                  disabled={busy}
                  className="rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: s === suggested ? "var(--kesar-fill)" : "var(--surface)",
                    color: s === suggested ? "#fff" : "var(--ink-soft)",
                    border: "1px solid var(--line)",
                  }}
                >
                  {SCALE_LABEL[s]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--ink-soft)]">Not quite right? Tap the size that actually matches your bowl instead.</p>
          </div>
        )}

        {status && <p className="mt-2 text-xs text-[var(--ink-soft)]">{status}</p>}
      </CardContent>
    </Card>
  );
}
