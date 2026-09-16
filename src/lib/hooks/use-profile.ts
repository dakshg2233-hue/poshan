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
  age: number | null;
  sex: "male" | "female" | null;
  activity_level: "sedentary" | "moderate" | "heavy" | null;
  tdee: number | null;
  onboarding_completed: boolean;
  lang: "en" | "hi";
  portion_scale: number;
  gamification_enabled: boolean;
  leaderboard_opt_in: boolean;
  leaderboard_handle: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One profile, shared by every consumer.
 *
 * useProfile is called from ten places — the dashboard, the profile page,
 * the scanner, today-home, today-recommendation, portion calibration,
 * gamification settings, the biomarker example, and two other hooks that
 * build on it. Each call used to be fully independent: its own effect, its
 * own GET /api/profile, and its own Supabase realtime channel on the same
 * row. Loading the signed-out homepage fired four identical requests that
 * all 401'd; a signed-in dashboard opened that many realtime subscriptions
 * to one row, and realtime connections are a metered resource.
 *
 * So the fetch, the cache and the channel live at module scope and the hook
 * became a view onto them. The exported API is unchanged — every consumer
 * still gets { profile, loading, error, updateProfile } and none of the ten
 * needed editing.
 *
 * Module scope is per-tab, not per-user: it is cleared when the page
 * unloads, which is also when the session it belongs to stops mattering.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let profileCache: Profile | null = null;
/* Distinct from `profileCache !== null`: a signed-out visitor legitimately
   has a null profile, and without this flag every new consumer would treat
   that as "not fetched yet" and fetch again. */
let settled = false;
let errorCache: string | null = null;
/* The in-flight GET. Consumers mounting in the same tick await this one
   promise instead of starting their own request. */
let inFlight: Promise<void> | null = null;

let channel: RealtimeChannel | null = null;
/* How many mounted consumers there are. The channel is opened by the first
   and closed by the last, so a page that mounts and unmounts these
   components repeatedly does not leak subscriptions. */
let consumers = 0;

function emit() {
  for (const listener of listeners) listener();
}

function setProfileCache(next: Profile | null) {
  profileCache = next;
  settled = true;
  emit();
}

async function loadProfile(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch("/api/profile");
      /* 401 means signed out. That is a normal state, not a failure:
         surfacing it as an error would light up the UI for every visitor. */
      if (response.status === 401) {
        errorCache = null;
        setProfileCache(null);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch profile");
      errorCache = null;
      setProfileCache((await response.json()) as Profile);
    } catch (err) {
      errorCache = err instanceof Error ? err.message : "An error occurred";
      settled = true;
      emit();
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

async function openChannel() {
  const supabase = browserClient();
  if (!supabase || channel) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  /* Every consumer may have unmounted while that await was outstanding, and
     a channel nobody is listening to is exactly the leak this replaces. */
  if (!user || consumers === 0 || channel) return;

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
      (payload) => setProfileCache(payload.new as Profile)
    )
    .subscribe();
}

function closeChannel() {
  const supabase = browserClient();
  if (channel && supabase) supabase.removeChannel(channel);
  channel = null;
}

export function useProfile() {
  /* Seeded from the cache, so the second and later consumers render with
     data on their first paint instead of flashing a spinner. */
  const [profile, setProfile] = useState<Profile | null>(profileCache);
  const [loading, setLoading] = useState(() => supabaseReady() && !settled);
  const [error, setError] = useState<string | null>(errorCache);

  useEffect(() => {
    if (!browserClient()) return;

    const sync = () => {
      setProfile(profileCache);
      setError(errorCache);
      setLoading(!settled);
    };
    listeners.add(sync);

    consumers += 1;
    if (!settled) void loadProfile();
    if (consumers === 1) void openChannel();
    /* A late consumer joining after the data landed still needs its own
       state brought up to date. */
    sync();

    return () => {
      listeners.delete(sync);
      consumers -= 1;
      if (consumers === 0) closeChannel();
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
      const saved = await response.json();
      /* Push the saved row straight into the shared cache rather than
         waiting for realtime to echo it back: realtime is not guaranteed to
         be connected, and every other consumer should see the change now. */
      if (saved && typeof saved === "object" && "id" in saved) {
        setProfileCache(saved as Profile);
      }
      return saved;
    } catch (err) {
      errorCache = err instanceof Error ? err.message : "An error occurred";
      setError(errorCache);
      emit();
    }
  };

  return { profile, loading, error, updateProfile };
}
