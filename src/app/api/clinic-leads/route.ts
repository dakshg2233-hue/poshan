import { serviceClient } from "@/lib/supabase";
import { emailReady, sendClinicLeadEmail } from "@/lib/email";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";

/**
 * Hospital/Enterprise "Talk to us" form.
 *
 * These tiers are deliberately not self-serve (see CLINIC_TIERS in
 * poshan-data.ts): a hospital buys on a purchase order, not a card. This is
 * the sales-conversation starting point that replaces a dead link to /login.
 *
 * Publicly reachable and unauthenticated on purpose — the visitor filling
 * this in is very often signed out — so it is rate limited per IP rather
 * than per account.
 */
type Body = {
  tier?: "hospital" | "enterprise";
  name?: string;
  org?: string;
  email?: string;
  phone?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const gate = rateLimit(`clinic-lead:${clientIp(request)}`, { limit: 5, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  const parsed = await readJsonCapped<Body>(request, 8_192);
  if (!parsed.ok) return parsed.response;

  const { tier, name, org, email, phone, message } = parsed.data;

  if (tier !== "hospital" && tier !== "enterprise") {
    return Response.json({ error: "Invalid tier." }, { status: 400 });
  }
  if (!name?.trim() || !org?.trim() || !email?.trim()) {
    return Response.json({ error: "Name, organisation and email are required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email.trim())) {
    return Response.json({ error: "That email address doesn't look right." }, { status: 400 });
  }

  const db = serviceClient();
  if (!db) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const { error } = await db.from("clinic_leads").insert({
    tier,
    name: name.trim().slice(0, 200),
    org: org.trim().slice(0, 200),
    email: email.trim().slice(0, 320),
    phone: phone?.trim().slice(0, 40) || null,
    message: message?.trim().slice(0, 2000) || null,
  });

  if (error) {
    return Response.json({ error: "Could not save your enquiry. Try again." }, { status: 500 });
  }

  /* Best-effort: the lead is already saved, so an email failure here must
     not turn into a failure response the visitor sees. */
  if (emailReady()) {
    try {
      await sendClinicLeadEmail({
        tier,
        name: name.trim(),
        org: org.trim(),
        email: email.trim(),
        phone: phone?.trim() || undefined,
        message: message?.trim() || undefined,
      });
    } catch {
      /* Swallowed: the lead is safe in the database either way. */
    }
  }

  return Response.json({ ok: true });
}
