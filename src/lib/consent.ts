import { serviceClient } from "./supabase";

/**
 * The one place that answers "may this clinician see this kind of data
 * about this patient, right now?".
 *
 * Every clinician-facing route asks this before reading anything. It exists
 * as a function rather than as RLS policies because a scope check needs
 * three facts at once — the link is active, the scope is in its array, and
 * the grant has not lapsed — and expressing "has not lapsed" in a policy
 * means every table's policy carries its own copy of the expiry rule. One
 * copy here, called explicitly, is the version that can't drift.
 *
 * Deliberately fails closed: any error, any missing row, any lapsed grant
 * returns false. A read that should have been blocked is worse than a read
 * that fails.
 */

export const CONSENT_SCOPES = [
  "labs",
  "nutrition",
  "conditions",
  "medications",
  "mental_health",
  "weight",
  "symptoms",
] as const;

export type ConsentScope = (typeof CONSENT_SCOPES)[number];

/** What each scope actually unlocks, shown to the patient at grant time. */
export const SCOPE_LABELS: Record<ConsentScope, { en: string; hi: string }> = {
  labs: { en: "Lab reports", hi: "जाँच रिपोर्ट" },
  nutrition: { en: "Meals and nutrition", hi: "भोजन और पोषण" },
  conditions: { en: "Health conditions", hi: "स्वास्थ्य स्थितियाँ" },
  medications: { en: "Medications", hi: "दवाइयाँ" },
  mental_health: { en: "Mental-health notes", hi: "मानसिक स्वास्थ्य टिप्पणियाँ" },
  weight: { en: "Weight history", hi: "वज़न का इतिहास" },
  symptoms: { en: "Symptom journal", hi: "लक्षण डायरी" },
};

/**
 * The two scopes a nutrition consultation actually needs. Offered as the
 * pre-ticked default in the grant dialog so the common case is one tap,
 * while everything else stays an explicit, deliberate choice by the
 * patient — a consent screen where all boxes start ticked is a dark
 * pattern, not a consent screen.
 */
export const DEFAULT_SCOPES: ConsentScope[] = ["labs", "nutrition"];

export type ConsentState =
  | { ok: true; scopes: ConsentScope[]; expiresAt: string | null }
  | { ok: false; reason: "no_link" | "revoked" | "expired" | "scope_not_granted" | "error" };

/**
 * Resolve the live consent between a clinician and a patient.
 *
 * `scope` is optional: pass it to ask "may I read labs?", omit it to ask
 * the weaker "is there any live link at all?" — which is what a patient
 * list needs, since a clinician is allowed to know a patient exists on
 * their roster without being allowed to open every category of their data.
 */
export async function checkConsent(
  clinicianId: string,
  patientId: string,
  scope?: ConsentScope
): Promise<ConsentState> {
  const service = serviceClient();
  if (!service) return { ok: false, reason: "error" };

  try {
    const { data, error } = await service
      .from("patient_links")
      .select("status, scopes, access_expires_at")
      .eq("clinician_id", clinicianId)
      .eq("patient_id", patientId)
      .eq("status", "active")
      .maybeSingle();

    if (error) return { ok: false, reason: "error" };
    if (!data) return { ok: false, reason: "no_link" };

    if (data.access_expires_at && new Date(data.access_expires_at) < new Date()) {
      return { ok: false, reason: "expired" };
    }

    const scopes = (data.scopes ?? []) as ConsentScope[];
    if (scope && !scopes.includes(scope)) {
      return { ok: false, reason: "scope_not_granted" };
    }

    return { ok: true, scopes, expiresAt: data.access_expires_at ?? null };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Patient-facing wording for why a read was refused. */
export const CONSENT_DENIAL: Record<
  Exclude<ConsentState & { ok: false }, { ok: true }>["reason"],
  string
> = {
  no_link: "This patient has not granted you access.",
  revoked: "This patient has revoked your access.",
  expired: "This patient's consent has expired. Ask them to grant access again.",
  scope_not_granted: "This patient has not shared this category of data with you.",
  error: "Consent could not be verified, so the read was refused.",
};

/**
 * How long a grant should last by default, in days, offered as presets in
 * the grant dialog. 30 days matches a typical follow-up interval; the
 * "until I revoke it" option is deliberately last and not the default,
 * because an open-ended grant is the one a patient forgets they made.
 */
export const DURATION_PRESETS = [
  { days: 30, label: { en: "30 days", hi: "30 दिन" } },
  { days: 90, label: { en: "90 days", hi: "90 दिन" } },
  { days: 365, label: { en: "1 year", hi: "1 वर्ष" } },
  { days: null, label: { en: "Until I revoke it", hi: "जब तक मैं वापस न लूँ" } },
] as const;

export function expiryFromDays(days: number | null): string | null {
  if (days === null) return null;
  return new Date(Date.now() + days * 86_400_000).toISOString();
}
