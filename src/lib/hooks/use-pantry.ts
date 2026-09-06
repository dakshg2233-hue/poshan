"use client";

import { useEffect, useState } from "react";
import type { Bi } from "@/lib/poshan-data";

export interface PantryItem {
  key: string;
  label: Bi;
  in_stock: boolean;
  updated_at: string | null;
}

export function usePantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pantry");
      if (response.status === 401) {
        setItems([]);
        return;
      }
      if (!response.ok) throw new Error("Failed to load pantry");
      setItems(await response.json());
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
        const response = await fetch("/api/pantry");
        if (response.status === 401) {
          if (!cancelled) setItems([]);
          return;
        }
        if (!response.ok) throw new Error("Failed to load pantry");
        const data = await response.json();
        if (!cancelled) setItems(data);
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

  const toggle = async (key: string, in_stock: boolean) => {
    /* Optimistic: a pantry checklist should feel instant to tap. */
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, in_stock } : i)));
    const response = await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_key: key, in_stock }),
    });
    if (!response.ok) {
      await load(); // revert to server truth on failure
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to update pantry");
    }
  };

  return { items, loading, error, toggle, reload: load };
}
