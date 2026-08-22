"use client";

import { useState, useMemo } from "react";
import { useLang } from "./lang-provider";
import { FoodScanner } from "./food-scanner";
import { MEAL_LIBRARY, REGIONS, DIETS, filterMeals, type RegionKey, type DietKey, type GoalKey } from "@/lib/poshan-data";

export function MealsShowcase({
  isPremium,
  goal,
}: {
  isPremium: boolean;
  goal?: GoalKey;
}) {
  const { T } = useLang();
  const [selectedRegion, setSelectedRegion] = useState<RegionKey | null>(null);
  const [selectedDiet, setSelectedDiet] = useState<DietKey | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMeals = useMemo(() => {
    return filterMeals({
      region: selectedRegion,
      category: selectedDiet === "vegan" || selectedDiet === "jain" ? "veg" : selectedDiet === "egg" ? "nonveg" : null,
      goal: goal,
    }).filter((m) => {
      if (!searchTerm) return true;
      return m.name.en.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [selectedRegion, selectedDiet, searchTerm, goal]);

  return (
    <div style={{ maxWidth: "100%", padding: "24px" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 24px 0" }}>
        {T({ en: "🍛 Meal Library (130+ Dishes)", hi: "🍛 भोजन पुस्तकालय (130+ व्यंजन)" })}
      </h1>

      {/* Food Scanner */}
      <FoodScanner isPremium={isPremium} />

      {/* Filters */}
      <div style={{ marginBottom: "32px", padding: "20px", background: "var(--surface-2)", borderRadius: "12px" }}>
        {/* Search */}
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder={T({ en: "Search meals...", hi: "भोजन खोजें..." })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              fontSize: "1rem",
              background: "var(--surface)",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* Region Filter */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "10px" }}>
            {T({ en: "Region:", hi: "क्षेत्र:" })}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "10px" }}>
            <button
              onClick={() => setSelectedRegion(null)}
              style={{
                padding: "8px 12px",
                border: selectedRegion === null ? "2px solid var(--consumer)" : "1px solid var(--line)",
                borderRadius: "6px",
                background: selectedRegion === null ? "var(--consumer)" : "var(--surface)",
                color: selectedRegion === null ? "#fff" : "var(--ink)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {T({ en: "All", hi: "सभी" })}
            </button>
            {REGIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelectedRegion(r.key)}
                style={{
                  padding: "8px 12px",
                  border: selectedRegion === r.key ? "2px solid var(--consumer)" : "1px solid var(--line)",
                  borderRadius: "6px",
                  background: selectedRegion === r.key ? "var(--consumer)" : "var(--surface)",
                  color: selectedRegion === r.key ? "#fff" : "var(--ink)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {r.label.en}
              </button>
            ))}
          </div>
        </div>

        {/* Diet Filter */}
        <div>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "10px" }}>
            {T({ en: "Diet:", hi: "आहार:" })}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "10px" }}>
            <button
              onClick={() => setSelectedDiet(null)}
              style={{
                padding: "8px 12px",
                border: selectedDiet === null ? "2px solid var(--flag)" : "1px solid var(--line)",
                borderRadius: "6px",
                background: selectedDiet === null ? "var(--flag)" : "var(--surface)",
                color: selectedDiet === null ? "#fff" : "var(--ink)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {T({ en: "All", hi: "सभी" })}
            </button>
            {DIETS.map((d) => (
              <button
                key={d.key}
                onClick={() => setSelectedDiet(d.key)}
                style={{
                  padding: "8px 12px",
                  border: selectedDiet === d.key ? "2px solid var(--flag)" : "1px solid var(--line)",
                  borderRadius: "6px",
                  background: selectedDiet === d.key ? "var(--flag)" : "var(--surface)",
                  color: selectedDiet === d.key ? "#fff" : "var(--ink)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {d.label.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Info */}
      <p style={{ marginBottom: "20px", color: "var(--ink-soft)", fontSize: "0.95rem" }}>
        {T({ en: `Showing ${filteredMeals.length} meal${filteredMeals.length !== 1 ? "s" : ""}`, hi: `${filteredMeals.length} भोजन दिखा रहे हैं` })}
        {goal && ` ${T({ en: "optimized for", hi: "के लिए अनुकूलित" })} ${goal}`}
      </p>

      {/* Meals Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {filteredMeals.map((meal) => (
          <div
            key={meal.id}
            style={{
              padding: "16px",
              background: "var(--surface-2)",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              transition: "all 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            {/* Name */}
            <p style={{ margin: "0 0 8px 0", fontWeight: 700, fontSize: "1rem" }}>{meal.name.en}</p>

            {/* Region & Time */}
            <p style={{ margin: "0 0 8px 0", fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              📍 {meal.region.toUpperCase()} • {meal.time}
            </p>

            {/* Calories & Macros */}
            <div
              style={{
                background: "var(--surface)",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "12px",
              }}
            >
              <p style={{ margin: "0 0 6px 0", fontWeight: 600, fontSize: "1.1rem", color: "var(--consumer)" }}>
                {meal.kcal} kcal
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "0.8rem" }}>
                <div>
                  <p style={{ margin: "0 0 2px 0", color: "var(--ink-soft)" }}>P</p>
                  <p style={{ margin: "0", fontWeight: 600 }}>{meal.macros.protein}g</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 2px 0", color: "var(--ink-soft)" }}>C</p>
                  <p style={{ margin: "0", fontWeight: 600 }}>{meal.macros.carbohydrate}g</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 2px 0", color: "var(--ink-soft)" }}>F</p>
                  <p style={{ margin: "0", fontWeight: 600 }}>{meal.macros.fat}g</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {meal.tags.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {meal.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "0.7rem",
                      background: "var(--flag-soft)",
                      color: "var(--flag)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontWeight: 600,
                    }}
                  >
                    {tag === "highProtein"
                      ? "Hi-Protein"
                      : tag === "lowGi"
                        ? "Low GI"
                        : tag === "ironRich"
                          ? "Iron+"
                          : tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </span>
                ))}
              </div>
            )}

            {/* Note */}
            <p
              style={{
                margin: "12px 0 0 0",
                fontSize: "0.85rem",
                color: "var(--ink-soft)",
                lineHeight: 1.4,
              }}
            >
              {meal.note.en}
            </p>
          </div>
        ))}
      </div>

      {filteredMeals.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ fontSize: "1.1rem", color: "var(--ink-soft)" }}>
            {T({ en: "No meals match your filters", hi: "कोई भोजन आपके फ़िल्टर से मेल नहीं खाता" })}
          </p>
        </div>
      )}
    </div>
  );
}
