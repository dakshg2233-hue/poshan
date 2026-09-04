import { Resend } from "resend";

/**
 * Built on first use, not at module scope. `new Resend(undefined)` throws
 * "Missing API key" during module evaluation, which takes down every route
 * that imports this file before its handler can run: the throw happens at
 * import time, so a try/catch inside the handler never sees it. Constructing
 * lazily keeps an unset key a handled condition, the way Supabase, Razorpay
 * and Omniroute already degrade.
 */
let client: Resend | null = null;

/** True when RESEND_API_KEY is set. Callers should check before sending. */
export function emailReady() {
  return Boolean(process.env.RESEND_API_KEY);
}

function resendClient() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * Notifies the Poshan team of a Hospital/Enterprise lead. Best-effort: the
 * lead is already durably stored in clinic_leads by the time this is called,
 * so a failed email here should never fail the visitor's submission.
 */
export async function sendClinicLeadEmail(lead: {
  tier: "hospital" | "enterprise";
  name: string;
  org: string;
  email: string;
  phone?: string;
  message?: string;
}) {
  return resendClient().emails.send({
    from: "Poshan <leads@poshan.health>",
    to: "dakshg2233@gmail.com",
    replyTo: lead.email,
    subject: `${lead.tier === "hospital" ? "Hospital" : "Enterprise"} lead: ${lead.org}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="margin: 0 0 16px 0;">New ${lead.tier} enquiry</h2>
        <p><strong>Organisation:</strong> ${lead.org}</p>
        <p><strong>Contact:</strong> ${lead.name} · ${lead.email}${lead.phone ? ` · ${lead.phone}` : ""}</p>
        ${lead.message ? `<p><strong>Message:</strong><br>${lead.message}</p>` : ""}
      </div>
    `,
  });
}

export async function sendConfirmationEmail(email: string) {
  return resendClient().emails.send({
    from: "Poshan <auth@poshan.health>",
    to: email,
    subject: "Account Confirmed ✅",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="margin: 0 0 20px 0; color: #0f0f0f; font-size: 24px;">Account Confirmed ✅</h1>

          <p style="color: #666; font-size: 16px; margin: 20px 0;">Your Poshan account is all set. You can now sign in and start your personalized wellness journey.</p>

          <p style="color: #666; font-size: 14px; margin: 20px 0;">Start with Poshan Home (₹299/month) to get personalized meal plans, biomarker tracking, and direct support from our wellness team.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; margin: 0;">Made for India 🇮🇳</p>
        </div>
      </div>
    `,
  });
}
