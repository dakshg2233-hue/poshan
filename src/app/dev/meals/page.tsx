/**
 * Developer Preview: Meal Library
 * Shows all 1000+ meals for development/testing
 * Remove this page before production
 */

"use client";

import { useState, useMemo } from "react";
import {
  MEAL_LIBRARY,
  COLLECTIONS,
  filterMeals,
  countByCollection,
  REGIONS,
  DIETS,
  type RegionKey,
  type FoodCategory,
  type MealTime,
  type CollectionKey,
} from "@/lib/poshan-data";

export default function DevMealsPage() {
  const [selectedRegion, setSelectedRegion] = useState<RegionKey | null>(null);
  const [selectedDiet, setSelectedDiet] = useState<FoodCategory | null>(null);
  const [selectedTime, setSelectedTime] = useState<MealTime | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<CollectionKey | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const collectionCounts = useMemo(() => countByCollection(), []);

  const filteredMeals = useMemo(() => {
    return filterMeals({
      region: selectedRegion,
      category: selectedDiet,
      time: selectedTime,
      collection: selectedCollection,
    }).filter((m) => {
      if (!searchTerm) return true;
      return (
        m.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.name.hi.includes(searchTerm)
      );
    });
  }, [selectedRegion, selectedDiet, selectedTime, selectedCollection, searchTerm]);

  return (
    <div className="min-h-screen p-4" style={{ background: "var(--roti)" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: "var(--ink)" }}
          >
            🍽️ Developer Meal Library Preview
          </h1>
          <p style={{ color: "var(--ink-soft)" }}>
            Total Meals: <strong>{MEAL_LIBRARY.length}</strong> | Filtered:
            <strong> {filteredMeals.length}</strong>
          </p>
        </div>

        {/* Filters */}
        <div
          className="p-6 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-5 gap-4"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          {/* Collection (shelf) Filter */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "var(--ink-soft)" }}
            >
              Shelf
            </label>
            <select
              value={selectedCollection || ""}
              onChange={(e) => setSelectedCollection((e.target.value || null) as CollectionKey | null)}
              className="w-full p-2 rounded-lg outline-none"
              style={{
                background: "var(--roti)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              <option value="">All Shelves</option>
              {COLLECTIONS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label.en} ({collectionCounts[c.key]})
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "var(--ink-soft)" }}
            >
              Region
            </label>
            <select
              value={selectedRegion || ""}
              onChange={(e) => setSelectedRegion((e.target.value || null) as RegionKey | null)}
              className="w-full p-2 rounded-lg outline-none"
              style={{
                background: "var(--roti)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              <option value="">All Regions</option>
              {REGIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label.en}
                </option>
              ))}
            </select>
          </div>

          {/* Diet Filter */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "var(--ink-soft)" }}
            >
              Diet
            </label>
            <select
              value={selectedDiet || ""}
              onChange={(e) => setSelectedDiet((e.target.value || null) as FoodCategory | null)}
              className="w-full p-2 rounded-lg outline-none"
              style={{
                background: "var(--roti)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              <option value="">All Diets</option>
              {DIETS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label.en}
                </option>
              ))}
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "var(--ink-soft)" }}
            >
              Time
            </label>
            <select
              value={selectedTime || ""}
              onChange={(e) => setSelectedTime((e.target.value || null) as MealTime | null)}
              className="w-full p-2 rounded-lg outline-none"
              style={{
                background: "var(--roti)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            >
              <option value="">All Times</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "var(--ink-soft)" }}
            >
              Search
            </label>
            <input
              type="text"
              placeholder="Search meals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 rounded-lg outline-none"
              style={{
                background: "var(--roti)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>

        {/* Meals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeals.map((meal) => (
            <div
              key={meal.id}
              className="p-4 rounded-lg border hover:shadow-lg transition-shadow"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              {/* Meal Name */}
              <h3 className="font-bold mb-1" style={{ color: "var(--ink)" }}>
                {meal.name.en}
              </h3>
              <p
                className="text-sm mb-3"
                style={{ color: "var(--ink-soft)" }}
              >
                {meal.name.hi}
              </p>

              {/* Meta Info */}
              <div
                className="text-xs mb-3 flex flex-wrap gap-2"
                style={{ color: "var(--ink-soft)" }}
              >
                <span className="px-2 py-1 rounded" style={{ background: "var(--roti)" }}>
                  {meal.region ?? "pan-indian"}
                </span>
                <span className="px-2 py-1 rounded" style={{ background: "var(--roti)" }}>
                  {meal.time}
                </span>
                <span className="px-2 py-1 rounded" style={{ background: "var(--roti)" }}>
                  {meal.collection ?? "classic"}
                </span>
                <span className="px-2 py-1 rounded" style={{ background: "var(--roti)" }}>
                  {meal.category}
                </span>
              </div>

              {/* Calories */}
              <div className="mb-3 p-2 rounded" style={{ background: "var(--roti)" }}>
                <span className="font-semibold" style={{ color: "var(--kesar)" }}>
                  {meal.kcal} kcal
                </span>
              </div>

              {/* Macros */}
              <div
                className="grid grid-cols-4 gap-2 text-xs mb-3"
                style={{ color: "var(--ink-soft)" }}
              >
                <div>
                  <span className="block font-bold" style={{ color: "var(--ink)" }}>
                    {meal.macros.protein}g
                  </span>
                  <span>Protein</span>
                </div>
                <div>
                  <span className="block font-bold" style={{ color: "var(--ink)" }}>
                    {meal.macros.carbohydrate}g
                  </span>
                  <span>Carbs</span>
                </div>
                <div>
                  <span className="block font-bold" style={{ color: "var(--ink)" }}>
                    {meal.macros.fat}g
                  </span>
                  <span>Fat</span>
                </div>
                <div>
                  <span className="block font-bold" style={{ color: "var(--ink)" }}>
                    {meal.macros.fibre}g
                  </span>
                  <span>Fiber</span>
                </div>
              </div>

              {/* Tags */}
              {meal.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {meal.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{
                        background: "var(--elaichi)",
                        color: "white",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Note */}
              <p
                className="text-xs italic border-t pt-2"
                style={{
                  borderColor: "var(--line)",
                  color: "var(--ink-soft)",
                }}
              >
                {meal.note.en}
              </p>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredMeals.length === 0 && (
          <div
            className="text-center py-12"
            style={{ color: "var(--ink-soft)" }}
          >
            <p className="text-lg">No meals found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
