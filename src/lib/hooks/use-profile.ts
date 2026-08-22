"use client";

import { useEffect, useState } from "react";
import { browserClient, supabaseReady } from "@/lib/supabase-browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  full_name: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  region: "north" | "south" | "east" | "west" | null;
  diet: "veg" | "nonveg" | "vegan" | "jain" | null;
  goal: "loss" | "muscle" | "diabetes" | "pcos" | "thyroid" | null;
  tdee: number | null;
  onboarding_completed: boolean;
  lang: "en" | "hi";
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  /* Derived, not set in an effect: with Supabase unconfigured there is nothing
     to wait for, so start settled. Setting this inside the effect instead
     would pin every consumer on a spinner forever, and cascade a render. */
  const [loading, setLoading] = useState(() => supabaseReady());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile");
        /* 401 means signed out. That is a normal state, not a failure:
           surfacing it as an error would light up the UI for every visitor. */
        if (response.status === 401) {
          if (!cancelled) setProfile(null);
          return;
        }
        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    /* An async IIFE: useEffect's callback must stay sync so it can return the
       cleanup function. The `cancelled` flag matters because `channel` is
       assigned after an await and would otherwise outlive an early unmount. */
    (async () => {
      await fetchProfile();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      channel = supabase
        .channel(`profile-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            setProfile(payload.new as Profile);
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return { profile, loading, error, updateProfile };
}
