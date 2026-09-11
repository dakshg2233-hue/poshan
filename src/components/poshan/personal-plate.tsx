"use client";

import { useMemo } from "react";
import { useLang } from "./lang-provider";
import { useDaily, type DailyPick } from "@/lib/hooks/use-daily";
import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { prescribeMeal, type Portion } from "@/lib/portion";
import type { DayType } from "@/lib/daily-engine";

/**
 * Your plate for today — the actual dishes, at the actual portions, drawn
 * as the thali you'd serve.
 *
 * The 3D thali that already exists is a renderer: it draws a plate, and
 * the plate is the same whoever is looking at it. The daily engine already
 * knows how today differs from yesterday — the goal, the conditions, the
 * pantry, whether it's a vrat or a festival day. Those two things had
 * never been connected, so Poshan had a plate that couldn't change and an
 * engine whose output was a list.
 *
 * This is the join. The plate is the engine's output, rendered as food, in
 * katoris and rotis rather than grams — and it visibly differs on a vrat
 * day, on a festival day, and as the goal changes, which is the thing a
 * number in a table can never show you.
 */

const DAY_TYPE_NOTE: Record<DayType, { en: string; hi: string } | null> = {
  normal: null,
  vrat: {
    en: "Vrat day — fasting-friendly dishes only",
    hi: "व्रत का दिन — केवल व्रत-अनुकूल व्यंजन",
  },
  festival: {
    en: "Festival day — lighter picks, since the day usually brings its own",
    hi: "त्योहार — हल्के विकल्प, क्योंकि दिन अपने साथ बहुत कुछ लाता है",
  },
};

/** Roughly how a day's energy divides across three meals. Matches the
 *  per-meal budget the daily engine already uses. */
const MEAL_SHARE: Record<string, number> = { breakfast: 0.3, lunch: 0.4, dinner: 0.3 };

export function PersonalPlate({ portionScale = 1 }: { portionScale?: number }) {
  const { T, lang } = useLang();
  const { data, loading } = useDaily();

  const meals = useMemo(() => {
    if (!data?.recommendation) return [];
    const target = data.recommendation.targetKcal;

    return data.recommendation.picks.map((pick) => {
      const meal = MEAL_LIBRARY.find((m) => m.id === pick.id);
      const share = MEAL_SHARE[pick.time] ?? 0.33;
      const portions = meal
        ? prescribeMeal([meal], target * share, portionScale)
        : ([] as Portion[]);
      return { pick, portion: portions[0] ?? null };
    });
  }, [data, portionScale]);

  if (loading) {
    return (
      <div className="py-8 text-center text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>
        {T({ en: "Building your plate…", hi: "आपकी थाली बन रही है…" })}
      </div>
    );
  }

  if (!data?.recommendation || meals.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--roti-2)" }}>
        <p className="text-[0.95rem]">
          {T({ en: "Set your goal to see today's plate.", hi: "आज की थाली देखने के लिए अपना लक्ष्य तय करें।" })}
        </p>
      </div>
    );
  }

  const dayNote = DAY_TYPE_NOTE[data.context.day_type];
  const totalKcal = meals.reduce((sum, m) => sum + (m.portion?.kcal ?? 0), 0);

  return (
    <section className="w-full">
      <header className="mb-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>
            {T({ en: "Your plate today", hi: "आज की आपकी थाली" })}
          </h2>
          <span
            className="text-[0.85rem] tabular-nums"
            style={{ color: "var(--ink-soft)", fontFamily: "var(--font-data)" }}
          >
            {totalKcal} / {data.recommendation.targetKcal} kcal
          </span>
        </div>
        {dayNote && (
          <p className="mt-1.5 text-[0.85rem]" style={{ color: "var(--kesar)" }}>
            {T(dayNote)}
          </p>
        )}
      </header>

      <div className="grid gap-3">
        {meals.map(({ pick, portion }) => (
          <MealRow key={`${pick.time}-${pick.id}`} pick={pick} portion={portion} lang={lang} />
        ))}
      </div>

      <p className="mt-4 text-[0.78rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        {T({
          en: "Portions are sized to your maintenance calories and your own katori, measured on the Calibrate screen. Change your goal or mark today busy and the plate changes with it.",
          hi: "मात्राएँ आपकी मेंटेनेंस कैलोरी और आपकी अपनी कटोरी के हिसाब से हैं, जो कैलिब्रेट स्क्रीन पर मापी गई। लक्ष्य बदलें या आज को व्यस्त चिह्नित करें, थाली भी बदल जाएगी।",
        })}
      </p>
    </section>
  );
}

function MealRow({
  pick,
  portion,
  lang,
}: {
  pick: DailyPick;
  portion: Portion | null;
  lang: "en" | "hi";
}) {
  const { T } = useLang();

  const MEAL_LABEL: Record<string, { en: string; hi: string }> = {
    breakfast: { en: "Breakfast", hi: "नाश्ता" },
    lunch: { en: "Lunch", hi: "दोपहर" },
    dinner: { en: "Dinner", hi: "रात" },
  };

  return (
    <article className="rounded-2xl p-4" style={{ background: "var(--roti-2)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[0.72rem] uppercase tracking-wider"
            style={{ color: "var(--ink-soft)" }}
          >
            {T(MEAL_LABEL[pick.time] ?? { en: pick.time, hi: pick.time })}
          </div>
          <div className="text-[1rem] font-medium mt-0.5">{T(pick.name)}</div>

          {/* The portion, in the unit the kitchen uses. This is the line
              that makes the recommendation actionable rather than
              informational. */}
          {portion && (
            <div
              className="text-[1.05rem] mt-1.5 tabular-nums"
              style={{ color: "var(--kesar)", fontFamily: "var(--font-data)" }}
            >
              {portion.text[lang]}
            </div>
          )}
        </div>

        <div
          className="text-[0.9rem] tabular-nums shrink-0"
          style={{ color: "var(--ink-soft)", fontFamily: "var(--font-data)" }}
        >
          {portion?.kcal ?? pick.kcal} kcal
        </div>
      </div>

      {/* The engine's own reasons, already computed — see daily-engine.ts.
          Shown here rather than behind a tap because "why this?" is the
          question that makes a recommendation trustworthy, and it costs
          one line to answer. */}
      {pick.reasons.length > 0 && (
        <ul className="list-none p-0 m-0 mt-2.5 flex flex-wrap gap-1.5">
          {pick.reasons.map((r, i) => (
            <li
              key={i}
              className="text-[0.75rem] rounded-full px-2 py-[3px]"
              style={{ background: "var(--roti)", color: "var(--ink-soft)" }}
            >
              {T(r)}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
