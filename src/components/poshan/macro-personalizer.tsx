"use client";

import { useState, useMemo } from "react";
import { useLang } from "./lang-provider";
import { GOALS, type GoalKey, filterMeals } from "@/lib/poshan-data";

interface MacroTarget {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export function MacroPersonalizer({
  tdee,
  goal,
  isPremium,
}: {
  tdee: number;
  goal: GoalKey;
  isPremium: boolean;
}) {
  const { T } = useLang();
  const [customGoal, setCustomGoal] = useState(goal);
  const [showMeals, setShowMeals] = useState(false);

  const macroTargets = useMemo((): MacroTarget => {
    const goalData = GOALS.find((g) => g.key === customGoal)!;
    const dailyCals = Math.max(1200, tdee + goalData.kcal);

    let proteinGrams = 0;
    let proteinPct = 0;

    switch (customGoal) {
      case "muscle":
        proteinGrams = Math.round(tdee * 0.03); // ~1.6g/kg assuming ~65kg
        proteinPct = 30;
        break;
      case "loss":
        proteinGrams = Math.round(tdee * 0.025); // ~1.2g/kg
        proteinPct = 30;
        break;
      case "pcos":
        proteinGrams = Math.round(tdee * 0.024); // ~1.3g/kg
        proteinPct = 35;
        break;
      case "diabetes":
        proteinGrams = Math.round(tdee * 0.025);
        proteinPct = 30;
        break;
      case "thyroid":
        proteinGrams = Math.round(tdee * 0.022); // ~1.1g/kg
        proteinPct = 25;
        break;
    }

    const proteinCals = proteinGrams * 4;
    const carbPct = customGoal === "diabetes" || customGoal === "pcos" ? 40 : 45;
    const fatPct = 100 - proteinPct - carbPct;

    const carbCals = (dailyCals * carbPct) / 100;
    const fatCals = (dailyCals * fatPct) / 100;

    return {
      protein: proteinGrams,
      carbs: Math.round(carbCals / 4),
      fat: Math.round(fatCals / 9),
      calories: dailyCals,
    };
  }, [customGoal, tdee]);

  const matchingMeals = useMemo(() => {
    return filterMeals({ goal: customGoal }).slice(0, 8);
  }, [customGoal]);

  if (!isPremium) {
    return (
      <div style={{ padding: "20px", background: "var(--flag-soft)", borderRadius: "8px", textAlign: "center" }}>
        <p style={{ color: "var(--flag)", fontWeight: 600 }}>
          {T({ en: "🔒 Macro personalization is a Poshan Home feature", hi: "🔒 मैक्रो व्यक्तिगतकरण एक पोषण घर की सुविधा है" })}
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
          {T({ en: "Upgrade to unlock personalized protein, carbs, and fat targets based on your goal.",
               hi: "अपने लक्ष्य के आधार पर व्यक्तिगत प्रोटीन, कार्ब्स और वसा लक्ष्य पाने के लिए अपग्रेड करें।" })}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "100%", background: "var(--surface)", borderRadius: "12px", padding: "24px", border: "1px solid var(--line)" }}>
      <h2 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "0 0 20px 0" }}>
        {T({ en: "🎯 Your Personalized Macro Targets", hi: "🎯 आपके व्यक्तिगत मैक्रो लक्ष्य" })}
      </h2>

      {/* Goal Selector */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "12px", color: "var(--ink-soft)" }}>
          {T({ en: "Select your goal:", hi: "अपना लक्ष्य चुनें:" })}
        </label>
        <select
          value={customGoal}
          onChange={(e) => setCustomGoal(e.target.value as GoalKey)}
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
          {GOALS.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label.en} • {g.focus.en}
            </option>
          ))}
        </select>
      </div>

      {/* Macro Targets Display */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {/* Protein */}
        <div style={{ padding: "16px", background: "var(--flag-soft)", borderRadius: "8px", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
            {T({ en: "Protein", hi: "प्रोटीन" })}
          </p>
          <p style={{ margin: "0", fontSize: "1.8rem", fontWeight: 700, color: "var(--flag)" }}>{macroTargets.protein}g</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--ink-soft)" }}>
            ~{Math.round((macroTargets.protein * 4) / macroTargets.calories * 100)}%
          </p>
        </div>

        {/* Carbs */}
        <div style={{ padding: "16px", background: "var(--consumer-soft)", borderRadius: "8px", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
            {T({ en: "Carbs", hi: "कार्ब्स" })}
          </p>
          <p style={{ margin: "0", fontSize: "1.8rem", fontWeight: 700, color: "var(--consumer)" }}>{macroTargets.carbs}g</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--ink-soft)" }}>
            ~{Math.round((macroTargets.carbs * 4) / macroTargets.calories * 100)}%
          </p>
        </div>

        {/* Fat */}
        <div style={{ padding: "16px", background: "var(--clinical-soft)", borderRadius: "8px", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
            {T({ en: "Fat", hi: "वसा" })}
          </p>
          <p style={{ margin: "0", fontSize: "1.8rem", fontWeight: 700, color: "var(--clinical)" }}>{macroTargets.fat}g</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--ink-soft)" }}>
            ~{Math.round((macroTargets.fat * 9) / macroTargets.calories * 100)}%
          </p>
        </div>

        {/* Total Calories */}
        <div style={{ padding: "16px", background: "var(--elaichi-soft)", borderRadius: "8px", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "0.8rem", color: "var(--ink-soft)", fontWeight: 600 }}>
            {T({ en: "Daily Target", hi: "दैनिक लक्ष्य" })}
          </p>
          <p style={{ margin: "0", fontSize: "1.8rem", fontWeight: 700, color: "var(--elaichi)" }}>{macroTargets.calories}</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--ink-soft)" }}>kcal</p>
        </div>
      </div>

      {/* Goal Focus */}
      <div style={{ marginBottom: "20px", padding: "16px", background: "var(--surface-2)", borderRadius: "8px" }}>
        <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", fontWeight: 600, color: "var(--ink-soft)" }}>
          {T({ en: "Focus on:", hi: "ध्यान दें:" })}
        </p>
        <p style={{ margin: "0", fontSize: "1rem", color: "var(--ink)", fontWeight: 500 }}>
          {GOALS.find((g) => g.key === customGoal)?.focus.en}
        </p>
      </div>

      {/* Show matching meals */}
      <button
        onClick={() => setShowMeals(!showMeals)}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          fontSize: "0.95rem",
          fontWeight: 600,
          cursor: "pointer",
          color: "var(--ink)",
        }}
      >
        {showMeals ? "▼" : "▶"} {T({ en: "See matching meals", hi: "मेल खाने वाले भोजन देखें" })}
      </button>

      {showMeals && matchingMeals.length > 0 && (
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem" }}>
            {T({ en: "Top meals for your goal:", hi: "आपके लक्ष्य के लिए शीर्ष भोजन:" })}
          </h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {matchingMeals.map((meal) => (
              <div
                key={meal.id}
                style={{
                  padding: "12px",
                  background: "var(--surface-2)",
                  borderRadius: "6px",
                  borderLeft: "3px solid var(--consumer)",
                }}
              >
                <p style={{ margin: "0 0 4px 0", fontWeight: 600, fontSize: "0.95rem" }}>{meal.name.en}</p>
                <p style={{ margin: "0", fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                  {meal.kcal} kcal • P:{meal.macros.protein}g C:{meal.macros.carbohydrate}g F:{meal.macros.fat}g
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
