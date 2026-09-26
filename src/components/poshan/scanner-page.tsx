"use client";

import { useLang, useReveal } from "./lang-provider";
import { PlateScanner } from "./plate-scanner";
import { BuildYourPlan } from "./premium";
import { useProfile } from "@/lib/hooks/use-profile";
import type { GoalKey, DietKey, RegionKey } from "@/lib/poshan-data";

/**
 * Food Scanner tab: the camera-driven logger and the "Build your plan"
 * customiser, together — both answer the same question ("what am I actually
 * eating / going to eat"), so they no longer live on two unrelated tabs
 * (Meals, and what used to be Poshan Home).
 *
 * The logger here is <PlateScanner>, which reads every dish on the plate
 * with an editable portion. It replaced <FoodScanner>, which returned a
 * single dish id and its recorded calories — the wrong shape for a thali,
 * and wrong by a factor of three on one. FoodScanner is still mounted
 * inside <Conditions> and <MealsShowcase>, where a single matched dish is
 * genuinely what the caller wants (the condition checker reacts to one id
 * via onScanned); this surface is the one where "what am I eating" means
 * the whole plate.
 */
export function ScannerPage({
  baseKcal,
  bmi,
  goal,
  setGoal,
  diet,
  setDiet,
  region,
  setRegion,
  signedIn,
  isPremium,
}: {
  baseKcal: number;
  bmi?: number;
  goal: GoalKey;
  setGoal: (g: GoalKey) => void;
  diet: DietKey;
  setDiet: (d: DietKey) => void;
  region: RegionKey;
  setRegion: (r: RegionKey) => void;
  signedIn: boolean;
  isPremium: boolean;
}) {
  const { T } = useLang();
  const { profile } = useProfile();
  const reveal = useReveal<HTMLDivElement>();

  return (
    <section className="py-12 md:py-16">
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div ref={reveal} className="rise">
          <div className="max-w-[56ch] mb-9">
            <div className="shiro w-[72px] mb-5" />
            <h2
              className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({ en: "Scan it, or plan it", hi: "स्कैन करें, या योजना बनाएँ" })}
            </h2>
            <p className="mt-4 text-[1.02rem]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: "Point a camera at what's in front of you, or tell Poshan your goal, diet and region and let it build the day for you.",
                hi: "जो सामने है उस पर कैमरा रखें, या पोषण को अपना लक्ष्य, आहार और क्षेत्र बताएँ और उसे आपका दिन बनाने दें।",
              })}
            </p>
          </div>

          <div id="scan" className="mb-8">
            {/* portionScale is the user's own katori, measured against a ₹10
                coin in <PortionCalibration>. Defaulting to 1 for a signed-out
                visitor is the honest fallback: the reference katori, not a
                guess at theirs. */}
            <PlateScanner isPremium={isPremium} portionScale={profile?.portion_scale ?? 1} />
          </div>

          <BuildYourPlan
            baseKcal={baseKcal}
            bmi={bmi}
            goal={goal}
            setGoal={setGoal}
            diet={diet}
            setDiet={setDiet}
            region={region}
            setRegion={setRegion}
            signedIn={signedIn}
          />
        </div>
      </div>
    </section>
  );
}
