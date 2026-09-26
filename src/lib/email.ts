import { Resend } from "resend";
import { FIDUCIARY } from "./dpdp";

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
/**
 * Sender addresses use poshan.co.in, the domain Poshan actually owns.
 *
 * They said `@poshan.health` until now — a domain that was on the
 * shortlist when the name was being chosen and never bought. Nothing
 * fails at build time when a `from:` address is wrong; it fails later and
 * silently, at the provider, because Resend refuses to send from a domain
 * that is not verified on the account. Every email this file sends would
 * have been rejected in production.
 *
 * Verify poshan.co.in in Resend (Domains > Add domain) and add the DKIM
 * and SPF records it gives you. Those go in Netlify DNS now, not GoDaddy,
 * since the nameservers moved to Netlify.
 */
/* Every field here comes from a public form anyone can post without
   signing in, so all of it is escaped. Raw, it was HTML injection into
   the founder's own inbox: a "lead" could carry links and markup styled
   to look like anything. */
export async function sendClinicLeadEmail(lead: {
  tier: "hospital" | "enterprise";
  name: string;
  org: string;
  email: string;
  phone?: string;
  message?: string;
}) {
  return resendClient().emails.send({
    from: "Poshan <leads@poshan.co.in>",
    to: "dakshg2233@gmail.com",
    replyTo: lead.email,
    subject: `${lead.tier === "hospital" ? "Hospital" : "Enterprise"} lead: ${lead.org}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="margin: 0 0 16px 0;">New ${lead.tier} enquiry</h2>
        <p><strong>Organisation:</strong> ${esc(lead.org)}</p>
        <p><strong>Contact:</strong> ${esc(lead.name)} · ${esc(lead.email)}${lead.phone ? ` · ${esc(lead.phone)}` : ""}</p>
        ${lead.message ? `<p><strong>Message:</strong><br>${esc(lead.message)}</p>` : ""}
      </div>
    `,
  });
}

export async function sendConfirmationEmail(email: string) {
  return resendClient().emails.send({
    from: "Poshan <auth@poshan.co.in>",
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

/**
 * Minimal HTML escaping for values interpolated into an email body.
 *
 * The templates above drop caller-supplied strings straight into markup.
 * For a lead notification read by the Poshan team that is untidy; for the
 * guardian email below, where a child's account holder chooses the name,
 * it is an injection vector pointed at a stranger's inbox. Escaped here
 * rather than trusting the caller, because the caller is exactly who
 * cannot be trusted.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Asks a parent or guardian to confirm, under DPDP s.9(1), that a child's
 * data may be processed.
 *
 * The link is the verification. Nothing in the app may treat the child's
 * data as consented-to until the guardian follows it, which is the whole
 * difference between this and a checkbox claiming "I am a parent".
 *
 * Written plainly and with the refusal path stated first, because the
 * person receiving it did not ask for it and may not know what Poshan is.
 * An email that buries "if this wasn't you, ignore it" under marketing is
 * not seeking consent, it is manufacturing it.
 */
export async function sendGuardianConsentEmail(params: {
  guardianEmail: string;
  guardianName: string;
  childName: string;
  confirmUrl: string;
  expiresHours: number;
}) {
  const guardian = esc(params.guardianName);
  const child = esc(params.childName);
  const url = esc(params.confirmUrl);

  return resendClient().emails.send({
    from: "Poshan <privacy@poshan.co.in>",
    to: params.guardianEmail,
    subject: `Permission needed for ${child}'s nutrition profile`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h2 style="margin: 0 0 16px 0; font-size: 20px;">Someone has asked to add ${child} to Poshan</h2>

        <p style="font-size: 15px; line-height: 1.6;">
          Hello ${guardian}, Poshan is a nutrition app used in India. Someone has
          entered ${child}&rsquo;s details &mdash; age, height, weight and dietary
          preferences &mdash; and named you as their parent or guardian.
        </p>

        <p style="font-size: 15px; line-height: 1.6;">
          <strong>Indian law requires your permission before we may hold a
          child&rsquo;s data.</strong> Until you give it, we will not use
          ${child}&rsquo;s details for anything, and we will never show them
          streaks, badges or leaderboards &mdash; tracking a child&rsquo;s
          behaviour is not permitted regardless of what you decide here.
        </p>

        <p style="font-size: 15px; line-height: 1.6;">
          <strong>If you were not expecting this email, do nothing.</strong>
          The request expires by itself in ${params.expiresHours} hours and the
          details are deleted.
        </p>

        <p style="margin: 28px 0;">
          <a href="${url}"
             style="background: #C75B12; color: #fff; padding: 13px 22px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Yes, I give permission
          </a>
        </p>

        <p style="font-size: 13px; color: #666; line-height: 1.6;">
          You can withdraw this permission at any time by replying to this
          email. Questions or complaints go to ${esc(FIDUCIARY.grievanceOfficer.name)},
          Grievance Officer at ${esc(FIDUCIARY.legalName)} —
          <a href="mailto:${esc(FIDUCIARY.grievanceOfficer.email)}" style="color: #C75B12;">${esc(FIDUCIARY.grievanceOfficer.email)}</a>.
        </p>
      </div>
    `,
  });
}
