"use client";

import { useEffect, useState } from "react";
import { browserClient, supabaseReady } from "@/lib/supabase-browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Biomarker {
  id: string;
  user_id: string;
  marker: string;
  value: number;
  unit: string;
  taken_on: string;
  created_at: string;
}

export function useBiomarkers() {
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  /* Derived: nothing to wait for when Supabase is unconfigured. */
  const [loading, setLoading] = useState(() => supabaseReady());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const fetchBiomarkers = async () => {
      try {
        const response = await fetch("/api/biomarkers");
        /* Signed out is a normal state, not an error. */
        if (response.status === 401) {
          if (!cancelled) setBiomarkers([]);
          return;
        }
        if (!response.ok) throw new Error("Failed to fetch biomarkers");
        const data = await response.json();
        if (!cancelled) setBiomarkers(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    /* Async IIFE so the effect itself stays sync and can return cleanup. */
    (async () => {
      await fetchBiomarkers();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      channel = supabase
        .channel(`biomarkers-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "biomarker_readings",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setBiomarkers((prev) => [payload.new as Biomarker, ...prev]);
            } else if (payload.eventType === "DELETE") {
              setBiomarkers((prev) =>
                prev.filter((b) => b.id !== (payload.old as Biomarker).id)
              );
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const addBiomarker = async (marker: string, value: number, unit: string) => {
    try {
      const response = await fetch("/api/biomarkers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marker, value, unit }),
      });
      if (!response.ok) throw new Error("Failed to add biomarker");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return { biomarkers, loading, error, addBiomarker };
}
