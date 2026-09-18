import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { readJsonCapped } from "@/lib/rate-limit";
import { serviceClient } from "@/lib/supabase";
import { today } from "@/lib/day";
import {
  BIOMARKERS,
  BIOMARKER_LABEL,
  BIOMARKER_UNIT,
  canLogBiomarker,
  isBiomarkerKey,
  isPlausibleValue,
} from "@/lib/biomarkers";

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
    .from("biomarker_readings")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_on", { ascending: false });

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

  /* `{ ...body }` used to go straight into the insert. Whatever the client
     sent became columns — biomarker_readings.marker is plain `text` with no
     CHECK, so any string at all was storable, and a malformed body threw out
     of request.json() into an unhandled 500 rather than a 400. Read, capped,
     then checked field by field. */
  const parsed = await readJsonCapped<{
    marker?: unknown;
    value?: unknown;
    taken_on?: unknown;
  }>(request, 2_048);
  if (!parsed.ok) return parsed.response;

  const { marker, value, taken_on } = parsed.data;

  if (!isBiomarkerKey(marker)) {
    return NextResponse.json(
      { error: `Unknown biomarker. Poshan tracks ${BIOMARKERS.map((m) => m.label).join(", ")}.` },
      { status: 400 }
    );
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!isPlausibleValue(marker, numeric)) {
    return NextResponse.json(
      { error: `That ${BIOMARKER_LABEL[marker]} reading looks wrong — check the decimal point and the units (${BIOMARKER_UNIT[marker]}).` },
      { status: 400 }
    );
  }

  /* The pricing page sells two markers free and all four on Home. Nothing
     enforced it until now, so every account had all four. */
  const db = serviceClient();
  let isPremium = false;
  if (db) {
    const { data: sub } = await db
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["trialing", "active"])
      .limit(1);
    isPremium = Boolean(sub?.[0]);
  }

  if (!canLogBiomarker(marker, isPremium)) {
    return NextResponse.json(
      {
        upgradeRequired: true,
        marker,
        error: `${BIOMARKER_LABEL[marker]} is part of Poshan Home. Vitamin D and HbA1c are free to track.`,
      },
      { status: 403 }
    );
  }

  /* Only the three fields this route accepts, never the caller's shape. */
  const row: Record<string, unknown> = {
    user_id: user.id,
    marker,
    value: numeric,
    unit: BIOMARKER_UNIT[marker],
  };
  if (typeof taken_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(taken_on)) {
    if (taken_on > today()) {
      return NextResponse.json({ error: "That date is in the future." }, { status: 400 });
    }
    row.taken_on = taken_on;
  }

  const { data, error } = await supabase
    .from("biomarker_readings")
    .insert(row)
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
