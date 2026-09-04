import { NextResponse, NextRequest } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { FORCE_PREMIUM } from "@/lib/dev-flags";

/**
 * Tells the /clinician page which of four states the caller is in, so it
 * can render the right one: no application yet, application pending
 * review, verified but no active subscription, or fully set up.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: clinician } = await supabase
    .from("clinicians")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!clinician) {
    const { data: application } = await supabase
      .from("clinician_applications")
      .select("status, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ state: "unregistered", application: application ?? null });
  }

  let hasActiveSubscription = FORCE_PREMIUM;
  if (!hasActiveSubscription) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, product")
      .eq("user_id", user.id)
      .in("product", ["practitioner", "clinic", "hospital", "enterprise"])
      .in("status", ["trialing", "active"])
      .maybeSingle();
    hasActiveSubscription = !!sub;
  }

  return NextResponse.json({
    state: hasActiveSubscription ? "active" : "unsubscribed",
    clinician,
  });
}
