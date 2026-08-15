"use client";

import { useEffect, useState } from "react";
import { browserClient, supabaseReady } from "@/lib/supabase-browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Condition {
  id: string;
  user_id: string;
  condition: string;
  created_at: string;
}

export function useConditions() {
  const [conditions, setConditions] = useState<Condition[]>([]);
  /* Derived: nothing to wait for when Supabase is unconfigured. */
  const [loading, setLoading] = useState(() => supabaseReady());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const fetchConditions = async () => {
      try {
        const response = await fetch("/api/conditions");
        /* Signed out is a normal state, not an error. */
        if (response.status === 401) {
          if (!cancelled) setConditions([]);
          return;
        }
        if (!response.ok) throw new Error("Failed to fetch conditions");
        const data = await response.json();
        if (!cancelled) setConditions(data);
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
      await fetchConditions();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      channel = supabase
        .channel(`conditions-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_conditions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setConditions((prev) => [payload.new as Condition, ...prev]);
            } else if (payload.eventType === "DELETE") {
              setConditions((prev) =>
                prev.filter((c) => c.id !== (payload.old as Condition).id)
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

  const addCondition = async (condition: string) => {
    try {
      const response = await fetch("/api/conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition }),
      });
      if (!response.ok) throw new Error("Failed to add condition");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const removeCondition = async (condition_id: string) => {
    try {
      const response = await fetch("/api/conditions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition_id }),
      });
      if (!response.ok) throw new Error("Failed to remove condition");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return { conditions, loading, error, addCondition, removeCondition };
}
