import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Two clients, deliberately separated.
 *
 * `anonClient` uses the publishable anon key and is safe in the browser:
 * every query it makes is filtered by Row Level Security.
 *
 * `serviceClient` uses the service-role key, which BYPASSES RLS entirely.
 * It must never be imported into a client component. Guarded below so a
 * mistaken import fails loudly at runtime instead of silently shipping an
 * all-access database key to the browser.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export function anonClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export function serviceClient(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error(
      "serviceClient() was called in the browser. The service-role key bypasses " +
        "Row Level Security and must stay on the server."
    );
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
