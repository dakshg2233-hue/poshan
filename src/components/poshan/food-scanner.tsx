"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useLang, useReveal } from "./lang-provider";
import { FoodMark } from "./meal-library";
import {
  MEAL_LIBRARY,
  NUTRIENT,
  CATEGORY_LABEL,
  type MealPlanItem,
} from "@/lib/poshan-data";

type Mode = "idle" | "camera" | "captured";

/** Downscale before upload: a 3000px phone photo is pointless over the wire. */
function shrink(source: HTMLVideoElement | HTMLImageElement, max = 900) {
  const w = "videoWidth" in source ? source.videoWidth : source.naturalWidth;
  const h = "videoHeight" in source ? source.videoHeight : source.naturalHeight;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function FoodScanner() {
  const { T, lang } = useLang();
  const reveal = useReveal<HTMLDivElement>();

  const [mode, setMode] = useState<Mode>("idle");
  const [shot, setShot] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setMode("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setNote(
        T({
          en: "The camera isn't available here — upload a photo instead.",
          hi: "यहाँ कैमरा उपलब्ध नहीं है — इसके बजाय फ़ोटो अपलोड करें।",
        })
      );
    }
  }

  function capture() {
    if (!videoRef.current) return;
    const data = shrink(videoRef.current);
    stopCamera();
    setShot(data);
    setMode("captured");
    void autoDetect(data);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const data = shrink(img);
        setShot(data);
        setMode("captured");
        void autoDetect(data);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  /** Ask the server to recognise the plate. Silent, optional enhancement. */
  async function autoDetect(dataUrl: string) {
    setScanning(true);
    setNote(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl.split(",")[1], mimeType: "image/jpeg" }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.ids) && json.ids.length) {
        setPicked(json.ids);
        setNote(
          T({
            en: `Recognised ${json.ids.length} ${json.ids.length === 1 ? "dish" : "dishes"}. Correct anything that's wrong.`,
            hi: `${json.ids.length} व्यंजन पहचाने गए। जो ग़लत हो उसे ठीक करें।`,
          })
        );
      } else if (res.status === 503) {
        setNote(
          T({
            en: "Automatic recognition is off — tap the dishes on your plate and the count is exact all the same.",
            hi: "स्वतः पहचान बंद है — अपनी थाली के व्यंजन चुनें, गिनती फिर भी सटीक रहेगी।",
          })
        );
      } else if (res.status === 429) {
        /* Transient, and the server already phrased it for the visitor. */
        setNote(
          json.reason ??
            T({
              en: "Recognition is busy. Wait a moment, or tap the dishes yourself.",
              hi: "पहचान व्यस्त है। थोड़ा रुकें, या ख़ुद व्यंजन चुनें।",
            })
        );
      } else {
        setNote(
          T({
            en: "Recognition didn't return anything. Tap the dishes on your plate.",
            hi: "पहचान से कुछ नहीं मिला। अपनी थाली के व्यंजन चुनें।",
          })
        );
      }
    } catch {
      setNote(
        T({
          en: "Couldn't reach recognition. Tap the dishes on your plate.",
          hi: "पहचान तक नहीं पहुँच सके। अपनी थाली के व्यंजन चुनें।",
        })
      );
    } finally {
      setScanning(false);
    }
  }

  function reset() {
    stopCamera();
    setShot(null);
    setPicked([]);
    setNote(null);
    setQuery("");
    setMode("idle");
  }

  const chosen = useMemo(
    () => picked.map((id) => MEAL_LIBRARY.find((m) => m.id === id)).filter(Boolean) as MealPlanItem[],
    [picked]
  );

  const total = useMemo(
    () =>
      chosen.reduce(
        (a, m) => ({
          kcal: a.kcal + m.kcal,
          protein: a.protein + m.macros.protein,
          carbohydrate: a.carbohydrate + m.macros.carbohydrate,
          fat: a.fat + m.macros.fat,
          fibre: a.fibre + m.macros.fibre,
        }),
        { kcal: 0, protein: 0, carbohydrate: 0, fat: 0, fibre: 0 }
      ),
    [chosen]
  );

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MEAL_LIBRARY;
    return MEAL_LIBRARY.filter(
      (m) => m.name.en.toLowerCase().includes(q) || m.name.hi.includes(query.trim())
    );
  }, [query]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <section id="scan" className="py-14 md:py-24" style={{ background: "var(--roti-2)" }}>
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div ref={reveal} className="rise">
          <div className="max-w-[56ch] mb-9">
            <div className="shiro w-[72px] mb-5" />
            <h2
              className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({ en: "Photograph your thali. Get the numbers.", hi: "अपनी थाली की फ़ोटो लें। आँकड़े पाएँ।" })}
            </h2>
            <p className="mt-4 text-[1.02rem]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: "Take a picture or upload one, then confirm what's on the plate. Calories and nutrients come from the same measured data behind every plan on this page — no estimates.",
                hi: "फ़ोटो लें या अपलोड करें, फिर बताएँ थाली में क्या है। कैलोरी और पोषक तत्व उसी मापे गए डेटा से आते हैं जो इस पेज के हर प्लान के पीछे है — कोई अंदाज़ा नहीं।",
              })}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 items-start">
            {/* ---------------- capture ---------------- */}
            <div
              className="surface-card rounded-2xl overflow-hidden"
            >
              <div
                className="on-panel relative aspect-[4/3] grid place-items-center"
                style={{ background: "var(--panel)" }}
              >
                {mode === "camera" && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {mode === "captured" && shot && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={shot} alt={T({ en: "Your meal", hi: "आपका भोजन" })} className="absolute inset-0 w-full h-full object-cover" />
                )}
                {mode === "idle" && (
                  <div className="text-center px-6">
                    <svg viewBox="0 0 24 24" aria-hidden className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.55 }}>
                      <path
                        d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4Z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                        fill="none"
                        stroke="var(--roti)"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-[0.86rem]" style={{ color: "color-mix(in srgb, var(--roti) 62%, transparent)" }}>
                      {T({ en: "Camera or upload", hi: "कैमरा या अपलोड" })}
                    </p>
                  </div>
                )}
                {scanning && (
                  <div
                    className="absolute inset-0 grid place-items-center"
                    style={{ background: "color-mix(in srgb, #000 55%, transparent)" }}
                  >
                    <span className="loader" />
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-wrap gap-2.5">
                {mode === "idle" && (
                  <>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full font-extrabold text-[0.9rem] cursor-pointer"
                      style={{ background: "var(--kesar-fill)", color: "#fff" }}
                    >
                      {T({ en: "Open camera", hi: "कैमरा खोलें" })}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full font-extrabold text-[0.9rem] cursor-pointer"
                      style={{ border: "1.5px solid var(--ink)", color: "var(--ink)" }}
                    >
                      {T({ en: "Upload a photo", hi: "फ़ोटो अपलोड करें" })}
                    </button>
                  </>
                )}
                {mode === "camera" && (
                  <button
                    type="button"
                    onClick={capture}
                    className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full font-extrabold text-[0.9rem] cursor-pointer"
                    style={{ background: "var(--kesar-fill)", color: "#fff" }}
                  >
                    {T({ en: "Take the picture", hi: "तस्वीर लें" })}
                  </button>
                )}
                {mode === "captured" && (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full font-extrabold text-[0.9rem] cursor-pointer"
                    style={{ border: "1.5px solid var(--ink)", color: "var(--ink)" }}
                  >
                    {T({ en: "Start again", hi: "फिर से शुरू करें" })}
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onFile}
                  className="sr-only"
                  aria-label={T({ en: "Upload a meal photo", hi: "भोजन की फ़ोटो अपलोड करें" })}
                />
              </div>

              {note && (
                <p
                  className="px-4 pb-4 text-[0.83rem]"
                  style={{ color: "var(--ink-soft)" }}
                  role="status"
                >
                  {note}
                </p>
              )}
            </div>

            {/* ---------------- count ---------------- */}
            <div
              className="surface-card rounded-2xl p-5"
            >
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <p
                    className="text-[0.68rem] font-extrabold uppercase"
                    style={{ letterSpacing: "0.14em", color: "var(--ink-soft)" }}
                  >
                    {T({ en: "On this plate", hi: "इस थाली में" })}
                  </p>
                  <p
                    className="text-[2.6rem] leading-none tabular-nums mt-1"
                    style={{ fontFamily: "var(--font-data)", fontWeight: 500 }}
                    aria-live="polite"
                  >
                    {total.kcal.toLocaleString("en-IN")}
                    <span className="text-[0.9rem] ml-1.5" style={{ color: "var(--ink-soft)" }}>
                      {T({ en: "kcal", hi: "किलोकैलोरी" })}
                    </span>
                  </p>
                </div>
                {chosen.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPicked([])}
                    className="text-[0.8rem] font-semibold underline cursor-pointer min-h-11"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {T({ en: "Clear", hi: "हटाएँ" })}
                  </button>
                )}
              </div>

              <dl
                className="grid grid-cols-2 gap-x-4 gap-y-1.5 pb-4 mb-4 text-[0.8rem]"
                style={{ borderBottom: "1px solid var(--line)", color: "var(--ink-soft)" }}
              >
                {(["protein", "carbohydrate", "fat", "fibre"] as const).map((n) => (
                  <div key={n} className="flex justify-between gap-2">
                    <dt>{T(NUTRIENT[n])}</dt>
                    <dd style={{ fontFamily: "var(--font-data)" }}>{total[n]} g</dd>
                  </div>
                ))}
              </dl>

              <label className="sr-only" htmlFor="dish-search">
                {T({ en: "Search dishes", hi: "व्यंजन खोजें" })}
              </label>
              <input
                id="dish-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={T({ en: "Search dishes…", hi: "व्यंजन खोजें…" })}
                className="w-full min-h-11 px-3.5 rounded-xl mb-3 text-[0.88rem]"
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--roti-2)",
                  color: "var(--ink)",
                }}
              />

              <ul className="grid gap-1.5 list-none p-0 m-0 max-h-[260px] overflow-y-auto">
                {options.map((m) => {
                  const on = picked.includes(m.id);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(m.id)}
                        className="w-full flex items-center gap-2.5 text-left px-3 min-h-11 rounded-xl text-[0.86rem] cursor-pointer transition-colors"
                        style={
                          on
                            ? { background: "var(--kesar-fill)", color: "#fff" }
                            : { border: "1px solid var(--line)", color: "var(--ink)" }
                        }
                      >
                        <FoodMark category={m.category} size={15} />
                        <span className="flex-1 min-w-0 truncate" lang={lang === "hi" ? "hi" : undefined}>
                          {T(m.name)}
                        </span>
                        <span
                          className="text-[0.76rem] tabular-nums shrink-0"
                          style={{ fontFamily: "var(--font-data)", opacity: on ? 0.9 : 0.6 }}
                        >
                          {m.kcal}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {options.length === 0 && (
                  <li className="text-[0.84rem] py-3" style={{ color: "var(--ink-soft)" }}>
                    {T({ en: "Nothing matches that name.", hi: "इस नाम से कुछ नहीं मिला।" })}
                  </li>
                )}
              </ul>

              {chosen.length > 0 && (
                <p className="text-[0.78rem] mt-3" style={{ color: "var(--ink-soft)" }}>
                  {chosen.map((c) => `${T(c.name)} (${T(CATEGORY_LABEL[c.category])})`).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
