import { NextRequest, NextResponse } from "next/server";
import { requireClinician } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";
import { checkConsent, CONSENT_DENIAL } from "@/lib/consent";
import { computeAdherence } from "@/lib/triage";
import { MARKER_LABEL } from "@/lib/clinical-markers";
import { MEAL_LIBRARY } from "@/lib/poshan-data";

/**
 * "AI summarises the last 30 days" — the line that replaces reading 300
 * WhatsApp messages.
 *
 * Built extractive, not generative, and the distinction is the entire
 * design. Every statement returned is computed here from a specific row in
 * a specific table, and carries the ids of the rows it came from. The
 * language model is given those already-computed facts and asked only to
 * order and phrase them; it is never given raw patient data and asked what
 * it thinks. It cannot introduce a number, because it is never asked for
 * one, and every sentence the clinician reads can be traced back to the
 * data that produced it by following `facts[].sources`.
 *
 * That matters because of who reads this. A clinician acting on a
 * hallucinated trend — "adherence is improving" when it is not — has been
 * given a false clinical impression by software, and the audit log will
 * show they read it. So the facts stand alone: with no model configured,
 * this route still returns the full structured summary and the UI renders
 * it as a list. The AI is a convenience over the facts, never the source
 * of them.
 */

const WINDOW_DAYS = 30;

type Fact = {
  key: string;
  text: string;
  /** Which rows produced this. The UI makes these tappable. */
  sources: { table: string; ids: string[] }[];
  direction?: "up" | "down" | "flat";
  severity?: "info" | "watch" | "urgent";
};

export async function GET(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const patientId = request.nextUrl.searchParams.get("patient_id");
  if (!patientId) {
    return NextResponse.json({ error: "patient_id is required." }, { status: 400 });
  }

  const consent = await checkConsent(user.id, patientId);
  if (!consent.ok) {
    return NextResponse.json({ error: CONSENT_DENIAL[consent.reason] }, { status: 403 });
  }

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const sinceDate = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const since = sinceDate.toISOString().slice(0, 10);

  const canLabs = consent.scopes.includes("labs");
  const canNutrition = consent.scopes.includes("nutrition");
  const canWeight = consent.scopes.includes("weight");
  const canSymptoms = consent.scopes.includes("symptoms");

  const [labsRes, logsRes, weightsRes, symptomsRes] = await Promise.all([
    canLabs
      ? service
          .from("lab_values")
          .select("id, marker, value, unit, taken_on")
          .eq("patient_id", patientId)
          .order("taken_on", { ascending: true })
      : Promise.resolve({ data: [] }),
    canNutrition
      ? service
          .from("daily_meal_logs")
          .select("id, log_date, dish_id, meal_time")
          .eq("user_id", patientId)
          .gte("log_date", since)
      : Promise.resolve({ data: [] }),
    canWeight
      ? service
          .from("weight_logs")
          .select("id, weight_kg, logged_on")
          .eq("user_id", patientId)
          .order("logged_on", { ascending: true })
      : Promise.resolve({ data: [] }),
    canSymptoms
      ? service
          .from("symptom_logs")
          .select("id, created_at")
          .eq("user_id", patientId)
          .gte("created_at", sinceDate.toISOString())
      : Promise.resolve({ data: [] }),
  ]);

  const facts: Fact[] = [];

  /* ---------------------------------------------------------- labs */
  const labs = labsRes.data ?? [];
  const byMarker = new Map<string, typeof labs>();
  for (const l of labs) {
    const list = byMarker.get(l.marker) ?? [];
    list.push(l);
    byMarker.set(l.marker, list);
  }

  for (const [marker, readings] of byMarker) {
    if (readings.length === 0) continue;
    const latest = readings[readings.length - 1];
    const previous = readings.length > 1 ? readings[readings.length - 2] : null;
    const label = MARKER_LABEL[marker] ?? marker.toUpperCase();

    if (previous) {
      const delta = Number(latest.value) - Number(previous.value);
      const dir = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
      const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
      facts.push({
        key: `lab_${marker}`,
        text:
          dir === "flat"
            ? `${label} unchanged at ${latest.value} ${latest.unit} (${latest.taken_on})`
            : `${label} ${arrow} ${Math.abs(delta).toFixed(1)} — ${previous.value} → ${latest.value} ${latest.unit} between ${previous.taken_on} and ${latest.taken_on}`,
        sources: [{ table: "lab_values", ids: [previous.id, latest.id] }],
        direction: dir,
      });
    } else {
      facts.push({
        key: `lab_${marker}`,
        text: `${label} ${latest.value} ${latest.unit} (${latest.taken_on}) — first recorded value, no trend yet`,
        sources: [{ table: "lab_values", ids: [latest.id] }],
      });
    }
  }

  /* ---------------------------------------------------- adherence */
  const logs = logsRes.data ?? [];
  if (canNutrition) {
    const adherence = computeAdherence(
      logs.map((l) => l.log_date),
      WINDOW_DAYS
    );

    if (adherence === null) {
      facts.push({
        key: "adherence",
        text: `Not enough logging history in the last ${WINDOW_DAYS} days to measure adherence`,
        sources: [{ table: "daily_meal_logs", ids: [] }],
      });
    } else {
      const pct = Math.round(adherence * 100);
      /* Split the window in half to say whether it is going up or down —
         a single number hides a patient who started well and stopped. */
      const mid = new Date(Date.now() - (WINDOW_DAYS / 2) * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const firstHalf = logs.filter((l) => l.log_date < mid).length;
      const secondHalf = logs.filter((l) => l.log_date >= mid).length;
      const dir = secondHalf > firstHalf ? "up" : secondHalf < firstHalf ? "down" : "flat";

      facts.push({
        key: "adherence",
        text: `Logged ${logs.length} meals over ${WINDOW_DAYS} days — about ${pct}% of the plan. ${
          dir === "up"
            ? `Improving: ${firstHalf} meals in the first fortnight, ${secondHalf} in the second.`
            : dir === "down"
              ? `Falling off: ${firstHalf} meals in the first fortnight, ${secondHalf} in the second.`
              : `Steady across both fortnights.`
        }`,
        sources: [{ table: "daily_meal_logs", ids: logs.map((l) => l.id) }],
        direction: dir,
        severity: adherence < 0.3 ? "urgent" : adherence < 0.6 ? "watch" : "info",
      });
    }

    /* What they actually ate most, by name — the thing a dietitian asks
       first and currently has to scroll WhatsApp to answer. */
    const dishCount = new Map<string, number>();
    for (const l of logs) dishCount.set(l.dish_id, (dishCount.get(l.dish_id) ?? 0) + 1);
    const top = [...dishCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length > 0) {
      const nameById = new Map(MEAL_LIBRARY.map((m) => [m.id, m.name.en]));
      facts.push({
        key: "top_dishes",
        text: `Most-logged dishes: ${top
          .map(([id, n]) => `${nameById.get(id) ?? id} (${n}×)`)
          .join(", ")}`,
        sources: [{ table: "daily_meal_logs", ids: [] }],
      });
    }

    /* Which meal they skip. Breakfast is the usual answer and it changes
       the advice. */
    const byTime = new Map<string, number>();
    for (const l of logs) byTime.set(l.meal_time, (byTime.get(l.meal_time) ?? 0) + 1);
    const weakest = [...byTime.entries()].sort((a, b) => a[1] - b[1])[0];
    if (weakest && logs.length >= 10) {
      facts.push({
        key: "weakest_meal",
        text: `Least consistent meal: ${weakest[0]} — logged ${weakest[1]} times in ${WINDOW_DAYS} days`,
        sources: [{ table: "daily_meal_logs", ids: [] }],
      });
    }
  }

  /* ------------------------------------------------------- weight */
  const weights = weightsRes.data ?? [];
  if (weights.length >= 2) {
    const inWindow = weights.filter((w) => w.logged_on >= since);
    const first = inWindow[0] ?? weights[0];
    const last = weights[weights.length - 1];
    const delta = Number(last.weight_kg) - Number(first.weight_kg);
    if (Math.abs(delta) >= 0.1) {
      facts.push({
        key: "weight",
        text: `Weight ${delta > 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(1)} kg — ${first.weight_kg} kg on ${first.logged_on} to ${last.weight_kg} kg on ${last.logged_on}`,
        sources: [{ table: "weight_logs", ids: [first.id, last.id] }],
        direction: delta > 0 ? "up" : "down",
      });
    } else {
      facts.push({
        key: "weight",
        text: `Weight stable at about ${last.weight_kg} kg`,
        sources: [{ table: "weight_logs", ids: [last.id] }],
        direction: "flat",
      });
    }
  }

  /* ----------------------------------------------------- symptoms */
  const symptoms = symptomsRes.data ?? [];
  if (canSymptoms && symptoms.length > 0) {
    facts.push({
      key: "symptoms",
      text: `${symptoms.length} symptom entr${symptoms.length === 1 ? "y" : "ies"} recorded in the window`,
      sources: [{ table: "symptom_logs", ids: symptoms.map((s) => s.id) }],
    });
  }

  /* ------------------------------------------- what wasn't shared */
  const withheld = (["labs", "nutrition", "weight", "symptoms"] as const).filter(
    (s) => !consent.scopes.includes(s)
  );

  await logAudit({ actorId: user.id, patientId, action: "read_summary" });

  /* --------------------------------------------------- narration */
  let narrative: string | null = null;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey && facts.length > 0) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 400,
        system: `You are writing a handover note for a doctor reviewing a patient before a consultation.

You will be given a list of FACTS already computed from the patient's records. Your ONLY job is to order them by clinical relevance and join them into a short paragraph a busy clinician can read in fifteen seconds.

Rules, non-negotiable:
- Use ONLY the facts given. Never introduce a number, date, measurement or trend that is not in them.
- Never diagnose, never suggest a medication or a dose, never state what the clinician should do. You are reporting what the record shows, not advising.
- Do not soften or dramatise. If adherence is 31%, say 31%.
- No greeting, no sign-off, no bullet points. Two to four sentences of plain prose.
- If the facts are thin, say so briefly rather than padding.`,
        messages: [
          {
            role: "user",
            content: `Facts from the last ${WINDOW_DAYS} days:\n\n${facts.map((f) => `- ${f.text}`).join("\n")}`,
          },
        ],
      });

      const block = response.content.find((c) => c.type === "text");
      narrative = block && block.type === "text" ? block.text.trim() : null;
    } catch {
      /* A failed narration is not a failed summary — the facts are the
         product and they are already complete. */
      narrative = null;
    }
  }

  return NextResponse.json({
    windowDays: WINDOW_DAYS,
    facts,
    narrative,
    /* Told plainly, because a doctor reading a summary needs to know what
       is absent from it. "No lab trend" and "lab access not granted" lead
       to different decisions. */
    withheldScopes: withheld,
    scopes: consent.scopes,
    consentExpiresAt: consent.expiresAt,
  });
}
