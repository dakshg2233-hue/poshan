import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { randomBytes } from "crypto";
import { FORCE_PREMIUM } from "@/lib/dev-flags";

const MAX_FAMILY_MEMBERS = 5;

function client(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
  });
}

async function requirePremiumUser(request: NextRequest) {
  const supabase = client(request);
  if (!supabase) return { error: NextResponse.json({ error: "Supabase not configured" }, { status: 500 }) } as const;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;

  if (!FORCE_PREMIUM) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("product", "home")
      .in("status", ["trialing", "active"])
      .maybeSingle();
    if (!sub) {
      return {
        error: NextResponse.json({ error: "Family profiles are a Poshan Home feature." }, { status: 403 }),
      } as const;
    }
  }

  return { supabase, user } as const;
}

/**
 * Invite links for family profiles — see the migration comment
 * (20260906000000_add_daily_engine_extensions.sql) for why this is a
 * token-based self-fill link rather than a second login against
 * family_members: it needed no RLS redesign, only this route pair plus
 * the public accept route at /api/family/invite/[token].
 */
export async function GET(request: NextRequest) {
  const gate = await requirePremiumUser(request);
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  const { data, error } = await supabase
    .from("family_invites")
    .select("id, token, status, created_at, expires_at")
    .eq("account_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const gate = await requirePremiumUser(request);
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  const { count: memberCount } = await supabase
    .from("family_members")
    .select("id", { count: "exact", head: true })
    .eq("account_id", user.id);
  const { count: pendingCount } = await supabase
    .from("family_invites")
    .select("id", { count: "exact", head: true })
    .eq("account_id", user.id)
    .eq("status", "pending");

  if ((memberCount ?? 0) + (pendingCount ?? 0) >= MAX_FAMILY_MEMBERS) {
    return NextResponse.json(
      { error: `You can add up to ${MAX_FAMILY_MEMBERS} family members, counting pending invites.` },
      { status: 400 }
    );
  }

  const token = randomBytes(16).toString("hex");
  const { data, error } = await supabase
    .from("family_invites")
    .insert({ account_id: user.id, token })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ...data, url: `/family-invite/${token}` });
}

export async function DELETE(request: NextRequest) {
  const gate = await requirePremiumUser(request);
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "An invite id is required." }, { status: 400 });

  const { error } = await supabase
    .from("family_invites")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("account_id", user.id)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
