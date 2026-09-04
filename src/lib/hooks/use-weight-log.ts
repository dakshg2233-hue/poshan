"use client";

import { useEffect, useState } from "react";

export interface WeightLog {
  id: string;
  weight_kg: number;
  logged_on: string;
  family_member_id: string | null;
}

export function useWeightLog(familyMemberId?: string | null) {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const url = familyMemberId ? `/api/weight?family_member_id=${encodeURIComponent(familyMemberId)}` : "/api/weight";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (response.status === 401) {
        setLogs([]);
        return;
      }
      if (!response.ok) throw new Error("Failed to load weight history");
      setLogs(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(url);
        if (response.status === 401) {
          if (!cancelled) setLogs([]);
          return;
        }
        if (!response.ok) throw new Error("Failed to load weight history");
        const data = await response.json();
        if (!cancelled) setLogs(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const logWeight = async (weight_kg: number) => {
    const response = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight_kg, family_member_id: familyMemberId ?? undefined }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to log weight");
    await load();
    return data as WeightLog;
  };

  return { logs, loading, error, logWeight, reload: load };
}
