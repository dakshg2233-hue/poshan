import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

/**
 * Stores/removes the browser's PushManager subscription (endpoint + keys)
 * against the signed-in account. This is Web Push, not WhatsApp/SMS — see
 * .env.example for why (a WhatsApp Business API account isn't something
 * this project has).
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const authKey = body?.keys?.auth;

  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof authKey !== "string") {
    return NextResponse.json({ error: "A valid push subscription is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint, p256dh, auth_key: authKey }, { onConflict: "endpoint" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => ({}));
  const endpoint = body?.endpoint;
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "An endpoint is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
