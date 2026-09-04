"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProfile } from "@/lib/hooks/use-profile";
import type { GoalKey, DietKey, RegionKey } from "@/lib/poshan-data";
import { estimateMaintenanceKcal, type Sex, type ActivityLevel } from "@/lib/energy-requirement";

/**
 * The body profile: height, weight, goal, diet, region: with two tiers of
 * persistence:
 *
 *   signed in  → the profiles table, debounced
 *   signed out → localStorage
 *
 * The signed-out tier matters more than it looks. Most visitors will never
 * make an account, and losing your height and conditions on every refresh is
 * the single most annoying thing the site did. localStorage fixes that for
 * everyone, and the database simply takes over when there is an account.
 */

export type Body = {
  height: number;
  weight: number;
  goal: GoalKey;
  diet: DietKey;
  region: RegionKey;
  /* Optional on purpose, all three: a personalised maintenance-calorie
     estimate is additive to the BMI tool, which works fully without them.
     Defaulting sex in particular would mean silently guessing a value that
     changes the answer by ~450 kcal/day — worse than showing nothing until
     the person actually says. */
  age?: number;
  sex?: Sex;
  activityLevel?: ActivityLevel;
};

export const BODY_DEFAULTS: Body = {
  height: 168,
  weight: 63,
  goal: "loss",
  diet: "veg",
  region: "north",
};

const LOCAL_KEY = "poshan-body";
const DEBOUNCE_MS = 700;

function readLocal(): Body | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Body>;
    /* Validate rather than trust: a hand-edited localStorage value must not be
       able to push a nonsense height into the BMI maths. */
    const b: Body = {
      height: typeof p.height === "number" && p.height >= 80 && p.height <= 250 ? p.height : BODY_DEFAULTS.height,
      weight: typeof p.weight === "number" && p.weight >= 20 && p.weight <= 400 ? p.weight : BODY_DEFAULTS.weight,
      goal: (["loss", "muscle", "diabetes", "pcos", "thyroid"] as const).includes(p.goal as GoalKey)
        ? (p.goal as GoalKey) : BODY_DEFAULTS.goal,
      diet: (["veg", "nonveg", "vegan", "jain"] as const).includes(p.diet as DietKey)
        ? (p.diet as DietKey) : BODY_DEFAULTS.diet,
      region: (["north", "south", "east", "west"] as const).includes(p.region as RegionKey)
        ? (p.region as RegionKey) : BODY_DEFAULTS.region,
      age: typeof p.age === "number" && p.age >= 13 && p.age <= 120 ? p.age : undefined,
      sex: (["male", "female"] as const).includes(p.sex as Sex) ? (p.sex as Sex) : undefined,
      activityLevel: (["sedentary", "moderate", "heavy"] as const).includes(p.activityLevel as ActivityLevel)
        ? (p.activityLevel as ActivityLevel) : undefined,
    };
    return b;
  } catch {
    return null;
  }
}

/**
 * Resolves the starting values. Returns `ready: false` until it knows whether
 * there is a profile, so the consumer can mount its state seeded correctly
 * rather than seeding from defaults and then setting state in an effect:
 * which is both a flash of wrong data and a React 19 compiler lint error.
 */
export function useBodySource() {
  const { profile, loading, updateProfile } = useProfile();

  const initial: Body = (() => {
    if (loading) return BODY_DEFAULTS;
    if (profile) {
      return {
        height: profile.height_cm ?? BODY_DEFAULTS.height,
        weight: profile.weight_kg ?? BODY_DEFAULTS.weight,
        goal: (profile.goal as GoalKey) ?? BODY_DEFAULTS.goal,
        diet: (profile.diet as DietKey) ?? BODY_DEFAULTS.diet,
        region: (profile.region as RegionKey) ?? BODY_DEFAULTS.region,
        age: profile.age ?? undefined,
        sex: (profile.sex as Sex) ?? undefined,
        activityLevel: (profile.activity_level as ActivityLevel) ?? undefined,
      };
    }
    return readLocal() ?? BODY_DEFAULTS;
  })();

  /* Changes identity when the signed-in user changes, so the consumer can key
     off it and remount with fresh values. */
  const sourceKey = loading ? "loading" : profile?.id ?? "anon";

  const save = useCallback(
    (b: Body) => {
      /* Always mirror locally: it is free, and it means a signed-in user who
         later signs out does not lose what they were looking at. */
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(b));
      } catch {
        /* Private mode, quota, or storage disabled. Not worth failing over. */
      }
      if (!profile) return;
      const tdee =
        b.age && b.sex && b.activityLevel
          ? estimateMaintenanceKcal(b.weight, b.age, b.sex, b.activityLevel)
          : null;
      void updateProfile({
        height_cm: Math.round(b.height),
        weight_kg: b.weight,
        goal: b.goal,
        diet: b.diet,
        region: b.region,
        age: b.age ?? null,
        sex: b.sex ?? null,
        activity_level: b.activityLevel ?? null,
        tdee,
      });
    },
    [profile, updateProfile]
  );

  return { ready: !loading, sourceKey, initial, save, signedIn: Boolean(profile) };
}

/**
 * Owns the live values and writes them back, debounced. Mount this only once
 * `ready` is true, keyed on `sourceKey`, so useState seeds from real data.
 */
export function useBodyState(initial: Body, save: (b: Body) => void) {
  const [body, setBody] = useState<Body>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  const bodyRef = useRef(initial);

  /* Debounced write. Sliders fire continuously; without this every pixel of
     drag would be a database round trip. */
  useEffect(() => {
    /* Do not write the values we were just given: that would be an immediate
       no-op round trip on every mount. */
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(body), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [body, save]);

  /* Flush on unmount and on tab hide, so a quick edit followed by closing the
     tab is not silently lost inside the debounce window. */
  useEffect(() => {
    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        save(bodyRef.current);
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [save]);

  /* Kept so the flush above reads the latest value without making that effect
     depend on `body` and re-register on every keystroke. Written in an effect,
     not during render: a ref write while rendering is unsafe under concurrent
     rendering and React 19's compiler lint rejects it. */
  useEffect(() => {
    bodyRef.current = body;
  }, [body]);

  const set = useCallback(<K extends keyof Body>(k: K, v: Body[K]) => {
    setBody((b) => (b[k] === v ? b : { ...b, [k]: v }));
  }, []);

  return { body, set };
}
