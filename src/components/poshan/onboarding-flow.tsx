"use client";

import { useState } from "react";
import { useLang } from "./lang-provider";
import { TDEECalculatorUI, type TDEEResult } from "./tdee-calculator-ui";
import { MacroPersonalizer } from "./macro-personalizer";
import { MinorGate } from "./minor-gate";
import { MINOR_AGE } from "@/lib/dpdp";
import { REGIONS, DIETS, type RegionKey, type DietKey, type GoalKey } from "@/lib/poshan-data";
import type { ActivityLevel, Sex } from "@/lib/energy-requirement";

type OnboardingStep =
  | "welcome"
  | "tdee"
  | "goal"
  /* Reached only when the age just entered is under 18. Sits
     immediately after "tdee" because that is the step that first
     tells us, and before "region-diet" because everything after it
     is profile data we may not store yet. */
  | "minor-gate"
  | "region-diet"
  | "macros"
  | "complete";

/* The steps the progress bar tracks, in order. "goal" is deliberately
   absent: it is part of the TDEE step's own form, not a screen of its
   own, so the bar would show a segment nobody ever lands on. */
const PROGRESS_STEPS = ["welcome", "tdee", "region-diet", "macros", "complete"] as const;

interface OnboardingData {
  tdee?: number;
  goal?: GoalKey;
  region?: RegionKey;
  diet?: DietKey;
  /* The inputs the estimate was made from. Onboarding used to keep only the
     resulting number and throw these away, which left the profile holding a
     maintenance figure the app had no way to recompute — /api/daily reads
     `target.tdee ?? estimate(...)`, so a stale saved number wins forever.
     Kept now so a weight change can move the target. */
  weight?: number;
  height?: number;
  age?: number;
  sex?: Sex;
  activityLevel?: ActivityLevel;
  isPremium: boolean;
}

export function OnboardingFlow({ onComplete, isPremium }: { onComplete?: (data: OnboardingData) => void; isPremium: boolean }) {
  const { T } = useLang();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [data, setData] = useState<OnboardingData>({ isPremium });

  const handleTDEEComplete = (tdeeData: TDEEResult) => {
    setData({
      ...data,
      tdee: tdeeData.tdee,
      goal: tdeeData.goal,
      weight: tdeeData.weight,
      height: tdeeData.height,
      age: tdeeData.age,
      sex: tdeeData.gender,
      activityLevel: tdeeData.activity,
    });
    /* DPDP s.9(1): a child's data may not be processed until a guardian
       has verifiably consented, so the branch happens here — the first
       moment Poshan knows — rather than at save time, when the rest of the
       profile would already have been collected on the strength of a
       consent nobody had given. */
    setStep(tdeeData.age < MINOR_AGE ? "minor-gate" : "region-diet");
  };

  const handleRegionDietSelect = (region: RegionKey, diet: DietKey) => {
    setData({ ...data, region, diet });
    if (isPremium) {
      setStep("macros");
    } else {
      setStep("complete");
    }
  };

  const handleMacrosComplete = () => {
    setStep("complete");
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete(data);
    }
  };

  return (
    <div
      style={{
        maxWidth: "100%",
        minHeight: "100vh",
        background: "var(--surface)",
        padding: "40px 20px",
      }}
    >
      {/* Step Indicator */}
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto 40px",
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        {PROGRESS_STEPS.map((s, i) => {
          /* Compared by index against the current step. The previous
             version measured both against a four-element list that left
             "complete" out, so indexOf(step) returned -1 on the final
             screen and every earlier segment reverted to empty — the
             progress bar drained itself exactly when the user finished.
             Using the same ordered list for both sides fixes that, and
             `i` is the index the map already provides rather than a
             second lookup that had to be cast to compile. */
          const current = PROGRESS_STEPS.indexOf(step as (typeof PROGRESS_STEPS)[number]);
          const done = current > -1 && i < current;
          return (
            <div
              key={s}
              style={{
                flex: 1,
                height: "4px",
                background: done ? "var(--flag)" : step === s ? "var(--consumer)" : "var(--line)",
                borderRadius: "2px",
                transition: "background 0.3s",
              }}
            />
          );
        })}
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Welcome Step */}
        {step === "welcome" && (
          // key={step} forces a remount on every step change, which is what
          // lets .panel-in run at all — a CSS entry animation only fires on
          // mount, and without the key React would just patch this div in
          // place and the step would swap with no transition.
          <div key={step} className="panel-in" style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 700, margin: "0 0 20px 0" }}>
              {T({ en: "🥗 Welcome to Poshan", hi: "🥗 पोषण में आपका स्वागत है" })}
            </h1>
            <p style={{ fontSize: "1.1rem", color: "var(--ink-soft)", marginBottom: "40px", lineHeight: 1.6 }}>
              {T({
                en: "Your personalized nutrition platform built on Indian meals and regional wisdom. In 5 minutes, we'll set up your plate.",
                hi: "भारतीय भोजन और क्षेत्रीय ज्ञान पर बना आपका व्यक्तिगत पोषण मंच। 5 मिनट में हम आपकी थाली तैयार कर देंगे।",
              })}
            </p>
            <button
              onClick={() => setStep("tdee")}
              style={{
                padding: "14px 32px",
                background: "var(--consumer)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {T({ en: "Let's Start", hi: "शुरू करते हैं" })}
            </button>
          </div>
        )}

        {/* TDEE Step */}
        {step === "tdee" && (
          <div key={step} className="panel-in">
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "30px" }}>
              {T({
                en: "Step 1: Calculate Your Daily Calorie Needs",
                hi: "चरण 1: अपनी दैनिक कैलोरी आवश्यकता की गणना करें",
              })}
            </h2>
            <TDEECalculatorUI
              onComplete={(result) => {
                handleTDEEComplete(result);
              }}
            />
            <button
              onClick={() => setStep("region-diet")}
              style={{
                marginTop: "30px",
                padding: "14px 32px",
                background: "var(--consumer)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {T({ en: "Next: Choose Your Region & Diet", hi: "अगला: अपना क्षेत्र और आहार चुनें" })}
            </button>
          </div>
        )}

        {/* Region & Diet Selection */}
        {step === "minor-gate" && (
          <MinorGate
            age={data.age ?? 0}
            onSent={() => setStep("region-diet")}
            onSkip={() => setStep("region-diet")}
          />
        )}

        {step === "region-diet" && (
          <div key={step} className="panel-in">
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "30px" }}>
              {T({
                en: "Step 2: Choose Your Region & Diet",
                hi: "चरण 2: अपना क्षेत्र और आहार चुनें",
              })}
            </h2>

            <div style={{ marginBottom: "40px" }}>
              <label style={{ display: "block", fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>
                {T({ en: "Region:", hi: "क्षेत्र:" })}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {REGIONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => {
                      setData({ ...data, region: r.key });
                    }}
                    style={{
                      padding: "16px",
                      border: data.region === r.key ? "2px solid var(--consumer)" : "1px solid var(--line)",
                      borderRadius: "8px",
                      background: data.region === r.key ? "var(--consumer-soft)" : "var(--surface-2)",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {r.label.en}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "40px" }}>
              <label style={{ display: "block", fontSize: "1rem", fontWeight: 600, marginBottom: "16px" }}>
                {T({ en: "Diet Preference:", hi: "आहार वरीयता:" })}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {DIETS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => {
                      setData({ ...data, diet: d.key });
                    }}
                    style={{
                      padding: "16px",
                      border: data.diet === d.key ? "2px solid var(--flag)" : "1px solid var(--line)",
                      borderRadius: "8px",
                      background: data.diet === d.key ? "var(--flag-soft)" : "var(--surface-2)",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {d.label.en}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleRegionDietSelect(data.region!, data.diet!)}
              disabled={!data.region || !data.diet}
              style={{
                padding: "14px 32px",
                background: data.region && data.diet ? "var(--flag)" : "var(--line)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: data.region && data.diet ? "pointer" : "not-allowed",
                width: "100%",
              }}
            >
              {isPremium
                ? T({ en: "Next: Personalize Your Macros", hi: "अगला: अपने मैक्रोज़ को व्यक्तिगत करें" })
                : T({ en: "Complete Setup", hi: "सेटअप पूरा करें" })}
            </button>
          </div>
        )}

        {/* Macros Step (Premium only) */}
        {step === "macros" && isPremium && (
          <div key={step} className="panel-in">
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "30px" }}>
              {T({
                en: "Step 3: Personalize Your Macro Targets",
                hi: "चरण 3: अपने मैक्रो लक्ष्यों को व्यक्तिगत करें",
              })}
            </h2>
            {data.tdee && data.goal && (
              <MacroPersonalizer tdee={data.tdee} goal={data.goal} isPremium={true} />
            )}
            <button
              onClick={handleMacrosComplete}
              style={{
                marginTop: "30px",
                padding: "14px 32px",
                background: "var(--flag)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {T({ en: "Complete Setup", hi: "सेटअप पूरा करें" })}
            </button>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && (
          <div key={step} className="panel-in" style={{ textAlign: "center" }}>
            {/* The one genuine celebration moment in the whole flow — the
                Peak-End Rule says this beat and the very first screen are
                what the user actually remembers, so it earns a flourish the
                rest of onboarding does not get. */}
            <div className="onboarding-sparkle" style={{ fontSize: "4rem", marginBottom: "20px" }}>✨</div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "20px" }}>
              {T({ en: "Your Plate is Ready!", hi: "आपकी थाली तैयार है!" })}
            </h2>
            <div
              style={{
                background: "var(--surface-2)",
                padding: "24px",
                borderRadius: "12px",
                marginBottom: "40px",
                textAlign: "left",
              }}
            >
              {data.tdee && (
                <p style={{ margin: "8px 0", fontSize: "1rem" }}>
                  <strong>{T({ en: "Daily Maintenance:", hi: "दैनिक रोज़मर्रा:" })}</strong> {data.tdee} kcal
                </p>
              )}
              {data.goal && (
                <p style={{ margin: "8px 0", fontSize: "1rem" }}>
                  <strong>{T({ en: "Your Goal:", hi: "आपका लक्ष्य:" })}</strong> {data.goal}
                </p>
              )}
              {data.region && (
                <p style={{ margin: "8px 0", fontSize: "1rem" }}>
                  <strong>{T({ en: "Region:", hi: "क्षेत्र:" })}</strong>{" "}
                  {REGIONS.find((r) => r.key === data.region)?.label.en}
                </p>
              )}
              {data.diet && (
                <p style={{ margin: "8px 0", fontSize: "1rem" }}>
                  <strong>{T({ en: "Diet:", hi: "आहार:" })}</strong> {DIETS.find((d) => d.key === data.diet)?.label.en}
                </p>
              )}
            </div>
            <button
              onClick={handleFinish}
              style={{
                padding: "16px 48px",
                background: "var(--consumer)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1.1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {T({ en: "Start Using Poshan", hi: "पोषण का उपयोग शुरू करें" })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
