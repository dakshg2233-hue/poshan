"use client";

import { useRef, useState } from "react";
import { useLang } from "./lang-provider";
import { MEAL_LIBRARY } from "@/lib/poshan-data";

interface ScanResult {
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
}

/** Longest edge the captured frame is downscaled to before upload. Keeps the
 * payload well under the server's 6MB cap and the request fast. */
const MAX_EDGE = 900;

type ScanApiResponse =
  | { configured: false; reason: string }
  | { configured: true; retryable: true; reason: string }
  | { configured: true; model: string; ids: string[] }
  | { error: string; detail?: string };

export function FoodScanner({
  isPremium = false,
  onScanned,
}: {
  isPremium?: boolean;
  /** Fired with the matched MEAL_LIBRARY id right after a successful scan,
   * so a caller (e.g. the condition checker) can react to what was found
   * without this component needing to know anything about conditions. */
  onScanned?: (mealId: string) => void;
}) {
  const { T } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [scannedToday, setScannedToday] = useState(() => {
    if (typeof window === "undefined") return 0;
    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem("scanData");
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) return data.count;
    }
    return 0;
  });
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const DAILY_LIMIT = isPremium ? 999 : 2;
  const canScan = scannedToday < DAILY_LIMIT;

  const recordScan = () => {
    const today = new Date().toISOString().split("T")[0];
    const newCount = scannedToday + 1;
    setScannedToday(newCount);
    localStorage.setItem("scanData", JSON.stringify({ date: today, count: newCount }));
  };

  const startCamera = async () => {
    if (!canScan) return;
    setStatusMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch {
      alert(T({ en: "Camera access denied", hi: "कैमरा पहुँच अस्वीकार" }));
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      setShowCamera(false);
    }
  };

  const captureMeal = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsScanning(true);
    setStatusMessage(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsScanning(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    stopCamera();

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: "image/jpeg" }),
      });
      const data: ScanApiResponse = await res.json();

      if ("configured" in data && data.configured === false) {
        setStatusMessage(data.reason);
      } else if ("retryable" in data && data.retryable) {
        setStatusMessage(data.reason);
      } else if ("ids" in data) {
        recordScan();
        const meal = data.ids.length > 0 ? MEAL_LIBRARY.find((m) => m.id === data.ids[0]) : undefined;
        if (meal) {
          setLastScan({
            meal: meal.name.en,
            calories: meal.kcal,
            protein: meal.macros.protein,
            carbs: meal.macros.carbohydrate,
            fat: meal.macros.fat,
            timestamp: new Date().toISOString(),
          });
          onScanned?.(meal.id);
        } else {
          setStatusMessage(
            T({
              en: "Couldn't match this to a dish in the library. Log it by hand from the meal list instead.",
              hi: "इसे भोजन पुस्तकालय से मिलान नहीं कर सका। कृपया इसे भोजन सूची से मैन्युअल रूप से लॉग करें।",
            })
          );
        }
      } else {
        setStatusMessage("error" in data ? data.error : T({ en: "Scan failed. Try again.", hi: "स्कैन विफल। पुनः प्रयास करें।" }));
      }
    } catch {
      setStatusMessage(T({ en: "Couldn't reach the server. Check your connection and try again.", hi: "सर्वर तक नहीं पहुँच सका। कनेक्शन जाँचें और पुनः प्रयास करें।" }));
    }

    setIsScanning(false);
  };

  return (
    <div style={{ padding: "20px", borderRadius: "8px", background: "var(--surface)" }}>
      <h3>{T({ en: "📷 Food Scanner", hi: "📷 भोजन स्कैनर" })}</h3>
      <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
        {isPremium ? "✅ Unlimited" : `${Math.max(0, DAILY_LIMIT - scannedToday)} scans remaining`}
      </p>
      {!showCamera && canScan && (
        <button onClick={startCamera} style={{ padding: "10px 16px", background: "var(--kesar-fill)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
          {T({ en: "Start Camera", hi: "कैमरा शुरू करें" })}
        </button>
      )}
      {!showCamera && !canScan && (
        <div>
          <p style={{ color: "var(--ink-soft)" }}>
            {T({ en: "You've used today's 2 free scans.", hi: "आपने आज के 2 मुफ़्त स्कैन उपयोग कर लिए हैं।" })}
          </p>
          <p style={{ fontWeight: 600 }}>
            {T({ en: "Upgrade to Poshan Home for unlimited scans.", hi: "असीमित स्कैन के लिए Poshan Home में अपग्रेड करें।" })}
          </p>
        </div>
      )}
      {showCamera && (
        // A fragment can't carry a class, and this mode-switch — camera
        // replacing the start button — is exactly the "jarring change"
        // panel-in exists to bridge.
        <div className="panel-in" data-no-swipe>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: "250px", borderRadius: "6px", margin: "12px 0" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <button onClick={captureMeal} disabled={isScanning} style={{ marginRight: "8px", padding: "10px 16px", background: "var(--kesar-fill)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            {isScanning ? T({ en: "Identifying…", hi: "पहचान हो रही है…" }) : T({ en: "Capture", hi: "कैप्चर" })}
          </button>
          <button onClick={stopCamera} style={{ padding: "10px 16px", background: "var(--line)", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            {T({ en: "Cancel", hi: "रद्द करें" })}
          </button>
        </div>
      )}
      {lastScan && (
        // Keyed by timestamp so a second scan remounts this paragraph rather
        // than patching its text in place — the confirmation is feedback for
        // THIS scan, and should replay every time, not just the first.
        <p key={lastScan.timestamp} className="card-in" style={{ marginTop: "12px", color: "var(--clinical)" }}>
          ✓ {T({ en: "Logged", hi: "लॉग किया गया" })}: {lastScan.meal} ({lastScan.calories} kcal)
        </p>
      )}
      {statusMessage && (
        <p style={{ marginTop: "12px", color: "var(--ink-soft)", fontSize: "0.9rem" }}>{statusMessage}</p>
      )}
    </div>
  );
}
