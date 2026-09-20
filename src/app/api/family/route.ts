import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { FORCE_PREMIUM } from "@/lib/dev-flags";
import { isMinor } from "@/lib/dpdp";

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

  /* DPDP s.9(1) — a child's data may not be processed until a guardian has
     verifiably consented, so each row is returned with that status attached
     rather than the caller being trusted to work it out.

     `consentPending` is computed from the parental_consents table, not from
     anything on the family_members row, because the row is written by the
     account holder and the consent is written by the guardian. Keeping the
     two apart is what makes the second one worth anything. */
  const rows = data ?? [];
  const minorIds = rows
    .filter((m) => isMinor({ age: m.age }) === true)
    .map((m) => m.id as string);

  let consented = new Set<string>();
  if (minorIds.length > 0) {
    const { data: consents } = await supabase
      .from("parental_consents")
      .select("family_member_id")
      .in("family_member_id", minorIds)
      .not("verified_at", "is", null)
      .is("revoked_at", null);
    consented = new Set((consents ?? []).map((c) => c.family_member_id as string));
  }

  return NextResponse.json(
    rows.map((m) => ({
      ...m,
      /* True means: we are holding this child's details but may not act on
         them yet. The UI surfaces it as a pending state on the profile.

         NOT YET COMPLETE, and worth being plain about rather than letting
         the flag imply more than it does. Setting this excludes the child
         from every behavioural feature (gamification filters on the same
         age test), and marks the profile in the UI. It does not yet stop
         /api/daily building a meal plan for them. Closing that gap means
         deciding a product question this code cannot decide on its own —
         whether an unconsented child's profile should be inert or simply
         invisible — so it is left visible here instead of being quietly
         half-done. The privacy policy is worded to match what this
         actually does, not what it should eventually do. */
      consentPending: isMinor({ age: m.age }) === true && !consented.has(m.id as string),
    }))
  );
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

  /* DPDP s.5 — every family member is a Data Principal in their own right.
     Their name, age, height and weight are their personal data, being
     handed over by somebody else; the Act has no exception for "my spouse
     entered it". Poshan cannot serve a notice to someone who has no
     account, so the account holder has to state on the record what gives
     them standing, and that assertion is stored on the row.

     Rejected rather than defaulted. A default here would be Poshan
     deciding, on the account holder's behalf, that a stranger consented. */
  const basis = body.notice_ack_basis;
  if (basis !== "self_declared_guardian" && basis !== "informed_adult") {
    return NextResponse.json(
      {
        error:
          "Confirm how you may provide this person's data: as their guardian, " +
          "or as an adult who knows you are adding them.",
        field: "notice_ack_basis",
        allowed: ["self_declared_guardian", "informed_adult"],
      },
      { status: 400 }
    );
  }

  /* s.9(1) — a child needs a guardian, not merely an adult who was told.
     Checked against the age being written rather than trusting the basis
     the client picked, because the two disagreeing is exactly the case
     that matters: someone adding a nine-year-old as an "informed adult". */
  const minor = isMinor({ age: typeof fields.age === "number" ? fields.age : null });
  if (minor === true && basis !== "self_declared_guardian") {
    return NextResponse.json(
      {
        error:
          "This person is under 18. Only a parent or guardian may add them, " +
          "and we will email that guardian for permission before their data is used.",
        field: "notice_ack_basis",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("family_members")
    .insert({
      ...fields,
      account_id: user.id,
      notice_ack_basis: basis,
      notice_ack_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  /* Tells the client it must now run the guardian-consent flow for this
     row. Returned rather than started here: the account holder still has
     to supply the guardian's email, which this request did not carry. */
  return NextResponse.json({
    ...data,
    parentalConsentRequired: minor === true,
  });
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
