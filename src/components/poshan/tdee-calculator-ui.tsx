"use client";

import { useState } from "react";
import { useLang } from "./lang-provider";
import { calculateTDEE, getAdjustedCalories, compareToBand, type ActivityLevel, type Gender } from "@/lib/tdee-calculator";
import { BANDS, type BandKey } from "@/lib/poshan-data";

interface TDEEResult {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  activity: ActivityLevel;
  tdee: number;
  band: BandKey;
  goal: string;
}

export function TDEECalculatorUI({ onComplete }: { onComplete?: (result: TDEEResult) => void }) {
  const { T } = useLang();
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<Gender>("male");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState("loss");
  const [result, setResult] = useState<any>(null);

  const handleCalculate = () => {
    const tdeeResult = calculateTDEE(weight, height, age, gender, activity);
    const bmi = weight / Math.pow(height / 100, 2);
    let band: BandKey = "normal";
    if (bmi < 18.5) band = "under";
    else if (bmi >= 25) band = "obese";
    else if (bmi >= 23) band = "over";

    const adjustedCals = getAdjustedCalories(tdeeResult.tdee, goal);
    const bandBaseline = 2000; // Standard baseline for comparison
    const comparison = compareToBand(tdeeResult.tdee, bandBaseline);

    setResult({
      weight,
      height,
      age,
      gender,
      activity,
      tdee: tdeeResult.tdee,
      band,
      goal,
      adjustedCals,
      comparison,
    });

    if (onComplete) {
      onComplete({ weight, height, age, gender, activity, tdee: tdeeResult.tdee, band, goal });
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
            onChange={(e) => setGender(e.target.value as Gender)}
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
          {(["sedentary", "light", "moderate", "active", "veryActive"] as const).map((level) => (
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
              {T({
                en: {
                  sedentary: "Sedentary",
                  light: "Light",
                  moderate: "Moderate",
                  active: "Active",
                  veryActive: "Very Active",
                }[level],
                hi: {
                  sedentary: "कम सक्रिय",
                  light: "हल्का",
                  moderate: "मध्यम",
                  active: "सक्रिय",
                  veryActive: "बहुत सक्रिय",
                }[level],
              })}
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
          onChange={(e) => setGoal(e.target.value)}
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
      {result && (
        <div style={{ marginTop: "24px", padding: "16px", background: "var(--flag-soft)", borderRadius: "8px" }}>
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
