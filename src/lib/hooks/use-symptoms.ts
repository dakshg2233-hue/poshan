"use client";

import { useEffect, useState, useCallback } from "react";

export interface SymptomLog {
  id: string;
  log_date: string;
  energy: number | null;
  mood: number | null;
  bloating: boolean;
  cramps: boolean;
  cycle_day: number | null;
  notes: string | null;
}

export function useSymptoms() {
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/symptoms");
      if (response.status === 401) {
        setLogs([]);
        return;
      }
      if (!response.ok) throw new Error("Failed to load symptom history");
      setLogs(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/symptoms");
        if (response.status === 401) {
          if (!cancelled) setLogs([]);
          return;
        }
        if (!response.ok) throw new Error("Failed to load symptom history");
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
  }, []);

  const logSymptom = async (entry: Partial<Omit<SymptomLog, "id" | "log_date">>) => {
    const response = await fetch("/api/symptoms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to log symptoms");
    await load();
    return data as SymptomLog;
  };

  return { logs, loading, error, logSymptom, reload: load };
}
