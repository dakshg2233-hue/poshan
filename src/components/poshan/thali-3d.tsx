"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useLang } from "./lang-provider";
import type { GoalKey, DietKey } from "@/lib/poshan-data";
import type { Sex, ActivityLevel } from "@/lib/energy-requirement";

/** Only what the engine actually needs — not the full Body shape (no
 *  region: this visual doesn't use it). */
export interface Thali3DBody {
  height: number;
  weight: number;
  goal: GoalKey;
  diet: DietKey;
  age?: number;
  sex?: Sex;
  activityLevel?: ActivityLevel;
}

/**
 * The WebGL thali — portions morph to match the visitor's own numbers,
 * fed through a small standalone solver (public/vendor/poshan-engine.js)
 * that renders via public/vendor/thali3d.js. Both are plain vanilla JS
 * (no React, no bundler transform) loaded as real <script> tags so they
 * run exactly as authored; this component's job is only to bridge real
 * Poshan profile data into the shape that solver expects, reusing the
 * THREE.js already bundled via the npm package rather than loading a
 * second copy from a CDN.
 *
 * Deliberately illustrative, not a rendering of today's actual
 * recommended dishes: the solver's food model is seven generic
 * categories (roti/rice/dal/sabzi/curd/salad/nuts/ghee), the same
 * generic-slot approach the 2D thali (thali.tsx, src/lib/plate.ts)
 * already uses elsewhere on this same page — not MEAL_LIBRARY's 1,101
 * real dishes. Replaces the previous React/@react-three/fiber thali,
 * which was fully built but never wired into any page.
 */

declare global {
  interface Window {
    THREE?: typeof THREE;
    Thali3D?: (container: HTMLElement, opts?: { onSelect?: (id: string | null, item: unknown) => void }) => {
      setPlan: (plan: unknown) => void;
      dispose: () => void;
    } | null;
    PoshanEngine?: {
      buildPlan: (profile: EngineProfile, options: { meal?: string; prefs?: { diet?: string; skip?: string[] } }) => EnginePlan;
    };
  }
}

interface EngineProfile {
  height: number;
  weight: number;
  age: number;
  sex: "male" | "female" | "other";
  activity: "sedentary" | "light" | "moderate" | "active" | "athlete";
  goal: "lose" | "maintain" | "gain";
}

interface EnginePlan {
  score: { label: string; total: number };
  suggestions: { icon: string; text: string }[];
}

const ACTIVITY_MAP: Record<NonNullable<Thali3DBody["activityLevel"]>, EngineProfile["activity"]> = {
  sedentary: "sedentary",
  moderate: "moderate",
  heavy: "active",
};

const GOAL_MAP: Record<Thali3DBody["goal"], EngineProfile["goal"]> = {
  loss: "lose",
  muscle: "gain",
  diabetes: "maintain",
  pcos: "maintain",
  thyroid: "maintain",
};

let scriptsLoading: Promise<void> | null = null;

function loadVendorScripts(): Promise<void> {
  if (typeof window !== "undefined" && window.Thali3D && window.PoshanEngine) return Promise.resolve();
  if (scriptsLoading) return scriptsLoading;

  scriptsLoading = new Promise((resolve, reject) => {
    let remaining = 2;
    const done = () => {
      remaining -= 1;
      if (remaining === 0) resolve();
    };
    for (const src of ["/vendor/poshan-engine.js", "/vendor/thali3d.js"]) {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        done();
        continue;
      }
      const el = document.createElement("script");
      el.src = src;
      el.async = false; // engine must register before thali3d.js is invoked
      el.onload = done;
      el.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(el);
    }
  });
  return scriptsLoading;
}

export function Thali3D({ body }: { body: Thali3DBody }) {
  const { T } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ReturnType<NonNullable<Window["Thali3D"]>> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const canBuild = !!(body.age && body.sex && body.activityLevel);

  useEffect(() => {
    if (!canBuild) return;
    let cancelled = false;

    window.THREE = THREE;
    loadVendorScripts()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [canBuild]);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.Thali3D || !window.PoshanEngine) return;

    const instance = window.Thali3D(containerRef.current, {});
    instanceRef.current = instance;
    if (!instance) {
      setError(true);
      return;
    }

    const profile: EngineProfile = {
      height: body.height,
      weight: body.weight,
      age: body.age!,
      sex: body.sex!,
      activity: ACTIVITY_MAP[body.activityLevel!],
      goal: GOAL_MAP[body.goal],
    };
    const plan = window.PoshanEngine.buildPlan(profile, {
      meal: "lunch",
      prefs: { diet: body.diet === "vegan" ? "vegan" : undefined },
    });
    instance.setPlan(plan);

    return () => {
      instance.dispose();
      instanceRef.current = null;
    };
  }, [ready, body.height, body.weight, body.age, body.sex, body.activityLevel, body.goal, body.diet]);

  if (!canBuild) {
    return (
      <p className="text-sm" style={{ color: "color-mix(in srgb, var(--roti) 72%, transparent)" }}>
        {T({
          en: "Set your age, sex and activity level above to see your thali in 3D.",
          hi: "अपनी थाली 3D में देखने के लिए ऊपर उम्र, लिंग और गतिविधि स्तर सेट करें।",
        })}
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm" style={{ color: "color-mix(in srgb, var(--roti) 72%, transparent)" }}>
        {T({ en: "The 3D thali couldn't load. Your numbers above are still accurate.", hi: "3D थाली लोड नहीं हो सकी। ऊपर आपके आँकड़े अब भी सही हैं।" })}
      </p>
    );
  }

  return (
    <div className="relative h-[380px] md:h-[460px] w-full overflow-hidden rounded-2xl" style={{ background: "#14100c" }}>
      <div ref={containerRef} className="h-full w-full" />
      {!ready && (
        <p className="absolute inset-0 grid place-items-center text-sm" style={{ color: "color-mix(in srgb, var(--roti) 60%, transparent)" }}>
          {T({ en: "Loading your thali…", hi: "आपकी थाली लोड हो रही है…" })}
        </p>
      )}
      <p
        className="absolute bottom-4 left-0 right-0 text-center text-[0.72rem] pointer-events-none"
        style={{ color: "color-mix(in srgb, var(--roti) 64%, transparent)" }}
      >
        {T({ en: "Drag to rotate · tap a katori for details", hi: "घुमाने के लिए खींचें · जानकारी के लिए कटोरी दबाएँ" })}
      </p>
    </div>
  );
}
