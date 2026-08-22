"use client";

import { useState } from "react";
import { useLang } from "./lang-provider";
import { TDEECalculatorUI } from "./tdee-calculator-ui";
import { MacroPersonalizer } from "./macro-personalizer";
import { REGIONS, DIETS, type RegionKey, type DietKey } from "@/lib/poshan-data";

type OnboardingStep = "welcome" | "tdee" | "goal" | "region-diet" | "macros" | "complete";

interface OnboardingData {
  tdee?: number;
  goal?: string;
  region?: RegionKey;
  diet?: DietKey;
  isPremium: boolean;
}

export function OnboardingFlow({ onComplete, isPremium }: { onComplete?: (data: OnboardingData) => void; isPremium: boolean }) {
  const { T } = useLang();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [data, setData] = useState<OnboardingData>({ isPremium });

  const handleTDEEComplete = (tdeeData: any) => {
    setData({ ...data, tdee: tdeeData.tdee, goal: tdeeData.goal });
    setStep("region-diet");
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
        {(["welcome", "tdee", "region-diet", "macros", "complete"] as const).map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: "4px",
              background: ["welcome", "tdee", "region-diet", "macros"].includes(s) && ["welcome", "tdee", "region-diet", "macros"].indexOf(s as any) < ["welcome", "tdee", "region-diet", "macros"].indexOf(step as any) ? "var(--flag)" : step === s ? "var(--consumer)" : "var(--line)",
              borderRadius: "2px",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Welcome Step */}
        {step === "welcome" && (
          <div style={{ textAlign: "center" }}>
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
          <div>
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
        {step === "region-diet" && (
          <div>
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
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "30px" }}>
              {T({
                en: "Step 3: Personalize Your Macro Targets",
                hi: "चरण 3: अपने मैक्रो लक्ष्यों को व्यक्तिगत करें",
              })}
            </h2>
            {data.tdee && data.goal && (
              <MacroPersonalizer tdee={data.tdee} goal={data.goal as any} isPremium={true} />
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
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>✨</div>
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
