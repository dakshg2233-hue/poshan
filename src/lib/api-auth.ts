import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * The createServerClient(cookies) + auth.getUser() boilerplate that opens
 * every existing route (see /api/profile, /api/family). Pulled out here
 * because the clinician platform adds eight routes that all start the same
 * way — repeating it eight times is where extracting it stops being
 * premature.
 */
export async function getAuthedSupabase(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { error: NextResponse.json({ error: "Supabase not configured" }, { status: 500 }) } as const;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  return { supabase, user } as const;
}

/**
 * Requires the caller to have a verified clinicians row. `clinicians` has
 * no self-insert policy (schema.sql) — a row only exists after Poshan
 * manually confirms the registration number — so reaching this point is
 * itself proof of verification, not just of having applied.
 */
export async function requireClinician(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return { error: auth.error } as const;
  const { supabase, user } = auth;

  const { data: clinician } = await supabase
    .from("clinicians")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!clinician) {
    return {
      error: NextResponse.json(
        { error: "Not a verified clinician on this account." },
        { status: 403 }
      ),
    } as const;
  }

  return { supabase, user, clinician } as const;
}

/**
 * Requires the caller to be a verified clinician AND a member of a clinic
 * (Clinic tier). Solo Practitioner clinicians (no clinic_members row) get a
 * clean 403 here rather than silently proceeding with membership === null,
 * so a route that forgets to check membership can't accidentally treat a
 * solo clinician as if they had clinic-wide access.
 */
export async function requireClinicMember(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return { error: auth.error } as const;
  const { supabase, user, clinician } = auth;

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("*, clinics(*)")
    .eq("clinician_id", user.id)
    .maybeSingle();

  if (!membership) {
    return {
      error: NextResponse.json({ error: "Not a member of any clinic." }, { status: 403 }),
    } as const;
  }

  return { supabase, user, clinician, membership } as const;
}
