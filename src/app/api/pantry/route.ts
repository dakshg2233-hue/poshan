import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { PANTRY_STAPLES } from "@/lib/daily-engine";

/**
 * "What's in my kitchen" — a coarse in-stock toggle per staple (see
 * PANTRY_STAPLES in daily-engine.ts), free for every account: it's a signal
 * the recommendation engine reads, not a premium feature to gate.
 *
 * GET always returns every catalog entry, defaulting to in_stock: false for
 * anything the user hasn't toggled — "haven't said I have it" is the safer
 * default than assuming a full kitchen.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("pantry_items")
    .select("item_key, in_stock, updated_at")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const byKey = new Map((data ?? []).map((r) => [r.item_key, r]));
  const items = PANTRY_STAPLES.map((s) => ({
    key: s.key,
    label: s.label,
    in_stock: byKey.get(s.key)?.in_stock ?? false,
    updated_at: byKey.get(s.key)?.updated_at ?? null,
  }));

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const { item_key, in_stock } = body ?? {};

  if (!PANTRY_STAPLES.some((s) => s.key === item_key)) {
    return NextResponse.json({ error: "Unknown pantry item." }, { status: 400 });
  }
  if (typeof in_stock !== "boolean") {
    return NextResponse.json({ error: "in_stock must be true or false." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pantry_items")
    .upsert(
      { user_id: user.id, item_key, in_stock, updated_at: new Date().toISOString() },
      { onConflict: "user_id,item_key" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
