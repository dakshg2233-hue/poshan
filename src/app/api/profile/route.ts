import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { generateLeaderboardHandle } from "@/lib/gamification";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  /* Only these columns may be written from a client. RLS already confines the
     update to the caller's own row, and the DB CHECKs reject bad enum values,
     so this is defence in depth rather than the only guard, but passing the
     raw body to .update() would let a caller try `id` or `created_at`, and
     there is no reason to accept fields the form does not own. */
  const WRITABLE = [
    "full_name",
    "height_cm",
    "weight_kg",
    "region",
    "diet",
    "goal",
    "lang",
    "age",
    "sex",
    "activity_level",
    "tdee",
    "portion_scale",
    "gamification_enabled",
    "leaderboard_opt_in",
  ] as const;

  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) =>
      (WRITABLE as readonly string[]).includes(k)
    )
  ) as Record<string, unknown>;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No writable fields supplied" },
      { status: 400 }
    );
  }

  /* leaderboard_handle is never client-writable (see WRITABLE above) — a
     user picking their own public display name is an impersonation/
     moderation problem this app doesn't need. Generated once, the first
     time opt-in flips true, and left alone after that. */
  if (updates.leaderboard_opt_in === true) {
    const { data: existing } = await supabase.from("profiles").select("leaderboard_handle").eq("id", user.id).single();
    if (!existing?.leaderboard_handle) {
      updates.leaderboard_handle = generateLeaderboardHandle(user.id);
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
}
