"use client";

import { useState } from "react";
import { useLang } from "./lang-provider";
import { getAdjustedCalories, compareToBand } from "@/lib/tdee-calculator";
import {
  ACTIVITY_LEVELS,
  estimateMaintenanceKcal,
  type ActivityLevel,
  type Sex,
} from "@/lib/energy-requirement";
import { BANDS, type BandKey, type GoalKey } from "@/lib/poshan-data";

/**
 * Onboarding's calorie estimate, from the same model as the rest of the app.
 *
 * This screen used to call calculateTDEE (Mifflin-St Jeor) while every other
 * surface — the daily plan, the week plan, the Today widget, the clinician
 * plans, the hero — used estimateMaintenanceKcal (ICMR-NIN 2020 kcal/kg).
 * The two disagree by 139 to 898 kcal for the same person, and onboarding's
 * number was always the lower one.
 *
 * That difference did not stay on this screen. Onboarding writes its result
 * to profiles.tdee, and /api/daily reads `target.tdee ?? estimate...`, so the
 * saved number wins and the ICMR path is never reached again. Every calorie
 * target a user ever saw was the Mifflin one, several hundred kcal under the
 * model the product is actually built on.
 *
 * The activity scale was wrong too. This screen offered five levels —
 * sedentary, light, moderate, active, veryActive — while both the ICMR table
 * and the profiles.activity_level check constraint accept exactly three. The
 * extra two could not be stored and had no kcal/kg value behind them.
 *
 * ACTIVITY_LEVELS is now the single source for both the options and their
 * copy, so the screen cannot drift from the table again.
 */

/** What onComplete hands back. Exported so <OnboardingFlow> can type its
 *  handler against it instead of taking `any` — the two were coupled
 *  already, just not in a way the compiler could see. */
export interface TDEEResult {
  weight: number;
  height: number;
  age: number;
  gender: Sex;
  activity: ActivityLevel;
  tdee: number;
  band: BandKey;
  /* The select below offers exactly the five GoalKey values, so a plain
     `string` here was wider than the data ever is — and it was the reason
     every consumer needed a cast. */
  goal: GoalKey;
}

/** What this component additionally shows on screen but does not pass on. */
interface TDEEDisplay extends TDEEResult {
  adjustedCals: number;
  comparison: ReturnType<typeof compareToBand>;
}

export function TDEECalculatorUI({ onComplete }: { onComplete?: (result: TDEEResult) => void }) {
  const { T } = useLang();
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<Sex>("male");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<GoalKey>("loss");
  const [result, setResult] = useState<TDEEDisplay | null>(null);
  const [tooYoung, setTooYoung] = useState(false);

  const handleCalculate = () => {
    /* Null below the age the ICMR adult table covers — the model declines to
       guess rather than quietly extrapolating onto a teenager. */
    const maintenance = estimateMaintenanceKcal(weight, age, gender, activity, height);
    if (maintenance === null) {
      setResult(null);
      setTooYoung(true);
      return;
    }
    setTooYoung(false);
    const bmi = weight / Math.pow(height / 100, 2);
    let band: BandKey = "normal";
    if (bmi < 18.5) band = "under";
    else if (bmi >= 25) band = "obese";
    else if (bmi >= 23) band = "over";

    const adjustedCals = getAdjustedCalories(maintenance, goal, bmi);
    const bandBaseline = 2000; // Standard baseline for comparison
    const comparison = compareToBand(maintenance, bandBaseline);

    setResult({
      weight,
      height,
      age,
      gender,
      activity,
      tdee: maintenance,
      band,
      goal,
      adjustedCals,
      comparison,
    });

    if (onComplete) {
      onComplete({ weight, height, age, gender, activity, tdee: maintenance, band, goal });
    }
  };

  return (
    <div style={{ maxWidth: "100%", background: "var(--surface)", borderRadius: "12px", padding: "24px", border: "1px solid var(--line)" }}>
      <h2 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "0 0 20px 0" }}>{T({ en: "🧮 Calculate Your Maintenance Calories", hi: "🧮 अपने रोज़मर्रा कैलोरीज़ की गणना करें" })}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Weight */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px", color: "var(--ink-soft)" }}>
            {T({ en: "Weight (kg)", hi: "वज़न (किग्रा)" })}
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              fontSize: "1rem",
              background: "var(--surface-2)",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* Height */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px", color: "var(--ink-soft)" }}>
            {T({ en: "Height (cm)", hi: "क़द (सेमी)" })}
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              fontSize: "1rem",
              background: "var(--surface-2)",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* Age */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px", color: "var(--ink-soft)" }}>
            {T({ en: "Age (years)", hi: "उम्र (साल)" })}
          </label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              fontSize: "1rem",
              background: "var(--surface-2)",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* Gender */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px", color: "var(--ink-soft)" }}>
            {T({ en: "Gender", hi: "लिंग" })}
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Sex)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              fontSize: "1rem",
              background: "var(--surface-2)",
              color: "var(--ink)",
            }}
          >
            <option value="male">{T({ en: "Male", hi: "पुरुष" })}</option>
            <option value="female">{T({ en: "Female", hi: "महिला" })}</option>
          </select>
        </div>
      </div>

      {/* Activity Level */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "12px", color: "var(--ink-soft)" }}>
          {T({ en: "Activity Level", hi: "गतिविधि स्तर" })}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
          {ACTIVITY_LEVELS.map(({ key: level, label }) => (
            <button
              key={level}
              onClick={() => setActivity(level)}
              style={{
                padding: "12px 16px",
                border: activity === level ? "2px solid var(--consumer)" : "1px solid var(--line)",
                borderRadius: "6px",
                background: activity === level ? "var(--consumer)" : "var(--surface-2)",
                color: activity === level ? "#fff" : "var(--ink)",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: activity === level ? 600 : 400,
              }}
            >
              {T(label)}
            </button>
          ))}
        </div>
      </div>

      {/* Goal */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "12px", color: "var(--ink-soft)" }}>
          {T({ en: "Your Goal", hi: "आपका लक्ष्य" })}
        </label>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value as GoalKey)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--line)",
            borderRadius: "6px",
            fontSize: "1rem",
            background: "var(--surface-2)",
            color: "var(--ink)",
          }}
        >
          <option value="loss">{T({ en: "Weight Loss", hi: "वज़न घटाना" })}</option>
          <option value="muscle">{T({ en: "Muscle Gain", hi: "मांसपेशी बढ़ाना" })}</option>
          <option value="diabetes">{T({ en: "Blood Sugar", hi: "रक्त शर्करा" })}</option>
          <option value="pcos">{T({ en: "PCOS", hi: "पीसीओएस" })}</option>
          <option value="thyroid">{T({ en: "Thyroid", hi: "थायरॉइड" })}</option>
        </select>
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "var(--consumer)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {T({ en: "Calculate Maintenance", hi: "गणना करें" })}
      </button>

      {/* Results */}
      {/* The ICMR-NIN adult table starts at 19. Below that the model returns
          null rather than extrapolating, and saying so is better than showing
          a number that was never meant to apply to a teenager. */}
      {tooYoung && (
        <div
          role="alert"
          style={{
            marginTop: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1.5px solid color-mix(in srgb, var(--kesar) 45%, transparent)",
            background: "color-mix(in srgb, var(--kesar) 10%, transparent)",
            fontSize: "0.9rem",
          }}
        >
          {T({
            en: "The guidance Poshan uses for maintenance calories covers adults from 19. We would rather say so than show you a number that was not built for your age — the rest of Poshan still works.",
            hi: "पोषण जिस मार्गदर्शन का उपयोग करता है वह 19 वर्ष से ऊपर के वयस्कों के लिए है। आपकी आयु के लिए न बना आंकड़ा दिखाने से बेहतर है यह बता देना — बाकी पोषण फिर भी काम करता है।",
          })}
        </div>
      )}

      {result && (
        // Card-in, not panel-in: this is a result appearing in response to a
        // click rather than a whole screen changing, and card-in's added
        // scale(0.985→1) reads as the card settling into place, which suits
        // a single result appearing more than panel-in's flatter fade-up.
        <div className="card-in" style={{ marginTop: "24px", padding: "16px", background: "var(--flag-soft)", borderRadius: "8px" }}>
          <h3 style={{ margin: "0 0 16px 0", color: "var(--flag)", fontSize: "1.1rem" }}>
            {T({ en: "Your Results", hi: "आपके परिणाम" })}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                {T({ en: "Maintenance Calories", hi: "रोज़मर्रा कैलोरीज़" })}
              </p>
              <p style={{ margin: "0", fontSize: "1.6rem", fontWeight: 700, color: "var(--flag)" }}>{result.tdee}</p>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--ink-soft)" }}>kcal/day</p>
            </div>
            <div>
              <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                {T({ en: "Your Goal Calories", hi: "आपके लक्ष्य कैलोरीज़" })}
              </p>
              <p style={{ margin: "0", fontSize: "1.6rem", fontWeight: 700, color: "var(--clinical)" }}>{result.adjustedCals}</p>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--ink-soft)" }}>kcal/day</p>
            </div>
          </div>
          <p style={{ margin: "16px 0 0 0", fontSize: "0.9rem", color: "var(--ink)", lineHeight: "1.6" }}>
            <strong>{T({ en: "Band", hi: "वर्ग" })}:</strong> {BANDS.find((b) => b.key === result.band)?.name.en}
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "0.9rem", color: "var(--ink-soft)" }}>{result.comparison.recommendation}</p>
        </div>
      )}
    </div>
  );
}
