"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./lang-provider";

interface ScanResult {
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
}

export function FoodScanner({ isPremium = false }: { isPremium?: boolean }) {
  const { T } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scannedToday, setScannedToday] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);

  const DAILY_LIMIT = isPremium ? 999 : 2;
  const canScan = scannedToday < DAILY_LIMIT;

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem("scanData");
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        setScannedToday(data.count);
      }
    }
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
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
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const mockMeals: ScanResult[] = [
        { meal: "Paneer with Roti", calories: 380, protein: 15, carbs: 35, fat: 18, timestamp: new Date().toISOString() },
        { meal: "Dal Rice", calories: 320, protein: 12, carbs: 45, fat: 8, timestamp: new Date().toISOString() },
      ];
      const result = mockMeals[0];
      setLastScan(result);
      const today = new Date().toISOString().split("T")[0];
      const newCount = scannedToday + 1;
      setScannedToday(newCount);
      localStorage.setItem("scanData", JSON.stringify({ date: today, count: newCount }));
      stopCamera();
    }
    setIsScanning(false);
  };

  return (
    <div style={{ padding: "20px", borderRadius: "8px", background: "var(--surface)" }}>
      <h3>{T({ en: "📷 Food Scanner", hi: "📷 भोजन स्कैनर" })}</h3>
      <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
        {isPremium ? "✅ Unlimited" : `${DAILY_LIMIT - scannedToday} scans remaining`}
      </p>
      {!showCamera && <button onClick={startCamera} style={{ padding: "10px 16px", background: "var(--consumer)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Start Camera</button>}
      {showCamera && (
        <>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: "250px", borderRadius: "6px", margin: "12px 0" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <button onClick={captureMeal} disabled={isScanning} style={{ marginRight: "8px", padding: "10px 16px", background: "var(--consumer)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Capture</button>
          <button onClick={stopCamera} style={{ padding: "10px 16px", background: "var(--line)", border: "none", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
        </>
      )}
      {lastScan && <p style={{ marginTop: "12px", color: "var(--clinical)" }}>✓ Logged: {lastScan.meal} ({lastScan.calories} kcal)</p>}
    </div>
  );
}
