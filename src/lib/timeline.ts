import { serviceClient } from "./supabase";
import { today } from "@/lib/day";

/**
 * Writes to the health timeline.
 *
 * The timeline is a thin index, not a second copy of the data — see the
 * migration's comment on timeline_events for why. Each row records that
 * something happened and where the real record lives, so a lab value has
 * exactly one home (lab_values) and the timeline points at it. Two copies
 * of a number a clinician may act on will drift, and the copy in the
 * prettier screen is the one people will believe.
 *
 * Every write is idempotent on (user_id, source_table, source_id) via a
 * unique index, so a retried request adds nothing. Best-effort like the
 * audit log: failing to index an event must never fail the write it
 * describes.
 */

export type TimelineKind =
  | "lab"
  | "plan"
  | "weight"
  | "consultation"
  | "condition"
  | "streak"
  | "scan"
  | "symptom";

export const KIND_META: Record<TimelineKind, { icon: string; label: { en: string; hi: string } }> = {
  lab: { icon: "🧪", label: { en: "Lab result", hi: "जाँच परिणाम" } },
  plan: { icon: "🥗", label: { en: "Diet plan", hi: "आहार योजना" } },
  weight: { icon: "⚖️", label: { en: "Weight", hi: "वज़न" } },
  consultation: { icon: "👨‍⚕️", label: { en: "Consultation", hi: "परामर्श" } },
  condition: { icon: "🩺", label: { en: "Condition", hi: "स्थिति" } },
  streak: { icon: "🔥", label: { en: "Milestone", hi: "उपलब्धि" } },
  scan: { icon: "📷", label: { en: "Meal scan", hi: "भोजन स्कैन" } },
  symptom: { icon: "📝", label: { en: "Symptom", hi: "लक्षण" } },
};

export async function recordTimelineEvent(params: {
  userId: string;
  kind: TimelineKind;
  title: string;
  occurredOn?: string;
  detail?: Record<string, unknown>;
  sourceTable?: string;
  sourceId?: string;
}) {
  try {
    const service = serviceClient();
    if (!service) return;

    await service.from("timeline_events").upsert(
      {
        user_id: params.userId,
        kind: params.kind,
        title: params.title,
        occurred_on: params.occurredOn ?? today(),
        detail: params.detail ?? null,
        source_table: params.sourceTable ?? null,
        source_id: params.sourceId ?? null,
      },
      { onConflict: "user_id,source_table,source_id", ignoreDuplicates: true }
    );
  } catch {
    // best-effort — see doc comment above
  }
}

/**
 * Backfills a timeline from records that already exist.
 *
 * A timeline is worthless on day one — one entry reads as a broken screen,
 * not as a history. But a new user often arrives with months of data
 * already in Poshan (weights, labs a clinician entered, plans they were
 * sent) that predates this feature entirely. Rebuilding from those tables
 * means the screen is full the first time it's opened, which is the
 * difference between a feature that lands and one that gets ignored until
 * it fills up on its own.
 *
 * Idempotent by the same unique index, so running it repeatedly is safe
 * and it can simply be called on every timeline read.
 */
export async function backfillTimeline(userId: string) {
  const service = serviceClient();
  if (!service) return;

  try {
    const [labs, weights, plans, conditions] = await Promise.all([
      service.from("lab_values").select("id, marker, value, unit, taken_on").eq("patient_id", userId),
      service.from("weight_logs").select("id, weight_kg, logged_on").eq("user_id", userId),
      service
        .from("care_plans")
        .select("id, status, approved_at, created_at")
        .eq("patient_id", userId)
        .in("status", ["approved", "sent"]),
      service.from("user_conditions").select("id, condition, created_at").eq("user_id", userId),
    ]);

    const rows: Record<string, unknown>[] = [];

    for (const lab of labs.data ?? []) {
      rows.push({
        user_id: userId,
        kind: "lab",
        occurred_on: lab.taken_on,
        title: `${lab.marker.toUpperCase()} ${lab.value} ${lab.unit}`,
        detail: { marker: lab.marker, value: lab.value, unit: lab.unit },
        source_table: "lab_values",
        source_id: lab.id,
      });
    }

    for (const w of weights.data ?? []) {
      rows.push({
        user_id: userId,
        kind: "weight",
        occurred_on: w.logged_on,
        title: `${w.weight_kg} kg`,
        detail: { weight_kg: w.weight_kg },
        source_table: "weight_logs",
        source_id: w.id,
      });
    }

    for (const p of plans.data ?? []) {
      rows.push({
        user_id: userId,
        kind: "plan",
        occurred_on: (p.approved_at ?? p.created_at ?? new Date().toISOString()).slice(0, 10),
        title: "Diet plan approved by your clinician",
        source_table: "care_plans",
        source_id: p.id,
      });
    }

    for (const c of conditions.data ?? []) {
      rows.push({
        user_id: userId,
        kind: "condition",
        occurred_on: (c.created_at ?? new Date().toISOString()).slice(0, 10),
        title: `Added ${c.condition.replace(/_/g, " ")} to your profile`,
        source_table: "user_conditions",
        source_id: c.id,
      });
    }

    if (rows.length === 0) return;

    const { error } = await service
      .from("timeline_events")
      .upsert(rows, { onConflict: "user_id,source_table,source_id", ignoreDuplicates: true });

    /* Still non-fatal — a failed backfill must not break the timeline read
       it runs inside — but no longer silent. The first version discarded
       this error, and when the dedup index turned out to be un-inferrable
       for ON CONFLICT (42P10, fixed in migration 20260911010000) the result
       was an empty timeline that looked exactly like a user with no
       history. A swallowed error that changes what the user sees needs to
       reach the logs, even when it shouldn't reach the user. */
    if (error) {
      console.error("timeline backfill failed", { code: error.code, message: error.message });
    }
  } catch (err) {
    console.error("timeline backfill threw", err);
  }
}
