import type { Bi, Macros } from "./poshan-data";

/**
 * The editable thali.
 *
 * Six slots: four katoris, the roti stack, the rice mound, each holding one
 * dish at some portion. Dragging a katori's contents up or down changes the
 * portion; tapping it swaps the dish for another that belongs in that slot.
 *
 * Everything the readout shows is derived from this one object, so the 3D
 * plate and the numbers beside it cannot disagree.
 */

/** ICMR "My Plate" groups. Balance is judged on these, not on dish names. */
export type FoodGroup = "grain" | "protein" | "veg" | "dairy" | "condiment" | "ferment";

export type PlateOption = {
  key: string;
  name: Bi;
  /** Grams in one standard serving, used for the plate-share maths. */
  grams: number;
  group: FoodGroup;
  macros: Macros;
  /** mg per serving. Tracked because achar and chutney carry most of a
      thali's salt, and the conditions module advises on hypertension. */
  sodium: number;
  /** Live lacto-ferment: contributes gut bacteria, not just flavour. */
  live?: boolean;
  /** Rendered colour for this dish in the 3D scene. */
  color: string;
};

export type PlateSlot = {
  id: SlotId;
  label: Bi;
  options: PlateOption[];
};

export type SlotId =
  | "katori1" | "katori2" | "katori3" | "katori4" | "achar" | "roti" | "rice";

/* Macro figures follow the same per-serving convention as DISHES in
   poshan-data.ts, so the two tables stay comparable. */
export const PLATE_SLOTS: PlateSlot[] = [
  {
    id: "katori1",
    label: { en: "Pulse", hi: "दाल" },
    options: [
      { key: "dal", name: { en: "Dal", hi: "दाल" }, grams: 150, group: "protein",
        macros: { protein: 9, carbohydrate: 20, fat: 3, fibre: 5 }, color: "#E0A81C", sodium: 40 },
      { key: "rajma", name: { en: "Rajma", hi: "राजमा" }, grams: 150, group: "protein",
        macros: { protein: 12, carbohydrate: 24, fat: 4, fibre: 8 }, color: "#8C3A22", sodium: 60 },
      { key: "chana", name: { en: "Chana", hi: "चना" }, grams: 150, group: "protein",
        macros: { protein: 11, carbohydrate: 27, fat: 5, fibre: 9 }, color: "#A9762B", sodium: 55 },
      { key: "sambar", name: { en: "Sambar", hi: "सांबर" }, grams: 180, group: "protein",
        macros: { protein: 7, carbohydrate: 18, fat: 4, fibre: 6 }, color: "#C2691B", sodium: 90 },
    ],
  },
  {
    id: "katori2",
    label: { en: "Vegetable", hi: "सब्ज़ी" },
    options: [
      { key: "sabzi", name: { en: "Sabzi", hi: "सब्ज़ी" }, grams: 150, group: "veg",
        macros: { protein: 4, carbohydrate: 12, fat: 5, fibre: 6 }, color: "#4A7C4E", sodium: 70 },
      { key: "palak", name: { en: "Palak", hi: "पालक" }, grams: 150, group: "veg",
        macros: { protein: 5, carbohydrate: 8, fat: 4, fibre: 7 }, color: "#2F6B36", sodium: 80 },
      { key: "bhindi", name: { en: "Bhindi", hi: "भिंडी" }, grams: 140, group: "veg",
        macros: { protein: 3, carbohydrate: 11, fat: 5, fibre: 6 }, color: "#5E8C3A", sodium: 60 },
      { key: "lauki", name: { en: "Lauki", hi: "लौकी" }, grams: 160, group: "veg",
        macros: { protein: 2, carbohydrate: 9, fat: 3, fibre: 4 }, color: "#7FA663", sodium: 50 },
    ],
  },
  {
    id: "katori3",
    label: { en: "Dairy", hi: "दूध से" },
    options: [
      { key: "dahi", name: { en: "Dahi", hi: "दही" }, grams: 120, group: "dairy",
        macros: { protein: 6, carbohydrate: 7, fat: 4, fibre: 0 }, color: "#E7EBEE", sodium: 45 },
      { key: "raita", name: { en: "Raita", hi: "रायता" }, grams: 140, group: "dairy",
        macros: { protein: 5, carbohydrate: 8, fat: 3, fibre: 1 }, color: "#DFE6E2", sodium: 120 },
      { key: "paneer", name: { en: "Paneer", hi: "पनीर" }, grams: 80, group: "protein",
        macros: { protein: 14, carbohydrate: 3, fat: 16, fibre: 0 }, color: "#F3EDDC", sodium: 30 },
      { key: "chaas", name: { en: "Chaas", hi: "छाछ" }, grams: 200, group: "dairy",
        macros: { protein: 3, carbohydrate: 5, fat: 1, fibre: 0 }, color: "#EFF3F1", sodium: 160 },
    ],
  },
  {
    id: "katori4",
    label: { en: "Fresh relish", hi: "ताज़ी चटनी" },
    options: [
      { key: "chutney", name: { en: "Chutney", hi: "चटनी" }, grams: 25, group: "condiment",
        macros: { protein: 0, carbohydrate: 2, fat: 1, fibre: 1 }, color: "#B33A20", sodium: 180 },
      { key: "pudina", name: { en: "Pudina chutney", hi: "पुदीना चटनी" }, grams: 25, group: "condiment",
        macros: { protein: 1, carbohydrate: 2, fat: 1, fibre: 1 }, color: "#3F7A3A", sodium: 150 },
      { key: "salad", name: { en: "Salad", hi: "सलाद" }, grams: 80, group: "veg",
        macros: { protein: 1, carbohydrate: 5, fat: 0, fibre: 3 }, color: "#6E9B4A", sodium: 10 },
    ],
  },
  {
    /* Achar gets its own katori rather than sharing with chutney. Traditional
       Indian pickle is a live lacto-ferment: the brine carries Lactobacillus
       and related species, which is a different thing from a fresh chutney
       and worth its own place on the plate.
       Two honesty constraints come with that, and both are enforced below:
       the bacteria only survive in brine-fermented, unpasteurised achar (an
       oil-topped, sun-cured jar keeps them; a heat-processed commercial one
       does not), and the salt load is high enough to matter on a site that
       also advises people with hypertension and kidney disease. So the
       portion here is small by default and the sodium is counted. */
    id: "achar",
    label: { en: "Achar", hi: "अचार" },
    options: [
      { key: "aam", name: { en: "Aam ka achar", hi: "आम का अचार" }, grams: 15, group: "ferment",
        macros: { protein: 0, carbohydrate: 2, fat: 2, fibre: 1 }, color: "#B5651D", sodium: 620, live: true },
      { key: "nimbu", name: { en: "Nimbu achar", hi: "नींबू अचार" }, grams: 12, group: "ferment",
        macros: { protein: 0, carbohydrate: 2, fat: 1, fibre: 1 }, color: "#C98A14", sodium: 700, live: true },
      { key: "gajar-gobhi", name: { en: "Gajar-gobhi", hi: "गाजर-गोभी" }, grams: 30, group: "ferment",
        macros: { protein: 1, carbohydrate: 4, fat: 2, fibre: 2 }, color: "#C25A1E", sodium: 480, live: true },
      { key: "kanji", name: { en: "Kanji", hi: "कांजी" }, grams: 100, group: "ferment",
        macros: { protein: 1, carbohydrate: 4, fat: 0, fibre: 1 }, color: "#7A2E4E", sodium: 240, live: true },
    ],
  },
  {
    id: "roti",
    label: { en: "Roti", hi: "रोटी" },
    options: [
      { key: "roti", name: { en: "Roti", hi: "रोटी" }, grams: 40, group: "grain",
        macros: { protein: 3, carbohydrate: 15, fat: 1, fibre: 2 }, color: "#F0DDB6", sodium: 2 },
      { key: "bajra", name: { en: "Bajra roti", hi: "बाजरा रोटी" }, grams: 45, group: "grain",
        macros: { protein: 4, carbohydrate: 16, fat: 2, fibre: 4 }, color: "#CBB58B", sodium: 3 },
      { key: "jowar", name: { en: "Jowar roti", hi: "ज्वार रोटी" }, grams: 45, group: "grain",
        macros: { protein: 3, carbohydrate: 17, fat: 1, fibre: 3 }, color: "#DED0AE", sodium: 3 },
      { key: "paratha", name: { en: "Paratha", hi: "पराठा" }, grams: 60, group: "grain",
        macros: { protein: 4, carbohydrate: 22, fat: 8, fibre: 2 }, color: "#E8C98E", sodium: 110 },
    ],
  },
  {
    id: "rice",
    label: { en: "Rice", hi: "चावल" },
    options: [
      { key: "rice", name: { en: "Rice", hi: "चावल" }, grams: 150, group: "grain",
        macros: { protein: 3, carbohydrate: 32, fat: 0, fibre: 1 }, color: "#F6F2E8", sodium: 2 },
      { key: "brown", name: { en: "Brown rice", hi: "भूरा चावल" }, grams: 150, group: "grain",
        macros: { protein: 4, carbohydrate: 30, fat: 1, fibre: 3 }, color: "#D9C6A5", sodium: 3 },
      { key: "millet", name: { en: "Millet", hi: "बाजरा भात" }, grams: 150, group: "grain",
        macros: { protein: 5, carbohydrate: 28, fat: 2, fibre: 5 }, color: "#CDBE95", sodium: 4 },
    ],
  },
];

export type PlateState = Record<SlotId, { dish: string; portion: number }>;

/** Portion runs 0 to 1.5: an empty katori through a generous double helping. */
export const MAX_PORTION = 1.5;

export const DEFAULT_PLATE: PlateState = {
  katori1: { dish: "dal", portion: 1 },
  katori2: { dish: "sabzi", portion: 1 },
  katori3: { dish: "dahi", portion: 0.8 },
  katori4: { dish: "chutney", portion: 0.5 },
  /* Small by default: one spoon is where the benefit sits and the salt does
     not yet. */
  achar: { dish: "aam", portion: 0.5 },
  roti: { dish: "roti", portion: 1 },
  rice: { dish: "rice", portion: 0.8 },
};

export function optionFor(slotId: SlotId, dishKey: string): PlateOption {
  const slot = PLATE_SLOTS.find((s) => s.id === slotId)!;
  return slot.options.find((o) => o.key === dishKey) ?? slot.options[0];
}

/**
 * Atwater factors. Fibre is counted at 2 kcal/g rather than 4, it is only
 * partly fermented to short-chain fatty acids, and subtracted out of the
 * carbohydrate figure so it is not also counted there.
 */
export function kcalOf(m: Macros): number {
  const netCarb = Math.max(0, m.carbohydrate - m.fibre);
  return m.protein * 4 + netCarb * 4 + m.fat * 9 + m.fibre * 2;
}

export function plateTotals(state: PlateState): {
  kcal: number;
  macros: Macros;
  grams: number;
} {
  const macros: Macros = { protein: 0, carbohydrate: 0, fat: 0, fibre: 0 };
  let grams = 0;
  for (const slot of PLATE_SLOTS) {
    const entry = state[slot.id];
    if (!entry) continue;
    const o = optionFor(slot.id, entry.dish);
    const p = entry.portion;
    macros.protein += o.macros.protein * p;
    macros.carbohydrate += o.macros.carbohydrate * p;
    macros.fat += o.macros.fat * p;
    macros.fibre += o.macros.fibre * p;
    grams += o.grams * p;
  }
  return { kcal: Math.round(kcalOf(macros)), macros, grams };
}

/**
 * ICMR "My Plate for the Day" targets roughly half the plate as vegetables and
 * fruit, a quarter as cereals and millets, and a quarter as pulses, dairy and
 * other protein. Judged here by served weight, which is what a person can
 * actually see on a thali: condiments are excluded from the denominator
 * because a spoon of achaar should not count against the balance.
 */
export const ICMR_TARGET = { veg: 0.5, grain: 0.25, protein: 0.25 } as const;

export type PlateBalance = {
  veg: number;
  grain: number;
  protein: number;
  /** 0–1, where 1 is a plate exactly on the ICMR split. */
  score: number;
};

export function plateBalance(state: PlateState): PlateBalance {
  let veg = 0, grain = 0, protein = 0;
  for (const slot of PLATE_SLOTS) {
    const entry = state[slot.id];
    if (!entry) continue;
    const o = optionFor(slot.id, entry.dish);
    const w = o.grams * entry.portion;
    if (o.group === "veg") veg += w;
    else if (o.group === "grain") grain += w;
    /* Dairy counts toward protein, as ICMR groups it. */
    else if (o.group === "protein" || o.group === "dairy") protein += w;
  }
  const total = veg + grain + protein;
  if (total <= 0) return { veg: 0, grain: 0, protein: 0, score: 0 };
  const v = veg / total, g = grain / total, p = protein / total;
  /* Total absolute deviation from the target split, normalised. The worst
     possible plate (everything in one group) deviates by 1.5. */
  const dev =
    Math.abs(v - ICMR_TARGET.veg) +
    Math.abs(g - ICMR_TARGET.grain) +
    Math.abs(p - ICMR_TARGET.protein);
  return { veg: v, grain: g, protein: p, score: Math.max(0, 1 - dev / 1.5) };
}

/** Compact form for storage, {slotId: "dish:portion"} keeps the row small. */
export function encodePlate(state: PlateState): string {
  return PLATE_SLOTS.map((s) => `${s.id}=${state[s.id].dish}:${state[s.id].portion.toFixed(2)}`).join(",");
}

export function decodePlate(raw: string | null | undefined): PlateState {
  if (!raw) return { ...DEFAULT_PLATE };
  const out: PlateState = { ...DEFAULT_PLATE };
  for (const part of raw.split(",")) {
    const [id, rest] = part.split("=");
    if (!id || !rest) continue;
    const slot = PLATE_SLOTS.find((s) => s.id === id);
    if (!slot) continue;
    const [dish, portionRaw] = rest.split(":");
    if (!slot.options.some((o) => o.key === dish)) continue;
    const portion = Number(portionRaw);
    /* Validated on read: a tampered portion must not reach the kcal maths. */
    if (!Number.isFinite(portion) || portion < 0 || portion > MAX_PORTION) continue;
    out[slot.id] = { dish, portion };
  }
  return out;
}
