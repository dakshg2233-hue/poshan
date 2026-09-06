"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Gauge } from "lucide-react";
import { bandFor } from "@/lib/poshan-data";
import { estimateMaintenanceKcal, type ActivityLevel } from "@/lib/energy-requirement";
import { getTodaysAdvice } from "@/lib/doctor-advice";
import type { Profile } from "@/lib/hooks/use-profile";

/**
 * The dashboard's glanceable summary: BMI, today's maintenance-calorie
 * target, and the doctor's-advice-of-the-day line, in one card. Every
 * number here is derived from real stored profile data — no invented
 * streak or "calories logged today" figure. The real daily food log now
 * lives in its own card (TodayRecommendation, src/lib/daily-engine.ts)
 * rather than folded in here, so this stays the profile-derived summary
 * it always was.
 */
export function TodayWidget({ profile }: { profile: Profile | null }) {
  const advice = getTodaysAdvice();

  const hasBody = !!(profile?.height_cm && profile?.weight_kg);
  const bmi = hasBody
    ? profile!.weight_kg! / Math.pow(profile!.height_cm! / 100, 2)
    : null;
  const band = bmi !== null ? bandFor(bmi) : null;

  const maintenanceKcal =
    profile?.tdee ??
    (hasBody && profile?.age && profile?.sex && profile?.activity_level
      ? estimateMaintenanceKcal(
          profile.weight_kg!,
          profile.age,
          profile.sex,
          profile.activity_level as ActivityLevel
        )
      : null);

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle
          className="flex items-center gap-2"
          style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}
        >
          <Gauge className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--ink-soft)]">BMI</p>
            {bmi !== null && band ? (
              <p className="mt-1 text-2xl font-bold" style={{ color: band.ink }}>
                {bmi.toFixed(1)}
                <span className="ml-2 text-sm font-semibold">{band.name.en}</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Add your height and weight to see this.
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-[var(--ink-soft)]">Maintenance calories</p>
            {maintenanceKcal ? (
              <p className="mt-1 text-2xl font-bold" style={{ color: "var(--ink)" }}>
                {maintenanceKcal.toLocaleString("en-IN")}
                <span className="ml-2 text-sm font-semibold text-[var(--ink-soft)]">kcal/day</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Set age, sex and activity level for this.
              </p>
            )}
          </div>
        </div>

        <div
          className="mt-5 flex gap-2.5 rounded-lg p-3"
          style={{ background: "var(--roti-2, var(--roti))" }}
        >
          <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--kesar)" }} />
          <p className="text-sm leading-snug" style={{ color: "var(--ink)" }}>
            {advice.en}{" "}
            <span className="text-[var(--ink-soft)]">— {advice.source}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
