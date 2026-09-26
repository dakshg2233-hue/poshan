"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. Uses the publishable anon key, so every query it
 * makes is filtered by Row Level Security, see supabase/schema.sql, where
 * every table denies by default and grants only rows the signed-in user owns.
 *
 * Returns null when Supabase is not configured, so the site keeps working
 * signed-out instead of crashing on a missing env var.
 */
let cached: SupabaseClient | null = null;

export function browserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!cached) cached = createBrowserClient(url, key);
  return cached;
}

export const supabaseReady = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * False when this browser holds no session, so the visitor is certainly
 * signed out. It reads the stored session and makes no network call.
 *
 * Hooks check this before calling an authenticated route. Otherwise every
 * signed-out visitor to a public page sends a request that can only 401,
 * and the browser logs each one as a red console error. True does not
 * prove the session is still valid, so callers keep their 401 handling.
 * Without Supabase configured it returns true and the server decides.
 */
export async function mayBeSignedIn(): Promise<boolean> {
  const supabase = browserClient();
  if (!supabase) return true;
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}
