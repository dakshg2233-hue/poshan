import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";

/**
 * "Adherence view: who opened their plan, who did not" (CLINIC_TIERS).
 * Called by the patient's own plan viewer on mount. Uses the service role
 * because care_plans has no patient-facing update policy at all — the
 * `.is("opened_by_patient_at", null)` guard is what keeps this a one-way,
 * write-once timestamp instead of a general-purpose patient update hole:
 * the only effect this route can ever have is setting an unset timestamp
 * once, on a row already scoped to the caller's own patient_id.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id } = await params;

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data, error } = await service
    .from("care_plans")
    .update({ opened_by_patient_at: new Date().toISOString() })
    .eq("id", id)
    .eq("patient_id", user.id)
    .in("status", ["approved", "sent"])
    .is("opened_by_patient_at", null)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? { ok: true }); // already-opened is a no-op, not an error
}
