import { describe, it, expect } from "vitest";
import { unitForDish, formatQty, prescribePortion, prescribeMeal, approxGrams } from "./portion";

/**
 * Portion maths is the highest-consequence arithmetic in the app that a
 * user acts on directly: this is the number that decides how much someone
 * puts on their plate. An off-by-one in the servable rounding is not a
 * cosmetic bug — it is a third of a meal.
 */

const dish = (en: string, kcal = 200, note = "") => ({
  name: { en, hi: en },
  note: { en: note, hi: note },
  kcal,
});

describe("unitForDish", () => {
  it("serves breads as rotis", () => {
    expect(unitForDish(dish("Roti"))).toBe("roti");
    expect(unitForDish(dish("Aloo paratha"))).toBe("roti");
    expect(unitForDish(dish("Thepla"))).toBe("roti");
  });

  it("serves countable items as pieces", () => {
    expect(unitForDish(dish("Idli"))).toBe("piece");
    expect(unitForDish(dish("Masala dosa"))).toBe("piece");
    expect(unitForDish(dish("Boiled egg"))).toBe("piece");
  });

  it("serves drinks as glasses", () => {
    expect(unitForDish(dish("Sweet lassi"))).toBe("glass");
    expect(unitForDish(dish("Chaas"))).toBe("glass");
  });

  it("serves composed meals as plates", () => {
    expect(unitForDish(dish("Veg biryani"))).toBe("plate");
    expect(unitForDish(dish("Gujarati thali"))).toBe("plate");
    expect(unitForDish(dish("Moong dal khichdi"))).toBe("plate");
  });

  it("serves wet dishes as katoris", () => {
    expect(unitForDish(dish("Dal tadka"))).toBe("katori");
    expect(unitForDish(dish("Rajma"))).toBe("katori");
    expect(unitForDish(dish("Curd"))).toBe("katori");
  });

  it("falls back to a bowl for anything unrecognised", () => {
    expect(unitForDish(dish("Something nobody named"))).toBe("bowl");
  });

  it("reads the note as well as the name", () => {
    expect(unitForDish(dish("House special", 200, "Served with one roti"))).toBe("roti");
  });

  it("reads plurals, which is how the meal library's notes are written", () => {
    /* Regression: `roti` does not match "2 rotis", so every dish whose
       only bread signal was in a plural note fell through to the bowl
       fallback. 11 notes in poshan-data.ts are written that way. */
    expect(unitForDish(dish("Paneer palak", 380, "180 g paneer with spinach & 2 rotis"))).toBe(
      "roti"
    );
    expect(unitForDish(dish("Breakfast", 200, "3 idlis with sambar"))).toBe("piece");
  });

  it("is case-insensitive", () => {
    expect(unitForDish(dish("DAL FRY"))).toBe("katori");
  });
});

describe("formatQty", () => {
  it("writes fractions as glyphs, not decimals", () => {
    expect(formatQty(0.5, "katori", "en")).toBe("½ katori");
    expect(formatQty(0.25, "katori", "en")).toBe("¼ katori");
    expect(formatQty(1.5, "katori", "en")).toBe("1½ katoris");
    expect(formatQty(2.75, "roti", "en")).toBe("2¾ rotis");
  });

  it("pluralises in English only above one", () => {
    expect(formatQty(1, "roti", "en")).toBe("1 roti");
    expect(formatQty(2, "roti", "en")).toBe("2 rotis");
    expect(formatQty(0.5, "roti", "en")).toBe("½ roti");
  });

  it("does not pluralise in Hindi, where these nouns don't inflect", () => {
    expect(formatQty(1, "roti", "hi")).toBe("1 रोटी");
    expect(formatQty(3, "roti", "hi")).toBe("3 रोटी");
  });
});

describe("prescribePortion", () => {
  it("returns the target exactly when it lands on a whole serving", () => {
    const p = prescribePortion(dish("Dal", 200), 400);
    expect(p.qty).toBe(2);
    expect(p.kcal).toBe(400);
    expect(p.unit).toBe("katori");
  });

  it("rounds to halves, never to arbitrary decimals", () => {
    /* 260/200 = 1.3 servings. A user cannot serve 1.3 katoris. */
    const p = prescribePortion(dish("Dal", 200), 260);
    expect(p.qty).toBe(1.5);
  });

  it("floors at a quarter rather than prescribing a trace", () => {
    const p = prescribePortion(dish("Dal", 200), 10);
    expect(p.qty).toBe(0.25);
  });

  it("drops fractions above three units", () => {
    const p = prescribePortion(dish("Roti", 80), 340); // 4.25 servings
    expect(p.qty).toBe(4);
    expect(Number.isInteger(p.qty)).toBe(true);
  });

  it("reports the energy actually prescribed, not the energy asked for", () => {
    /* After rounding up to a servable fraction these differ, and showing
       the target would be reporting a number the user is not eating. */
    const p = prescribePortion(dish("Dal", 200), 260);
    expect(p.qty).toBe(1.5);
    expect(p.kcal).toBe(300);
    expect(p.kcal).not.toBe(260);
  });

  it("prescribes fewer units for a bigger katori", () => {
    const standard = prescribePortion(dish("Dal", 200), 400, 1);
    const big = prescribePortion(dish("Dal", 200), 400, 1.5);
    expect(big.qty).toBeLessThan(standard.qty);
  });

  it("prescribes more units for a smaller katori", () => {
    const standard = prescribePortion(dish("Dal", 200), 400, 1);
    const small = prescribePortion(dish("Dal", 200), 400, 0.75);
    expect(small.qty).toBeGreaterThan(standard.qty);
  });

  it("ignores a corrupt portion scale instead of producing Infinity", () => {
    for (const bad of [0, -1, 4, 99, Number.NaN]) {
      const p = prescribePortion(dish("Dal", 200), 400, bad);
      expect(Number.isFinite(p.qty)).toBe(true);
      expect(Number.isFinite(p.kcal)).toBe(true);
      expect(p.qty).toBe(2); // i.e. fell back to scale 1
    }
  });

  it("survives a dish recorded with no energy", () => {
    const p = prescribePortion(dish("Mystery", 0), 400);
    expect(Number.isFinite(p.qty)).toBe(true);
    expect(p.kcal).toBe(0);
  });

  it("carries pre-formatted text for both languages", () => {
    const p = prescribePortion(dish("Dal", 200), 300);
    expect(p.text.en).toBe("1½ katoris");
    expect(p.text.hi).toContain("कटोरी");
  });
});

describe("prescribeMeal", () => {
  it("splits by each dish's recorded energy, not evenly", () => {
    /* A thali of dal and rice should not be equal katoris of both. */
    const portions = prescribeMeal([dish("Dal", 100), dish("Jeera rice", 300)], 800);
    expect(portions).toHaveLength(2);
    const total = portions.reduce((s, p) => s + p.kcal, 0);
    expect(total).toBeGreaterThan(700);
    expect(total).toBeLessThan(900);
  });

  it("keeps roughly the meal's own proportions", () => {
    const [dal, rice] = prescribeMeal([dish("Dal", 100), dish("Jeera rice", 300)], 800);
    expect(rice.kcal).toBeGreaterThan(dal.kcal * 2);
  });

  it("does not divide by zero when nothing carries energy", () => {
    const portions = prescribeMeal([dish("A", 0), dish("B", 0)], 500);
    expect(portions).toHaveLength(2);
    for (const p of portions) expect(Number.isFinite(p.kcal)).toBe(true);
  });

  it("handles an empty meal", () => {
    expect(prescribeMeal([], 500)).toEqual([]);
  });
});

describe("approxGrams", () => {
  it("converts a portion to a whole number of grams", () => {
    const p = prescribePortion(dish("Dal", 200), 400);
    const g = approxGrams(p);
    expect(Number.isInteger(g)).toBe(true);
    expect(g).toBeGreaterThan(0);
  });

  it("scales with the user's own vessel", () => {
    const p = prescribePortion(dish("Dal", 200), 400);
    expect(approxGrams(p, 1.5)).toBeGreaterThan(approxGrams(p, 1));
  });
});
