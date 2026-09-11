"use client";

import { useRef, useState } from "react";
import { useLang } from "./lang-provider";
import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { UNIT_LABEL, formatQty, type PortionUnit } from "@/lib/portion";
import { track, trackScanTiming } from "@/lib/analytics";

/**
 * Photograph a plate, get every dish on it with a portion you can correct.
 *
 * The old scanner returned one dish and its calories. For an Indian meal
 * that isn't an approximation of the right answer, it's a different one:
 * a thali holding dal, two rotis, aloo sabzi and curd reported as "dal,
 * 220 kcal" is wrong by a factor of three. So the unit of recognition here
 * is the plate.
 *
 * Two design rules, and both are about not lying:
 *
 * 1. Confidence is always visible. AI food recognition is not accurate
 *    enough to be silent about it, and a flat number in a health app is a
 *    number someone will act on. "Medium confidence" costs nothing and is
 *    the truth.
 * 2. Every portion is editable before it's logged. The correction UI is in
 *    katoris and rotis rather than grams, because that is the unit the
 *    person actually served themselves in.
 *
 * The corrections are also the point. Each one is a human-labelled example
 * of real Indian food at a real portion — the dataset nobody else has, and
 * one that cannot be collected retroactively. Everything the user changes
 * is posted to /api/scan/correction before the meal is logged.
 *
 * Carries the same free-tier quota FoodScanner did — two scans a day,
 * unlimited on Poshan Home — because this replaces it as the Scan tab's
 * surface rather than sitting alongside it, and dropping the limit on the
 * way past would have quietly given away a paid feature. Counted in
 * localStorage under the same key FoodScanner used, so a user mid-day
 * keeps their remaining count instead of getting a fresh two. A
 * client-side counter is not a security boundary, but the vision call it
 * guards is already rate-limited server-side — what this enforces is the
 * product rule, not the spend.
 */

type DetectedItem = {
  id: string;
  name: { en: string; hi: string };
  qty: number;
  unit: PortionUnit;
  confidence: "high" | "medium" | "low";
  kcal: number;
  macros: { protein: number; carbohydrate: number; fat: number; fibre: number };
  text: { en: string; hi: string };
};

type ScanResponse =
  | { configured: false; reason: string }
  | { configured: true; retryable?: boolean; reason: string }
  | {
      configured: true;
      model: string;
      items: DetectedItem[];
      totals: { kcal: number; protein: number; carbohydrate: number; fat: number; fibre: number };
      plateConfidence: "high" | "medium" | "low";
    };

const CONFIDENCE_META = {
  high: { label: { en: "High", hi: "उच्च" }, color: "#4A7C4E" },
  medium: { label: { en: "Medium", hi: "मध्यम" }, color: "#D98324" },
  low: { label: { en: "Low", hi: "कम" }, color: "#C0392B" },
} as const;

/** The quantities a correction UI needs. Anything finer is false precision. */
const QTY_CHOICES = [0.5, 1, 1.5, 2, 3];

/** Free-tier scans per day. Matches the figure quoted in the upgrade copy. */
const FREE_DAILY_SCANS = 2;

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/** Reads the counter the same shape FoodScanner wrote, so a user who
 *  scanned today before this shipped keeps their remaining count rather
 *  than getting a fresh two. */
function readScanCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const stored = localStorage.getItem("scanData");
    if (!stored) return 0;
    const data = JSON.parse(stored);
    return data?.date === todayKey() ? Number(data.count) || 0 : 0;
  } catch {
    return 0;
  }
}

export function PlateScanner({
  portionScale = 1,
  isPremium = false,
}: {
  portionScale?: number;
  isPremium?: boolean;
}) {
  const { T, lang } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [original, setOriginal] = useState<DetectedItem[] | null>(null);
  const [plateConfidence, setPlateConfidence] = useState<"high" | "medium" | "low">("medium");
  const [message, setMessage] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const [scannedToday, setScannedToday] = useState(readScanCount);

  const remaining = isPremium ? Infinity : Math.max(0, FREE_DAILY_SCANS - scannedToday);
  const canScan = remaining > 0;

  function recordScan() {
    const next = scannedToday + 1;
    setScannedToday(next);
    try {
      localStorage.setItem("scanData", JSON.stringify({ date: todayKey(), count: next }));
    } catch {
      /* Storage blocked. The quota is a product rule, not a security one —
         losing the count costs a free scan, not anything that matters. */
    }
  }

  async function scan(file: File) {
    setBusy(true);
    setMessage(null);
    setLogged(false);
    const done = trackScanTiming();

    try {
      const image = await downscaleToBase64(file);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mimeType: "image/jpeg", portionScale }),
      });
      const data: ScanResponse = await res.json();

      if (!("items" in data)) {
        setMessage(data.reason);
        done("failed");
        return;
      }
      if (data.items.length === 0) {
        setMessage(
          T({
            en: "Nothing on the plate matched a dish Poshan holds real nutrition data for. Add the dishes by hand — the count is exact that way.",
            hi: "प्लेट में कुछ भी ऐसा नहीं मिला जिसका असली पोषण डेटा पोषण के पास हो। व्यंजन हाथ से जोड़ें — उससे गिनती सटीक रहती है।",
          })
        );
        /* Recognising nothing is a real outcome, not a missing one: if this
           path went unrecorded the success rate would be measured only
           against scans that already half-worked. */
        done("failed", { reason: "no_match" });
        return;
      }

      /* Counted only when the scan produced something usable. Charging a
         free scan for "recognised nothing" would bill the user for
         Poshan's own miss. */
      recordScan();
      setItems(data.items);
      setOriginal(data.items); // kept to diff against when the user corrects
      setPlateConfidence(data.plateConfidence);
      /* Item count and confidence only — never which dishes. */
      done("ok", { items: data.items.length, confidence: data.plateConfidence });
    } catch {
      setMessage(
        T({
          en: "The scan didn't go through. Try again, or add the dishes by hand.",
          hi: "स्कैन नहीं हो पाया। दोबारा कोशिश करें, या व्यंजन हाथ से जोड़ें।",
        })
      );
      done("failed", { reason: "network" });
    } finally {
      setBusy(false);
    }
  }

  function setQty(id: string, qty: number) {
    setItems((prev) =>
      prev?.map((it) => {
        if (it.id !== id) return it;
        const meal = MEAL_LIBRARY.find((m) => m.id === it.id);
        const base = meal?.kcal ?? it.kcal / Math.max(it.qty, 0.25);
        const scale = qty * portionScale;
        return {
          ...it,
          qty,
          kcal: Math.round(base * scale),
          macros: meal
            ? {
                protein: Math.round(meal.macros.protein * scale),
                carbohydrate: Math.round(meal.macros.carbohydrate * scale),
                fat: Math.round(meal.macros.fat * scale),
                fibre: Math.round(meal.macros.fibre * scale),
              }
            : it.macros,
          text: { en: formatQty(qty, it.unit, "en"), hi: formatQty(qty, it.unit, "hi") },
        };
      }) ?? null
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev?.filter((it) => it.id !== id) ?? null);
  }

  /** Diffs the corrected plate against what the model said, and records it. */
  async function saveCorrections() {
    if (!original || !items) return;

    const corrections = [];
    for (const before of original) {
      const after = items.find((i) => i.id === before.id);
      if (!after) {
        corrections.push({
          kind: "removed",
          predictedDishId: before.id,
          predictedQty: before.qty,
          predictedConfidence: before.confidence,
          actualDishId: null,
          actualQty: null,
        });
      } else if (after.qty !== before.qty) {
        corrections.push({
          kind: "requantified",
          predictedDishId: before.id,
          predictedQty: before.qty,
          predictedConfidence: before.confidence,
          actualDishId: after.id,
          actualQty: after.qty,
        });
      } else {
        /* Kept deliberately: a training set built only from mistakes
           teaches a model it is always wrong. */
        corrections.push({
          kind: "confirmed",
          predictedDishId: before.id,
          predictedQty: before.qty,
          predictedConfidence: before.confidence,
          actualDishId: after.id,
          actualQty: after.qty,
        });
      }
    }

    if (corrections.length === 0) return;
    const changed = corrections.filter((c) => c.kind !== "confirmed").length;
    if (changed > 0) track("scan_corrected", { changed, total: corrections.length });
    track("plate_logged", { items: items.length });
    try {
      await fetch("/api/scan/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corrections }),
      });
    } catch {
      /* A lost correction must never block the user's actual goal, which
         is logging their meal. */
    }
  }

  const totals = (items ?? []).reduce(
    (a, i) => ({
      kcal: a.kcal + i.kcal,
      protein: a.protein + i.macros.protein,
      carbohydrate: a.carbohydrate + i.macros.carbohydrate,
      fat: a.fat + i.macros.fat,
      fibre: a.fibre + i.macros.fibre,
    }),
    { kcal: 0, protein: 0, carbohydrate: 0, fat: 0, fibre: 0 }
  );

  return (
    <section className="w-full grid gap-5">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void scan(f);
          e.target.value = "";
        }}
      />

      {!items && !canScan && (
        <div className="rounded-2xl py-8 px-6 text-center" style={{ background: "var(--roti-2)" }}>
          <div className="text-[1rem] font-medium">
            {T({
              en: "You've used today's 2 free scans.",
              hi: "आपने आज के 2 मुफ़्त स्कैन उपयोग कर लिए हैं।",
            })}
          </div>
          <p className="text-[0.86rem] mt-1.5" style={{ color: "var(--ink-soft)" }}>
            {T({
              en: "Poshan Home scans as many plates as you eat. You can still add dishes by hand any time — the count is exact that way.",
              hi: "पोषण होम में जितनी थालियाँ खाएँ उतनी स्कैन करें। आप कभी भी व्यंजन हाथ से जोड़ सकते हैं — उससे गिनती सटीक रहती है।",
            })}
          </p>
        </div>
      )}

      {!items && canScan && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-2xl py-8 px-6 text-center disabled:opacity-60"
          style={{ background: "var(--roti-2)", border: "1px dashed var(--line, rgba(0,0,0,0.2))" }}
        >
          <div className="text-[2rem] leading-none mb-2">📷</div>
          <div className="text-[1rem] font-medium">
            {busy
              ? T({ en: "Reading your plate…", hi: "आपकी थाली पढ़ रहे हैं…" })
              : T({ en: "Photograph your plate", hi: "अपनी थाली की तस्वीर लें" })}
          </div>
          <div className="text-[0.84rem] mt-1" style={{ color: "var(--ink-soft)" }}>
            {T({
              en: "Everything on it, not just the main dish",
              hi: "उस पर सब कुछ, सिर्फ़ मुख्य व्यंजन नहीं",
            })}
          </div>
          {!isPremium && (
            <div className="text-[0.76rem] mt-2" style={{ color: "var(--ink-soft)" }}>
              {remaining === 1
                ? T({ en: "1 free scan left today", hi: "आज 1 मुफ़्त स्कैन बचा" })
                : T({ en: `${remaining} free scans left today`, hi: `आज ${remaining} मुफ़्त स्कैन बचे` })}
            </div>
          )}
        </button>
      )}

      {message && (
        <p
          className="rounded-xl p-4 text-[0.88rem]"
          style={{ background: "var(--roti-2)", color: "var(--ink-soft)" }}
        >
          {message}
        </p>
      )}

      {items && (
        <div className="grid gap-4">
          {/* ------------------------------------------ plate confidence */}
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: "var(--roti-2)" }}
          >
            <div>
              <div className="text-[0.76rem] uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
                {T({ en: "Portion confidence", hi: "मात्रा का भरोसा" })}
              </div>
              <div
                className="text-[1rem] font-semibold"
                style={{ color: CONFIDENCE_META[plateConfidence].color }}
              >
                {T(CONFIDENCE_META[plateConfidence].label)}
              </div>
            </div>
            <p className="text-[0.78rem] text-right max-w-[24ch]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: "Check the amounts below and fix any that are off.",
                hi: "नीचे मात्रा जाँचें और ग़लत हो तो ठीक करें।",
              })}
            </p>
          </div>

          {/* ------------------------------------------------- the items */}
          <ul className="list-none p-0 m-0 grid gap-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl p-4" style={{ background: "var(--roti-2)" }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.98rem] font-medium">{T(item.name)}</span>
                  <span
                    className="text-[0.72rem] px-2 py-[2px] rounded-full shrink-0"
                    style={{
                      color: CONFIDENCE_META[item.confidence].color,
                      border: `1px solid ${CONFIDENCE_META[item.confidence].color}`,
                    }}
                  >
                    {T(CONFIDENCE_META[item.confidence].label)}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {QTY_CHOICES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQty(item.id, q)}
                      aria-pressed={item.qty === q}
                      className="rounded-full px-2.5 py-1 text-[0.8rem] tabular-nums"
                      style={{
                        background: item.qty === q ? "var(--kesar)" : "var(--roti)",
                        color: item.qty === q ? "var(--roti)" : "inherit",
                        border: `1px solid ${item.qty === q ? "var(--kesar)" : "var(--line, rgba(0,0,0,0.12))"}`,
                        fontFamily: "var(--font-data)",
                      }}
                    >
                      {formatQty(q, item.unit, lang)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="ml-auto text-[0.78rem] underline underline-offset-2"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {T({ en: "not on my plate", hi: "मेरी थाली में नहीं" })}
                  </button>
                </div>

                <div
                  className="mt-2 text-[0.8rem] tabular-nums"
                  style={{ color: "var(--ink-soft)", fontFamily: "var(--font-data)" }}
                >
                  {item.kcal} kcal · {item.macros.protein}g {T({ en: "protein", hi: "प्रोटीन" })}
                </div>
              </li>
            ))}
          </ul>

          {/* ---------------------------------------------- plate totals */}
          <div className="rounded-2xl p-5" style={{ background: "var(--roti-2)" }}>
            <div className="text-[0.76rem] uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
              {T({ en: "Estimated plate", hi: "अनुमानित थाली" })}
            </div>
            <div
              className="text-[2.2rem] leading-none tabular-nums mt-1"
              style={{ fontFamily: "var(--font-data)" }}
            >
              {totals.kcal}
              <span className="text-[1rem] ml-1" style={{ color: "var(--ink-soft)" }}>
                kcal
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {(
                [
                  ["protein", { en: "Protein", hi: "प्रोटीन" }],
                  ["carbohydrate", { en: "Carbs", hi: "कार्ब्स" }],
                  ["fat", { en: "Fat", hi: "वसा" }],
                  ["fibre", { en: "Fibre", hi: "रेशा" }],
                ] as const
              ).map(([k, label]) => (
                <div key={k}>
                  <div
                    className="text-[1.05rem] tabular-nums"
                    style={{ fontFamily: "var(--font-data)" }}
                  >
                    {totals[k]}g
                  </div>
                  <div className="text-[0.72rem]" style={{ color: "var(--ink-soft)" }}>
                    {T(label)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || logged}
              onClick={async () => {
                setBusy(true);
                await saveCorrections();
                setLogged(true);
                setBusy(false);
              }}
              className="rounded-full px-5 py-2.5 text-[0.9rem] font-semibold disabled:opacity-50"
              style={{ background: "var(--kesar)", color: "var(--roti)" }}
            >
              {logged
                ? T({ en: "Logged ✓", hi: "दर्ज ✓" })
                : T({ en: "Log this plate", hi: "यह थाली दर्ज करें" })}
            </button>
            <button
              type="button"
              onClick={() => {
                setItems(null);
                setOriginal(null);
                setMessage(null);
                setLogged(false);
              }}
              className="rounded-full px-4 py-2.5 text-[0.9rem]"
              style={{ color: "var(--ink-soft)" }}
            >
              {T({ en: "Scan another", hi: "दूसरी स्कैन करें" })}
            </button>
          </div>

          <p className="text-[0.76rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            {T({
              en: "Portions are estimated from the photo and your calibrated katori. They are an estimate, not a measurement — the corrections you make here are what improve them.",
              hi: "मात्राएँ तस्वीर और आपकी मापी हुई कटोरी से अनुमानित हैं। ये अनुमान हैं, माप नहीं — आपकी यहाँ की गई सुधार ही इन्हें बेहतर बनाते हैं।",
            })}
          </p>
        </div>
      )}
    </section>
  );
}

/** Downscale in the browser so a 12MP phone photo doesn't become a 6MB
 *  base64 payload — the same ~900px cap the old scanner used. */
async function downscaleToBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const MAX = 900;
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
}

export { UNIT_LABEL };
