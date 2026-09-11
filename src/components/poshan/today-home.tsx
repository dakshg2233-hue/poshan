"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useLang } from "./lang-provider";
import { useDaily } from "@/lib/hooks/use-daily";
import { useProfile } from "@/lib/hooks/use-profile";
import { useStreak } from "@/lib/hooks/use-streak";
import { useBiomarkers } from "@/lib/hooks/use-biomarkers";
import { useWeightLog } from "@/lib/hooks/use-weight-log";
import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { PersonalPlate } from "./personal-plate";
import { SignInPrompt } from "./sign-in-prompt";
import { track } from "@/lib/analytics";

/**
 * The home screen: one screen answering "what do I do right now?".
 *
 * What this deliberately does NOT have, and why:
 *
 * - No composite "health score". A single number blending logging streaks
 *   with clinical markers is not defensible — there is no validated
 *   formula behind it, and it would tell a user with an HbA1c of 6.4 that
 *   they are "doing great" because they drank water. Poshan's whole
 *   differentiator is clinical credibility; a made-up wellness number
 *   trades that for a dopamine hit. gamification.ts already made this call
 *   correctly ("scored on neutral engagement only") and this screen keeps
 *   it.
 *
 * - No activity, hydration or sleep rings. Poshan has no data source for
 *   any of the three — there is no steps table, no sleep table, no
 *   wearable integration — and a progress ring over data that doesn't
 *   exist is a lie rendered as a graphic.
 *
 * What it has instead are two honest numbers: an ADHERENCE figure, which
 * is a behaviour measure Poshan can actually compute from meal logs, and
 * whichever CLINICAL marker matters to this particular user, chosen from
 * their own conditions. Behaviour scores are honest. Health scores are not.
 */

/** Which marker to lead with, per goal. A user managing diabetes cares
 *  about HbA1c; someone on a weight-loss goal cares about the scale. */
const GOAL_MARKER: Record<string, string | null> = {
  diabetes: "hba1c",
  loss: null, // weight, handled separately — it's not in biomarker_readings
  muscle: null,
  pcos: null,
  thyroid: "tsh",
};

export function TodayHome() {
  const { T } = useLang();
  const { profile } = useProfile();
  const { data, loading, signedOut } = useDaily();
  const { data: streak } = useStreak();
  const { biomarkers } = useBiomarkers();
  const { logs: weights } = useWeightLog();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { en: "Good morning", hi: "सुप्रभात" };
    if (h < 17) return { en: "Good afternoon", hi: "नमस्कार" };
    return { en: "Good evening", hi: "शुभ संध्या" };
  }, []);

  /* Today's progress against today's plan — the honest version of a
     "score": it measures what the user did, not how healthy they are. */
  const progress = useMemo(() => {
    if (!data?.recommendation) return null;
    const planned = data.recommendation.picks.length;
    const logged = data.todayLogs.length;
    const loggedKcal = data.todayLogs.reduce((sum, l) => {
      const meal = MEAL_LIBRARY.find((m) => m.id === l.dish_id);
      return sum + (meal?.kcal ?? 0);
    }, 0);
    return {
      planned,
      logged,
      pct: planned > 0 ? Math.min(100, Math.round((logged / planned) * 100)) : 0,
      loggedKcal,
      targetKcal: data.recommendation.targetKcal,
    };
  }, [data]);

  /* The next meal that hasn't been logged yet — the single most useful
     thing this screen can say. */
  const nextMeal = useMemo(() => {
    if (!data?.recommendation) return null;
    const done = new Set(data.todayLogs.map((l) => l.meal_time));
    return data.recommendation.picks.find((p) => !done.has(p.time)) ?? null;
  }, [data]);

  const clinical = useMemo(() => {
    const wanted = profile?.goal ? GOAL_MARKER[profile.goal] : null;
    if (wanted) {
      const readings = biomarkers
        .filter((b) => b.marker === wanted)
        .sort((a, b) => a.taken_on.localeCompare(b.taken_on));
      if (readings.length > 0) {
        const latest = readings[readings.length - 1];
        const prev = readings.length > 1 ? readings[readings.length - 2] : null;
        return {
          label: wanted.toUpperCase(),
          value: `${latest.value}${latest.unit === "%" ? "%" : ` ${latest.unit}`}`,
          delta: prev ? Number(latest.value) - Number(prev.value) : null,
          lowerIsBetter: true,
        };
      }
    }
    /* Weight is the fallback because almost every user has it and it is
       the one trend that moves fast enough to be motivating. */
    if (weights.length >= 2) {
      const sorted = [...weights].sort((a, b) => a.logged_on.localeCompare(b.logged_on));
      const latest = sorted[sorted.length - 1];
      const first = sorted[0];
      return {
        label: T({ en: "Weight", hi: "वज़न" }),
        value: `${latest.weight_kg} kg`,
        delta: Number(latest.weight_kg) - Number(first.weight_kg),
        lowerIsBetter: profile?.goal !== "muscle",
      };
    }
    return null;
  }, [profile, biomarkers, weights, T]);

  /* Only counts as a plan view once there is a plan. Firing on mount would
     count every signed-out bounce and every "set your goal" state as
     engagement with a recommendation the user never saw. */
  useEffect(() => {
    if (!loading && !signedOut && data?.recommendation) {
      track("plan_viewed", { picks: data.recommendation.picks.length });
    }
  }, [loading, signedOut, data]);

  if (loading) {
    return (
      <div className="py-16 text-center text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>
        {T({ en: "Loading…", hi: "लोड हो रहा है…" })}
      </div>
    );
  }

  /* Previously this screen rendered its whole chrome for a signed-out
     visitor, with an em-dash where the meal count goes — a page that looks
     loaded but says nothing, which reads as "Poshan has no record of you"
     rather than "you are not signed in". */
  if (signedOut) {
    return (
      <SignInPrompt
        next="/today"
        title={{ en: "Sign in to see your day", hi: "अपना दिन देखने के लिए साइन इन करें" }}
        detail={{
          en: "Today's plate, your streak and what's changed since last week are all built from your own record.",
          hi: "आज की थाली, आपका सिलसिला और पिछले हफ़्ते से क्या बदला — सब आपके अपने रिकॉर्ड से बनता है।",
        }}
      />
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="w-full grid gap-7 pb-8">
      {/* ------------------------------------------------------ greeting */}
      <header>
        <h1
          className="text-[clamp(1.4rem,4vw,1.9rem)] leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {T(greeting)}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </header>

      {/* --------------------------------------------- the two real numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: "var(--roti-2)" }}>
          <div className="text-[0.72rem] uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
            {T({ en: "Today's plan", hi: "आज की योजना" })}
          </div>
          <div
            className="text-[2rem] leading-none tabular-nums mt-1"
            style={{ fontFamily: "var(--font-data)" }}
          >
            {progress ? `${progress.logged}/${progress.planned}` : "—"}
          </div>
          <div className="text-[0.78rem] mt-1" style={{ color: "var(--ink-soft)" }}>
            {T({ en: "meals logged", hi: "भोजन दर्ज" })}
          </div>
          {progress && (
            <div
              className="mt-2.5 h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--roti)" }}
              role="progressbar"
              aria-valuenow={progress.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress.pct}%`, background: "var(--kesar)" }}
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4" style={{ background: "var(--roti-2)" }}>
          <div className="text-[0.72rem] uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
            {clinical ? clinical.label : T({ en: "Streak", hi: "सिलसिला" })}
          </div>
          <div
            className="text-[2rem] leading-none tabular-nums mt-1"
            style={{ fontFamily: "var(--font-data)" }}
          >
            {clinical ? clinical.value : (streak?.streak?.currentStreak ?? 0)}
          </div>
          <div className="text-[0.78rem] mt-1" style={{ color: "var(--ink-soft)" }}>
            {clinical && clinical.delta !== null ? (
              <span
                style={{
                  color:
                    clinical.delta === 0
                      ? "var(--ink-soft)"
                      : clinical.delta < 0 === clinical.lowerIsBetter
                        ? "#4A7C4E"
                        : "#C0392B",
                }}
              >
                {clinical.delta > 0 ? "↑" : clinical.delta < 0 ? "↓" : "→"}{" "}
                {Math.abs(clinical.delta).toFixed(1)}
              </span>
            ) : (
              T({ en: "days logged", hi: "दिन दर्ज" })
            )}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- what to eat */}
      {nextMeal && (
        <section
          className="rounded-2xl p-5"
          style={{ background: "var(--kesar)", color: "var(--roti)" }}
        >
          <div className="text-[0.74rem] uppercase tracking-wider opacity-80">
            {T({ en: "Eat next", hi: "अगला भोजन" })}
          </div>
          <div className="text-[1.35rem] mt-1" style={{ fontFamily: "var(--font-display)" }}>
            {T(nextMeal.name)}
          </div>
          {nextMeal.reasons.length > 0 && (
            <p className="text-[0.85rem] mt-1.5 opacity-90">{T(nextMeal.reasons[0])}</p>
          )}
        </section>
      )}

      {/* ------------------------------------------------------- the plate */}
      <PersonalPlate portionScale={profile?.portion_scale ?? 1} />

      {/* --------------------------------------------------- what changed */}
      {clinical && clinical.delta !== null && clinical.delta !== 0 && (
        <section className="rounded-2xl p-4" style={{ background: "var(--roti-2)" }}>
          <h2 className="text-[1.05rem]" style={{ fontFamily: "var(--font-display)" }}>
            {T({ en: "What's changed", hi: "क्या बदला" })}
          </h2>
          <p className="text-[0.9rem] mt-1" style={{ color: "var(--ink-soft)" }}>
            {clinical.label} {clinical.delta < 0 ? "↓" : "↑"}{" "}
            {Math.abs(clinical.delta).toFixed(1)}{" "}
            {T({ en: "since you started tracking it.", hi: "जब से आपने इसे दर्ज करना शुरू किया।" })}
          </p>
          <Link
            href="/timeline"
            className="inline-block mt-2 text-[0.85rem] underline underline-offset-4"
            style={{ color: "var(--kesar)" }}
          >
            {T({ en: "See your full timeline", hi: "पूरी समयरेखा देखें" })}
          </Link>
        </section>
      )}

      {/* --------------------------------------------------------- links */}
      <nav className="grid grid-cols-3 gap-3">
        {/* The scanner lives on the Scan tab of the main app rather than at
            a route of its own; #scan is the hash tabs.ts resolves to it. It
            leads here because photographing a plate is the thing this
            screen exists to make one tap away. */}
        <QuickLink href="/#scan" icon="📷" label={{ en: "Scan", hi: "स्कैन" }} />
        <QuickLink href="/timeline" icon="📈" label={{ en: "Timeline", hi: "समयरेखा" }} />
        <QuickLink href="/privacy-centre" icon="🔒" label={{ en: "Privacy", hi: "गोपनीयता" }} />
      </nav>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: { en: string; hi: string };
}) {
  const { T } = useLang();
  return (
    <Link
      href={href}
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: "var(--roti-2)" }}
    >
      <span aria-hidden className="text-[1.2rem]">
        {icon}
      </span>
      <span className="text-[0.92rem]">{T(label)}</span>
    </Link>
  );
}
