import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

/**
 * The dashboard's weekly review card: how many of the last 7 days had at
 * least one meal logged, and how many meals total. Deliberately just a
 * count, not a nutrition score — there's no "did you eat well" judgement
 * here, only "did you use the app today", which is the honest retention
 * metric this loop is actually for.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const since = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_meal_logs")
    .select("log_date")
    .eq("user_id", user.id)
    .is("family_member_id", null)
    .gte("log_date", since);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const days = new Set((data ?? []).map((r) => r.log_date));
  return NextResponse.json({
    daysLogged: days.size,
    totalMeals: data?.length ?? 0,
    windowDays: 7,
  });
}
