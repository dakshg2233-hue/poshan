"use client";

import { useEffect, useState } from "react";

export interface FamilyMember {
  id: string;
  account_id: string;
  full_name: string;
  relationship: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  region: "north" | "south" | "east" | "west" | null;
  diet: "veg" | "nonveg" | "vegan" | "jain" | null;
  goal: "loss" | "muscle" | "diabetes" | "pcos" | "thyroid" | null;
  age: number | null;
  sex: "male" | "female" | null;
  activity_level: "sedentary" | "moderate" | "heavy" | null;
  tdee: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Same shape as useProfile: fetch-on-mount, loading/error state, mutators
 * that hit the API route rather than talking to Supabase directly (the
 * route enforces the Poshan Home gate and the five-member cap, neither of
 * which a client-side insert could safely enforce alone).
 */
export function useFamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/family");
      if (response.status === 403) {
        /* Not premium: a normal state, not a failure — the caller decides
           whether to show an upsell. */
        setMembers([]);
        return;
      }
      if (!response.ok) throw new Error("Failed to load family members");
      setMembers(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    /* Guarded the same way useProfile's mount fetch is: state only
       commits if the effect hasn't since been cleaned up, so a fast
       unmount (or a second effect run under StrictMode) can't write to a
       component that's no longer there. */
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/family");
        if (response.status === 403) {
          if (!cancelled) setMembers([]);
          return;
        }
        if (!response.ok) throw new Error("Failed to load family members");
        const data = await response.json();
        if (!cancelled) setMembers(data);
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

  const addMember = async (fields: Partial<FamilyMember>) => {
    const response = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to add family member");
    setMembers((prev) => [...prev, data]);
    return data as FamilyMember;
  };

  const updateMember = async (id: string, fields: Partial<FamilyMember>) => {
    const response = await fetch("/api/family", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to update family member");
    setMembers((prev) => prev.map((m) => (m.id === id ? data : m)));
    return data as FamilyMember;
  };

  const removeMember = async (id: string) => {
    const response = await fetch(`/api/family?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to remove family member");
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  return { members, loading, error, addMember, updateMember, removeMember, reload: load };
}
