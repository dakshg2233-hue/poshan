import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";

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
] as const;

/**
 * The public half of the family-invite flow: reached by whoever holds the
 * link, with no account of their own. Authorised by knowing the token —
 * looked up via the service-role key, which is exactly why the token
 * itself is a 32-hex-char random value (crypto.randomBytes(16)) and why
 * family_invites carries no client-readable select policy (see the
 * migration). Rate-limited the same way /api/scan is: a public,
 * unauthenticated route is the one most worth protecting from brute-force
 * token guessing.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const gate = rateLimit(`invite:${clientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  const { token } = await params;
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data: invite } = await db
    .from("family_invites")
    .select("status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "This invite has already been used or revoked." }, { status: 410 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite link has expired." }, { status: 410 });
  }

  return NextResponse.json({ valid: true });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const gate = rateLimit(`invite:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  const { token } = await params;
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data: invite } = await db
    .from("family_invites")
    .select("id, account_id, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "This invite has already been used or revoked." }, { status: 410 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite link has expired." }, { status: 410 });
  }

  const parsed = await readJsonCapped<Record<string, unknown>>(request, 4_096);
  if (!parsed.ok) return parsed.response;

  if (typeof parsed.data.full_name !== "string" || !parsed.data.full_name.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  const { count } = await db
    .from("family_members")
    .select("id", { count: "exact", head: true })
    .eq("account_id", invite.account_id);
  if ((count ?? 0) >= MAX_FAMILY_MEMBERS) {
    return NextResponse.json({ error: "This account already has its maximum family members." }, { status: 400 });
  }

  const fields = Object.fromEntries(
    Object.entries(parsed.data).filter(([k]) => (WRITABLE as readonly string[]).includes(k))
  );

  const { data: member, error: insertError } = await db
    .from("family_members")
    .insert({ ...fields, account_id: invite.account_id })
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  await db
    .from("family_invites")
    .update({ status: "accepted", family_member_id: member.id })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
