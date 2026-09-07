"use client";

import { useEffect, useRef } from "react";
import { useDaily } from "@/lib/hooks/use-daily";
import { useStreak } from "@/lib/hooks/use-streak";
import { MEAL_LIBRARY } from "@/lib/poshan-data";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

export interface WidgetSnapshot {
  targetKcal: number;
  loggedKcal: number;
  nextMealName: string | null;
  nextMealTime: string | null;
  streakDays: number | null;
  updatedAt: string;
}

/**
 * Pushes a small "what to show on your home screen" snapshot into the
 * poshan-mobile WebView shell, which persists it natively and the
 * Android/iOS home-screen widget reads it back.
 *
 * Deliberately push, not pull: a home-screen widget runs outside the
 * WebView's session and has no way to authenticate on its own. Rather
 * than mint a second, long-lived auth token just for the widget, the app
 * pushes its latest snapshot whenever it's open and something changes,
 * and the widget shows "as of the last time you had the app open" — the
 * same trade-off most static home-screen widgets make.
 *
 * A no-op on the regular website: window.ReactNativeWebView only exists
 * inside that WebView shell, so this never fires for a browser visitor.
 */
export function WidgetBridge() {
  const { data } = useDaily();
  const { data: streak } = useStreak();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ReactNativeWebView) return;
    if (!data?.recommendation) return;

    const loggedByTime = new Map(data.todayLogs.map((l) => [l.meal_time, l]));
    const loggedKcal = data.todayLogs.reduce((sum, l) => {
      const meal = MEAL_LIBRARY.find((m) => m.id === l.dish_id);
      return sum + (meal?.kcal ?? 0);
    }, 0);
    const nextPick =
      data.recommendation.picks.find((p) => !loggedByTime.has(p.time)) ?? data.recommendation.picks[0] ?? null;

    const snapshot: WidgetSnapshot = {
      targetKcal: data.recommendation.targetKcal,
      loggedKcal,
      nextMealName: nextPick?.name.en ?? null,
      nextMealTime: nextPick?.time ?? null,
      streakDays: streak?.enabled ? streak.streak?.currentStreak ?? 0 : null,
      updatedAt: new Date().toISOString(),
    };

    const payload = JSON.stringify({ type: "poshan-widget-snapshot", snapshot });
    if (payload === lastSent.current) return;
    lastSent.current = payload;
    window.ReactNativeWebView.postMessage(payload);
  }, [data, streak]);

  return null;
}
