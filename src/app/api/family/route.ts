import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { FORCE_PREMIUM } from "@/lib/dev-flags";

/**
 * Family profiles — Poshan Home only ("up to six family profiles" in
 * PREMIUM_FEATURES, poshan-data.ts). The account owner's own row in
 * `profiles` is profile one; this table holds up to five more, so the cap
 * enforced below is 5, not 6.
 */
const MAX_FAMILY_MEMBERS = 5;

const WRITABLE = [
  "full_name",
  "relationship",
  "height_cm",
  "weight_kg",
  "region",
  "diet",
  "goal",
  "age",
  "sex",
  "activity_level",
  "tdee",
] as const;

function client(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {},
    },
  });
}

async function requirePremiumUser(request: NextRequest) {
  const supabase = client(request);
  if (!supabase) {
    return { error: NextResponse.json({ error: "Supabase not configured" }, { status: 500 }) } as const;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

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
        error: NextResponse.json(
          { error: "Family profiles are a Poshan Home feature." },
          { status: 403 }
        ),
      } as const;
    }
  }

  return { supabase, user } as const;
}

export async function GET(request: NextRequest) {
  const gate = await requirePremiumUser(request);
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("account_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const gate = await requirePremiumUser(request);
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  const { count, error: countError } = await supabase
    .from("family_members")
    .select("id", { count: "exact", head: true })
    .eq("account_id", user.id);

  if (countError) return NextResponse.json({ error: countError.message }, { status: 400 });
  if ((count ?? 0) >= MAX_FAMILY_MEMBERS) {
    return NextResponse.json(
      { error: `You can add up to ${MAX_FAMILY_MEMBERS} family members (six profiles total, counting your own).` },
      { status: 400 }
    );
  }

  const body = await request.json();
  if (typeof body.full_name !== "string" || !body.full_name.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  const fields = Object.fromEntries(
    Object.entries(body).filter(([k]) => (WRITABLE as readonly string[]).includes(k))
  );

  const { data, error } = await supabase
    .from("family_members")
    .insert({ ...fields, account_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const gate = await requirePremiumUser(request);
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  const body = await request.json();
  const { id, ...rest } = body ?? {};
  if (typeof id !== "string") {
    return NextResponse.json({ error: "A member id is required." }, { status: 400 });
  }

  const updates = Object.fromEntries(
    Object.entries(rest).filter(([k]) => (WRITABLE as readonly string[]).includes(k))
  );
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No writable fields supplied" }, { status: 400 });
  }

  /* .eq("account_id", user.id) here is defence in depth, same as
     /api/profile — RLS already confines the row to its owner, but there is
     no reason to rely on that alone when the filter is one clause away. */
  const { data, error } = await supabase
    .from("family_members")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const gate = await requirePremiumUser(request);
  if ("error" in gate) return gate.error;
  const { supabase, user } = gate;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A member id is required." }, { status: 400 });

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", id)
    .eq("account_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
