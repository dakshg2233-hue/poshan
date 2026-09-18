"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "./lang-provider";
import { useTimeline, type TimelineEvent } from "@/lib/hooks/use-timeline";
import { KIND_META, type TimelineKind } from "@/lib/timeline";
import { SignInPrompt } from "./sign-in-prompt";
import { track } from "@/lib/analytics";
import { today } from "@/lib/day";

/**
 * The health timeline: every lab, plan, weight and consultation on one
 * scroll, newest first.
 *
 * This is the screen that changes what Poshan *is* to the person using it.
 * A calorie tracker is something you use for three weeks; a health history
 * is something you don't delete, because leaving means losing it. That's
 * the whole strategic point of building it, and it's why the route
 * backfills from existing records before the first read — a timeline that
 * starts empty and fills up over six months never gets the chance to be
 * the reason someone stays.
 *
 * Grouped by month rather than shown flat: health doesn't happen daily,
 * and a flat list of 200 weight entries buries the two lab results that
 * matter.
 */
export function HealthTimeline() {
  const { T, lang } = useLang();
  const { events, loading, signedOut, error, addEvent } = useTimeline();
  const [filter, setFilter] = useState<TimelineKind | "all">("all");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.kind === filter)),
    [events, filter]
  );

  /* Which kinds this user actually has. Offering a "Consultations" filter
     to someone with none is a control that can only disappoint. */
  const availableKinds = useMemo(() => {
    const kinds = new Set(events.map((e) => e.kind));
    return (Object.keys(KIND_META) as TimelineKind[]).filter((k) => kinds.has(k));
  }, [events]);

  const months = useMemo(() => groupByMonth(filtered, lang), [filtered, lang]);

  /* Fired once the fetch has settled and the screen is actually usable,
     not on mount — a 401 bounce isn't someone opening their timeline, and
     counting it would inflate the only number that says whether this
     screen earns its place. */
  useEffect(() => {
    if (!loading && !signedOut && !error) track("timeline_opened", { events: events.length });
  }, [loading, signedOut, error, events.length]);

  if (loading) {
    return (
      <div className="py-10 text-center text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>
        {T({ en: "Loading your history…", hi: "आपका इतिहास लोड हो रहा है…" })}
      </div>
    );
  }

  if (signedOut) {
    return (
      <SignInPrompt
        next="/timeline"
        title={{ en: "Your timeline is private", hi: "आपकी समयरेखा निजी है" }}
        detail={{
          en: "Sign in to see every lab result, plan and reading Poshan holds for you.",
          hi: "पोषण के पास आपकी हर जाँच, प्लान और माप देखने के लिए साइन इन करें।",
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>
        {error}
      </div>
    );
  }

  return (
    <section className="w-full">
      <header className="mb-6">
        <h2
          className="text-[clamp(1.5rem,3.5vw,2.1rem)] leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {T({ en: "Your health timeline", hi: "आपकी स्वास्थ्य समयरेखा" })}
        </h2>
        <p className="mt-2 text-[0.92rem] max-w-[52ch]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "Every lab result, plan and reading Poshan holds for you, oldest at the bottom. This is your record — you can export or delete it any time.",
            hi: "आपके लिए पोषण के पास मौजूद हर जाँच, प्लान और माप — सबसे पुराना नीचे। यह आपका रिकॉर्ड है, आप जब चाहें निर्यात या मिटा सकते हैं।",
          })}
        </p>
      </header>

      {events.length === 0 ? (
        <EmptyTimeline onAdd={() => setAdding(true)} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              {T({ en: "Everything", hi: "सब कुछ" })}
            </FilterChip>
            {availableKinds.map((k) => (
              <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)}>
                {KIND_META[k].icon} {T(KIND_META[k].label)}
              </FilterChip>
            ))}
          </div>

          <div className="relative">
            {/* The spine. Sits behind the dots, inset to their centre. */}
            <div
              aria-hidden
              className="absolute left-[15px] top-2 bottom-2 w-px"
              style={{ background: "var(--line, rgba(0,0,0,0.12))" }}
            />

            {months.map((month) => (
              <div key={month.key} className="mb-8">
                <h3
                  className="text-[0.78rem] font-semibold uppercase tracking-wider mb-3 pl-10"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {month.label}
                </h3>
                <ul className="list-none p-0 m-0 grid gap-3">
                  {month.events.map((e) => (
                    <TimelineRow key={e.id} event={e} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-6">
        {adding ? (
          <AddEventForm
            onCancel={() => setAdding(false)}
            onSave={async (kind, title, date) => {
              await addEvent(kind, title, date);
              setAdding(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-[0.86rem] underline underline-offset-4"
            style={{ color: "var(--kesar)" }}
          >
            {T({ en: "Add something that happened elsewhere", hi: "कहीं और हुई कोई बात जोड़ें" })}
          </button>
        )}
      </div>
    </section>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const { T, lang } = useLang();
  const meta = KIND_META[event.kind];
  const selfReported = (event.detail as { self_reported?: boolean } | null)?.self_reported;

  return (
    <li className="flex gap-3 items-start">
      <span
        aria-hidden
        className="shrink-0 grid place-items-center rounded-full text-[0.9rem] leading-none relative z-[1]"
        style={{
          width: 31,
          height: 31,
          background: "var(--roti)",
          border: "1px solid var(--line, rgba(0,0,0,0.12))",
        }}
      >
        {meta.icon}
      </span>

      <div className="min-w-0 flex-1 pt-[3px]">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[0.95rem]">{event.title}</span>
          {selfReported && (
            /* Marked, because a doctor may read this screen over the
               patient's shoulder. A self-entered consultation and one
               Poshan recorded are different kinds of evidence and should
               never look identical. */
            <span
              className="text-[0.68rem] px-1.5 py-[1px] rounded-full"
              style={{ background: "var(--roti-2)", color: "var(--ink-soft)" }}
            >
              {T({ en: "you added this", hi: "आपने जोड़ा" })}
            </span>
          )}
        </div>
        <time
          dateTime={event.occurred_on}
          className="text-[0.78rem] tabular-nums"
          style={{ color: "var(--ink-soft)", fontFamily: "var(--font-data)" }}
        >
          {new Date(event.occurred_on).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </time>
      </div>
    </li>
  );
}

function EmptyTimeline({ onAdd }: { onAdd: () => void }) {
  const { T } = useLang();
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: "var(--roti-2)" }}
    >
      <p className="text-[1rem] mb-2">
        {T({ en: "Nothing here yet.", hi: "अभी यहाँ कुछ नहीं है।" })}
      </p>
      <p className="text-[0.88rem] max-w-[42ch] mx-auto" style={{ color: "var(--ink-soft)" }}>
        {T({
          en: "Log a weight, add a lab report, or have a clinician send you a plan — everything lands here automatically.",
          hi: "वज़न दर्ज करें, जाँच रिपोर्ट जोड़ें, या किसी चिकित्सक से प्लान भेजने को कहें — सब यहाँ अपने आप आ जाएगा।",
        })}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 text-[0.86rem] underline underline-offset-4"
        style={{ color: "var(--kesar)" }}
      >
        {T({ en: "Or add something by hand", hi: "या हाथ से कुछ जोड़ें" })}
      </button>
    </div>
  );
}

/** Only the kinds a person can honestly assert about their own life — see
 *  the SELF_REPORTABLE note in /api/timeline for why labs aren't here. */
const SELF_KINDS: TimelineKind[] = ["consultation", "symptom", "weight", "condition"];

function AddEventForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (kind: TimelineKind, title: string, date: string) => Promise<void>;
}) {
  const { T } = useLang();
  const [kind, setKind] = useState<TimelineKind>("consultation");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="rounded-2xl p-5 grid gap-3"
      style={{ background: "var(--roti-2)" }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        setErr(null);
        try {
          await onSave(kind, title.trim(), date);
        } catch (error) {
          setErr(error instanceof Error ? error.message : "Could not add that.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex flex-wrap gap-2">
        {SELF_KINDS.map((k) => (
          <FilterChip key={k} active={kind === k} onClick={() => setKind(k)} type="button">
            {KIND_META[k].icon} {T(KIND_META[k].label)}
          </FilterChip>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={140}
        placeholder={T({
          en: "What happened? e.g. Saw Dr Sharma about my thyroid",
          hi: "क्या हुआ? जैसे थायरॉइड के लिए डॉ. शर्मा से मिला",
        })}
        className="w-full rounded-lg px-3 py-2 text-[0.92rem]"
        style={{ background: "var(--roti)", border: "1px solid var(--line, rgba(0,0,0,0.12))" }}
      />

      <input
        type="date"
        value={date}
        max={today()}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg px-3 py-2 text-[0.92rem] tabular-nums"
        style={{ background: "var(--roti)", border: "1px solid var(--line, rgba(0,0,0,0.12))" }}
      />

      {err && <p className="text-[0.84rem]" style={{ color: "#C0392B" }}>{err}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-full px-4 py-2 text-[0.86rem] font-semibold disabled:opacity-50"
          style={{ background: "var(--kesar)", color: "var(--roti)" }}
        >
          {busy ? T({ en: "Adding…", hi: "जोड़ रहे हैं…" }) : T({ en: "Add", hi: "जोड़ें" })}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-[0.86rem]"
          style={{ color: "var(--ink-soft)" }}
        >
          {T({ en: "Cancel", hi: "रद्द करें" })}
        </button>
      </div>
    </form>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  type = "button",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full px-3 py-1.5 text-[0.8rem] transition-colors"
      style={{
        background: active ? "var(--kesar)" : "var(--roti-2)",
        color: active ? "var(--roti)" : "var(--ink-soft)",
        border: `1px solid ${active ? "var(--kesar)" : "var(--line, rgba(0,0,0,0.12))"}`,
      }}
    >
      {children}
    </button>
  );
}

function groupByMonth(events: TimelineEvent[], lang: "en" | "hi") {
  const groups = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const key = e.occurred_on.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => ({
      key,
      label: new Date(`${key}-01`).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
        month: "long",
        year: "numeric",
      }),
      events: list,
    }));
}
