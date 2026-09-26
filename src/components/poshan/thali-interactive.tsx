"use client";

import { useMemo } from "react";
import { useLang } from "./lang-provider";
import { GOALS, type Band, type GoalKey, type DietKey } from "@/lib/poshan-data";
import {
  estimateMaintenanceKcal,
  effectiveWeightKg,
  dailyTargetKcal,
  type Sex,
  type ActivityLevel,
} from "@/lib/energy-requirement";

/**
 * The interactive thali: portions that visibly change with the person.
 *
 * Ported from the POSHAN_Interactive_Thali_Model prototype, with its
 * portion engine kept and its energy engine deliberately dropped.
 *
 * The prototype computed its own maintenance calories with Mifflin–St Jeor
 * and shipped its own profile controls. Neither survives here, for the same
 * reason:
 *
 *  - Energy. `estimateMaintenanceKcal` already exists in this codebase and
 *    is sourced to the ICMR-NIN adult kcal/kg table rather than to a
 *    Western predictive equation — which for an Indian product is the whole
 *    point — and it returns null rather than guessing when age or activity
 *    is missing. A second, disagreeing calorie number inside a visual
 *    component is how two screens start telling one person two things.
 *  - Controls. The prototype carried its own age / sex / height / weight /
 *    activity / goal inputs. This page already has every one of them,
 *    directly below this component. Rendering a second set would duplicate
 *    the controls AND split which copy the rest of the page listens to.
 *
 * What is kept is the part that makes it a working model rather than a
 * picture: the per-meal scale, the portion rounding, and a plate whose
 * katoris actually resize.
 *
 * The Asian-Indian BMI arc stays around the plate. It is Poshan's entire
 * argument — 23, not 25 — and the prototype had no equivalent.
 */

export interface ThaliProfile {
  height: number;
  weight: number;
  goal: GoalKey;
  diet: DietKey;
  age?: number;
  sex?: Sex;
  activityLevel?: ActivityLevel;
}

/** Per-serving nutrition for the seven generic slots, from the prototype. */
const FOOD = {
  roti: { kcal: 110, p: 3, c: 18, f: 3, fibre: 3 },
  dal: { kcal: 150, p: 9, c: 20, f: 4, fibre: 6 },
  sabzi: { kcal: 120, p: 4, c: 14, f: 6, fibre: 5 },
  protein: { kcal: 160, p: 14, c: 8, f: 8, fibre: 2 },
  veg: { kcal: 35, p: 2, c: 7, f: 0.3, fibre: 3 },
  curd: { kcal: 90, p: 5, c: 7, f: 4, fibre: 0 },
  fruit: { kcal: 80, p: 1, c: 20, f: 0.2, fibre: 3 },
} as const;

type Slot = keyof typeof FOOD;

const BASE: Record<Slot, number> = {
  roti: 2,
  dal: 1,
  sabzi: 1,
  protein: 0.5,
  veg: 1,
  curd: 1,
  fruit: 1,
};

/** kcal one "reference" meal carries at scale 1.0 — the prototype's divisor. */
const REFERENCE_MEAL_KCAL = 780;

/** Meals a day. Fixed at three because that is what daily-engine.ts plans
 *  against; the prototype made it a slider, but this page has no such
 *  control and inventing one here would be a second source of truth. */
const MEALS_PER_DAY = 3;

const LABEL: Record<Slot, { en: string; hi: string }> = {
  roti: { en: "Roti", hi: "रोटी" },
  dal: { en: "Dal", hi: "दाल" },
  sabzi: { en: "Sabzi", hi: "सब्ज़ी" },
  protein: { en: "Protein", hi: "प्रोटीन" },
  veg: { en: "Salad", hi: "सलाद" },
  curd: { en: "Curd", hi: "दही" },
  fruit: { en: "Fruit", hi: "फल" },
};

/* The protein katori, named for what is actually in it. The prototype said
   "Protein" to everyone, which is a nutrient rather than a dish and reads
   like a supplement tub. Curd is also not curd on a vegan plate, so that
   slot moves too. */
const PROTEIN_LABEL: Record<DietKey, { en: string; hi: string }> = {
  veg: { en: "Paneer", hi: "पनीर" },
  nonveg: { en: "Chicken", hi: "चिकन" },
  vegan: { en: "Tofu", hi: "टोफू" },
  jain: { en: "Paneer", hi: "पनीर" },
};

const CURD_LABEL: Record<DietKey, { en: string; hi: string }> = {
  veg: { en: "Curd", hi: "दही" },
  nonveg: { en: "Curd", hi: "दही" },
  vegan: { en: "Soy curd", hi: "सोया दही" },
  jain: { en: "Curd", hi: "दही" },
};

function labelFor(slot: Slot, diet: DietKey): { en: string; hi: string } {
  if (slot === "protein") return PROTEIN_LABEL[diet];
  if (slot === "curd") return CURD_LABEL[diet];
  return LABEL[slot];
}

export function ThaliInteractive({
  profile,
  bmi,
  band,
}: {
  profile: ThaliProfile;
  bmi: number;
  band: Band;
}) {
  const { T, lang } = useLang();

  const model = useMemo(() => {
    const { height, weight, goal, age, sex, activityLevel } = profile;

    /* The exact figure when the profile supports one. */
    const measured =
      age !== undefined && sex && activityLevel
        ? estimateMaintenanceKcal(weight, age, sex, activityLevel, height)
        : null;

    /* And when it doesn't, still weight × kcal/kg — just at the midpoint of
       the ICMR table's two moderate-activity rows rather than at the row
       for a sex nobody has told us.

       The first version of this fell back to PLANS[band].kcal, a per-band
       constant, and that was wrong in a way worth naming: it meant a 45kg
       and a 70kg visitor — both "normal" — were shown the identical plate,
       so dragging the weight slider did nothing until you happened to cross
       a band edge. A model whose whole claim is "portions for YOUR body"
       has to move when the body does.

       ±4% is the entire spread between the male and female moderate rows
       (42 vs 39), which is smaller than the error in the fallback it
       replaces, and the copy below still says this is a band-level estimate
       until the profile is filled in. */
    const NEUTRAL_KCAL_PER_KG = 40.5;
    const maintenance =
      measured ?? Math.round(effectiveWeightKg(weight, height) * NEUTRAL_KCAL_PER_KG);

    /* Goal deltas come from GOALS, so changing the product's tuning in one
       place changes it here too. */
    const goalDelta = GOALS.find((g) => g.key === goal)?.kcal ?? 0;
    const daily = Math.round(dailyTargetKcal(maintenance, goalDelta, bmi) / 10) * 10;

    /* The prototype's scale, unchanged: how big this meal is relative to a
       reference one, nudged by BMI band and goal, then clamped so a plate
       never becomes a garnish or a banquet. */
    let scale = daily / MEALS_PER_DAY / REFERENCE_MEAL_KCAL;
    if (band.key === "obese" || band.key === "over") scale *= 0.92;
    else if (band.key === "under") scale *= 1.08;
    if (goal === "loss") scale *= 0.92;
    if (goal === "muscle") scale *= 1.08;
    scale = Math.max(0.62, Math.min(1.45, scale));

    /* Rounded to servable fractions — halves for rotis, quarters for
       katoris. Salad moves the other way on purpose: a smaller energy
       target means more volume from vegetables, not less food. */
    const q: Record<Slot, number> = {
      roti: Math.max(1, Math.round(BASE.roti * scale * 2) / 2),
      dal: Math.max(0.75, Math.round(BASE.dal * scale * 4) / 4),
      sabzi: Math.max(0.75, Math.round(BASE.sabzi * (scale + 0.08) * 4) / 4),
      protein: Math.max(0.5, Math.round(BASE.protein * scale * 4) / 4),
      veg: Math.max(1, Math.round(BASE.veg * (1 + 0.25 * (1 - scale)) * 4) / 4),
      curd: Math.max(0.5, Math.round(BASE.curd * scale * 4) / 4),
      fruit: 1,
    };

    const total = (Object.keys(q) as Slot[]).reduce(
      (acc, k) => {
        const f = FOOD[k];
        return {
          kcal: acc.kcal + f.kcal * q[k],
          p: acc.p + f.p * q[k],
          c: acc.c + f.c * q[k],
          f: acc.f + f.f * q[k],
          fibre: acc.fibre + f.fibre * q[k],
        };
      },
      { kcal: 0, p: 0, c: 0, f: 0, fibre: 0 }
    );

    return { daily, mealTarget: daily / MEALS_PER_DAY, q, total, estimated: measured === null };
  }, [profile, band, bmi]);

  /* Where the marker sits on the arc. The scale is deliberately not linear
     in BMI: the three cutoffs are evenly spaced around the arc so the
     23–25 band — the one this whole product exists to point at — is as
     legible as the wide "normal" range below it. */
  const angle = markerAngle(bmi);

  return (
    <div className="w-full max-w-[560px] mx-auto">
      <div className="relative aspect-square">
        {/* ---------------------------------------------- the BMI arc */}
        <svg
          viewBox="0 0 400 400"
          className="absolute inset-0 w-full h-full"
          role="img"
          aria-label={T({
            en: `Body Mass Index ${bmi.toFixed(1)}, ${band.name.en}. Asian-Indian cutoffs at 18.5, 23 and 25.`,
            hi: `बॉडी मास इंडेक्स ${bmi.toFixed(1)}, ${band.name.hi}। एशियाई-भारतीय मानक 18.5, 23 और 25 पर।`,
          })}
        >
          {ARCS.map((a) => (
            <path
              key={a.key}
              d={arcPath(ARC_R, a.from, a.to)}
              fill="none"
              stroke={a.color}
              strokeWidth={10}
              strokeLinecap="round"
              opacity={band.key === a.key ? 1 : 0.3}
            />
          ))}
          {TICKS.map((t) => {
            const pt = polar(TICK_R, t.angle);
            return (
              <text
                key={t.label}
                x={pt.x}
                y={pt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={15}
                fill="var(--ink-soft)"
                style={{ fontFamily: "var(--font-data)" }}
              >
                {t.label}
              </text>
            );
          })}
          {/* The visitor's own value. */}
          <circle
            cx={polar(ARC_R, angle).x}
            cy={polar(ARC_R, angle).y}
            r={11}
            fill="var(--roti)"
            stroke={band.color}
            strokeWidth={5}
          />
        </svg>

        {/* ------------------------------------------------- the plate */}
        <div
          className="absolute rounded-full"
          style={{
            inset: "13%",
            background:
              "radial-gradient(circle, var(--roti) 0 52%, color-mix(in srgb, var(--ink) 18%, var(--roti)) 54%, color-mix(in srgb, var(--ink) 55%, var(--roti)) 62%, color-mix(in srgb, var(--ink) 80%, var(--roti)) 100%)",
            boxShadow: "0 18px 40px rgb(0 0 0 / .28), inset 0 0 0 6px rgb(255 255 255 / .16)",
          }}
        >
          {SERVINGS.map((s) => (
            <Serving
              key={s.slot}
              spec={s}
              qty={model.q[s.slot]}
              label={T(labelFor(s.slot, profile.diet))}
              amount={formatServing(model.q[s.slot], s.slot, lang)}
            />
          ))}
        </div>
      </div>

      {/* --------------------------------------------- meal nutrition */}
      <div
        className="mt-5 rounded-2xl px-5 py-4"
        style={{ background: "var(--roti-2)", border: "1px solid var(--line)" }}
        aria-live="polite"
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span
            className="text-[0.7rem] font-extrabold uppercase"
            style={{ letterSpacing: "0.14em", color: "var(--ink-soft)" }}
          >
            {T({ en: "This meal", hi: "यह भोजन" })}
          </span>
          <span
            className="text-[1.5rem] leading-none tabular-nums"
            style={{ fontFamily: "var(--font-data)", color: "var(--kesar)" }}
          >
            {Math.round(model.total.kcal).toLocaleString("en-IN")}
            <span className="text-[0.85rem] ml-1" style={{ color: "var(--ink-soft)" }}>
              kcal
            </span>
          </span>
        </div>
        <p className="mt-2 text-[0.84rem] tabular-nums" style={{ color: "var(--ink-soft)" }}>
          {T({ en: "Protein", hi: "प्रोटीन" })} {Math.round(model.total.p)}g ·{" "}
          {T({ en: "Carbs", hi: "कार्ब्स" })} {Math.round(model.total.c)}g ·{" "}
          {T({ en: "Fat", hi: "वसा" })} {Math.round(model.total.f)}g ·{" "}
          {T({ en: "Fibre", hi: "रेशा" })} {Math.round(model.total.fibre)}g
        </p>
        <p className="mt-2 text-[0.78rem]" style={{ color: "var(--ink-soft)" }}>
          {model.estimated
            ? T({
                en: `Portions scaled to the ${band.name.en.toLowerCase()} band. Set your age, sex and activity level below for a figure built from your own numbers.`,
                hi: `मात्राएँ ${band.name.hi} श्रेणी के अनुसार। अपनी उम्र, लिंग और गतिविधि नीचे भरें ताकि यह आपके अपने आँकड़ों से बने।`,
              })
            : T({
                en: `About ${Math.round(model.daily).toLocaleString("en-IN")} kcal a day across ${MEALS_PER_DAY} meals.`,
                hi: `लगभग ${Math.round(model.daily).toLocaleString("en-IN")} kcal प्रतिदिन, ${MEALS_PER_DAY} भोजन में।`,
              })}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ plate */

type ServingSpec = {
  slot: Slot;
  /** Percentages within the plate box. */
  left: number;
  top: number;
  size: number;
  colour: string;
  /** Rotis are an oval, everything else a katori. */
  flat?: boolean;
};

/* Laid out the way a thali is actually served: breads at the near edge
   where a right hand reaches them, wet dishes in katoris along the far arc,
   salad and curd to the sides. */
const SERVINGS: ServingSpec[] = [
  { slot: "dal", left: 13, top: 17, size: 26, colour: "var(--haldi)" },
  { slot: "sabzi", left: 59, top: 17, size: 26, colour: "var(--elaichi)" },
  { slot: "curd", left: 37, top: 8, size: 24, colour: "#e8eee9" },
  { slot: "protein", left: 12, top: 50, size: 24, colour: "var(--imli)" },
  { slot: "veg", left: 62, top: 50, size: 24, colour: "var(--mirch)" },
  { slot: "fruit", left: 65, top: 78, size: 18, colour: "var(--kesar)" },
  { slot: "roti", left: 22, top: 74, size: 38, colour: "#d9ab68", flat: true },
];

function Serving({
  spec,
  qty,
  label,
  amount,
}: {
  spec: ServingSpec;
  qty: number;
  label: string;
  amount: string;
}) {
  /* The whole point of the model: the katori is physically bigger when the
     portion is. Transform-only so resizing never triggers layout. */
  const scale = 0.78 + qty * 0.22;

  return (
    <div
      className="absolute grid place-items-center text-center select-none"
      style={{
        left: `${spec.left}%`,
        top: `${spec.top}%`,
        width: `${spec.size}%`,
        height: `${spec.flat ? spec.size * 0.46 : spec.size}%`,
        borderRadius: spec.flat ? "46%" : "50%",
        background: spec.colour,
        color: spec.slot === "curd" ? "#16372c" : "#fff",
        textShadow: spec.slot === "curd" ? "none" : "0 1px 4px rgb(0 0 0 / .55)",
        boxShadow: "0 8px 18px rgb(0 0 0 / .32), inset 0 0 0 3px rgb(255 255 255 / .42)",
        transform: `scale(${scale})`,
        transition: "transform .28s var(--ease, cubic-bezier(.2,.7,.3,1))",
      }}
      title={`${label} — ${amount}`}
    >
      <span className="text-[min(1.6vw,0.72rem)] font-extrabold leading-tight">{label}</span>
      <span
        className="text-[min(1.4vw,0.64rem)] tabular-nums leading-tight"
        style={{ fontFamily: "var(--font-data)", opacity: 0.9 }}
      >
        {amount}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- the arc */

/* In this coordinate system 0° is the top and angles run clockwise, so
   90° is the right edge, 180° the bottom, 270° the left.

   The gauge sweeps 270°, from the lower left (225°) up the left side, over
   the top, and down to the lower right (495° = 135°). The 90° it leaves
   open sits at the bottom, which is where the plate's near edge and the
   BMI readout are — a gauge that closed there would draw a ring around the
   one number it exists to annotate.

   Four equal 67.5° bands, so the three cutoffs land at upper-left, top and
   upper-right: 23 is at twelve o'clock, which is the number this whole
   product is an argument about. */
/* 182, not 196: the marker is an 11px circle with a 5px stroke, so a track
   at 196 put its outer edge at 207 in a 400-wide box and clipped it against
   the viewBox on the right-hand bands. */
const ARC_R = 182;
const TICK_R = 154;

const SWEEP_START = 225;
const SWEEP_END = 495;
const BAND_SWEEP = (SWEEP_END - SWEEP_START) / 4;

const ARCS = [
  { key: "under", from: 225, to: 292.5, color: "var(--haldi)" },
  { key: "normal", from: 292.5, to: 360, color: "var(--elaichi)" },
  { key: "over", from: 360, to: 427.5, color: "var(--kesar)" },
  { key: "obese", from: 427.5, to: 495, color: "var(--mirch)" },
] as const;

const TICKS = [
  { label: "18.5", angle: SWEEP_START + BAND_SWEEP },
  { label: "23", angle: SWEEP_START + BAND_SWEEP * 2 },
  { label: "25", angle: SWEEP_START + BAND_SWEEP * 3 },
];

/** BMI to angle. Piecewise so each cutoff lands exactly on its tick. */
function markerAngle(bmi: number): number {
  const stops: [number, number][] = [
    [12, SWEEP_START],
    [18.5, SWEEP_START + BAND_SWEEP],
    [23, SWEEP_START + BAND_SWEEP * 2],
    [25, SWEEP_START + BAND_SWEEP * 3],
    [40, SWEEP_END],
  ];
  if (bmi <= stops[0][0]) return SWEEP_START;
  if (bmi >= stops[stops.length - 1][0]) return SWEEP_END;
  for (let i = 1; i < stops.length; i++) {
    const [hiV, hiA] = stops[i];
    const [loV, loA] = stops[i - 1];
    if (bmi <= hiV) return loA + ((bmi - loV) / (hiV - loV)) * (hiA - loA);
  }
  return SWEEP_END;
}

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: 200 + r * Math.cos(rad), y: 200 + r * Math.sin(rad) };
}

function arcPath(r: number, from: number, to: number): string {
  const a = polar(r, from);
  const b = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/* ------------------------------------------------------------- formatting */

const FRACTION: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

/** "2 rotis", "1½ katoris" — the unit a kitchen serves in, not grams. */
function formatServing(qty: number, slot: Slot, lang: "en" | "hi"): string {
  const whole = Math.floor(qty);
  const glyph = FRACTION[Math.round((qty - whole) * 100) / 100] ?? "";
  const number = whole === 0 ? glyph : `${whole}${glyph}`;

  const unit =
    slot === "roti"
      ? { one: { en: "roti", hi: "रोटी" }, many: { en: "rotis", hi: "रोटी" } }
      : slot === "fruit"
        ? { one: { en: "piece", hi: "फल" }, many: { en: "pieces", hi: "फल" } }
        : { one: { en: "katori", hi: "कटोरी" }, many: { en: "katoris", hi: "कटोरी" } };

  return `${number} ${qty > 1 ? unit.many[lang] : unit.one[lang]}`;
}
