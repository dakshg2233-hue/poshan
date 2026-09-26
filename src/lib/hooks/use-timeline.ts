"use client";

import { useCallback, useEffect, useState } from "react";
import type { TimelineKind } from "@/lib/timeline";
import { mayBeSignedIn } from "@/lib/supabase-browser";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  title: string;
  detail: Record<string, unknown> | null;
  occurred_on: string;
  source_table: string | null;
  source_id: string | null;
}

/**
 * Signed-out is a separate state from failed, not a message.
 *
 * It used to be encoded in `error` as the string "Sign in to see your
 * timeline." — which worked, but meant every consumer rendering a 401 was
 * rendering it as though something had gone wrong, and the three screens
 * built on these hooks each phrased it differently. A flag makes the two
 * cases distinguishable at the type level, so the shared <SignInPrompt>
 * can own the copy once.
 */
type FetchOutcome =
  | { kind: "ok"; events: TimelineEvent[] }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

async function fetchTimeline(): Promise<FetchOutcome> {
  try {
    if (!(await mayBeSignedIn())) return { kind: "signed-out" };
    const r = await fetch("/api/timeline");
    if (r.status === 401) return { kind: "signed-out" };
    if (!r.ok) return { kind: "error", message: "Could not load your timeline." };
    const d = await r.json();
    return { kind: "ok", events: d.events ?? [] };
  } catch {
    return { kind: "error", message: "Could not load your timeline." };
  }
}

/**
 * Same fetch-on-mount shape as useStreak and useDaily. The route backfills
 * from lab_values, weight_logs and care_plans before it reads, so a first
 * load already returns a full history rather than an empty screen — see
 * lib/timeline.ts#backfillTimeline for why that runs on every read.
 */
export function useTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((outcome: FetchOutcome) => {
    if (outcome.kind === "ok") {
      setEvents(outcome.events);
      setSignedOut(false);
      setError(null);
    } else if (outcome.kind === "signed-out") {
      setEvents([]);
      setSignedOut(true);
      setError(null);
    } else {
      setSignedOut(false);
      setError(outcome.message);
    }
    setLoading(false);
  }, []);

  /* The fetch is defined inside the effect rather than as a useCallback
     called from it. Both run the same code, but the effect-local version
     is the one the compiler can see resolves after an await — a hoisted
     `void load()` reads as a synchronous setState in an effect body and
     trips react-hooks/set-state-in-effect. */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const outcome = await fetchTimeline();
      if (!cancelled) apply(outcome);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  /* The imperative path, for callers that need the refetch to have landed
     before they continue. Kept separate from the effect above so awaiting
     it still means what it used to. */
  const reload = useCallback(async () => {
    apply(await fetchTimeline());
  }, [apply]);

  const addEvent = useCallback(
    async (kind: TimelineKind, title: string, occurredOn?: string) => {
      const r = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, occurredOn }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Could not add that.");
      }
      await reload();
    },
    [reload]
  );

  return { events, loading, signedOut, error, reload, addEvent };
}
