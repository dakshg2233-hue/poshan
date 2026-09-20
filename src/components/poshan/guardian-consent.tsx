"use client";

import { useEffect, useState } from "react";
import { FIDUCIARY } from "@/lib/dpdp";

/**
 * What a parent or guardian sees when they follow the s.9(1) link.
 *
 * Written for someone who did not ask for this and may never have heard of
 * Poshan. That shapes three things:
 *
 *   - Refusing is a button, not a link in the small print, and it sits
 *     beside granting at the same visual weight. A consent screen where
 *     "no" is harder to find than "yes" is not seeking consent.
 *   - What Poshan will and will not do is stated before the buttons, not
 *     after them, and includes the part the guardian cannot change: the
 *     child gets no streaks, badges or leaderboard whatever they decide,
 *     because s.9(3) is not theirs to waive.
 *   - Doing nothing is named as a valid option with a stated consequence,
 *     since an ignored email is the most likely outcome and silence should
 *     not read as agreement.
 *
 * Deliberately not bilingual through the LangProvider: this page is
 * reached from an email, outside the app shell, by someone who has never
 * set a language preference. It shows both languages at once rather than
 * guessing, which is the honest option when the reader is a stranger.
 */

type State =
  | { phase: "loading" }
  | { phase: "error"; status: string }
  | {
      phase: "ready";
      guardianName: string;
      relationship: string;
      childName: string;
      expiresAt: string | null;
    }
  | { phase: "done"; outcome: "confirmed" | "refused" | "already_confirmed" };

const MESSAGES: Record<string, { en: string; hi: string }> = {
  invalid: {
    en: "This link is not valid. It may have already been used.",
    hi: "यह लिंक मान्य नहीं है। संभव है इसका पहले उपयोग हो चुका हो।",
  },
  expired: {
    en: "This link has expired. Ask whoever sent it to request permission again.",
    hi: "यह लिंक समाप्त हो गया है। जिसने भेजा था, उनसे दोबारा अनुरोध करने को कहें।",
  },
  revoked: {
    en: "This request was already declined. Nothing further is needed from you.",
    hi: "यह अनुरोध पहले ही अस्वीकार किया जा चुका है। अब आपसे कुछ और अपेक्षित नहीं है।",
  },
  unconfigured: {
    en: `Something is wrong on our side. Please write to ${FIDUCIARY.grievanceOfficer.email}.`,
    hi: `हमारी ओर से कोई समस्या है। कृपया ${FIDUCIARY.grievanceOfficer.email} पर लिखें।`,
  },
};

export function GuardianConsent({ token }: { token: string }) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/privacy/parental-consent/${token}`);
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok) return setState({ phase: "error", status: json.status ?? "invalid" });
        if (json.status === "already_confirmed") {
          return setState({ phase: "done", outcome: "already_confirmed" });
        }
        setState({
          phase: "ready",
          guardianName: json.guardianName,
          relationship: json.relationship,
          childName: json.childName,
          expiresAt: json.expiresAt,
        });
      } catch {
        if (!cancelled) setState({ phase: "error", status: "invalid" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function decide(decision: "grant" | "refuse") {
    setBusy(true);
    try {
      const res = await fetch(`/api/privacy/parental-consent/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!res.ok) {
        setState({ phase: "error", status: json.status ?? "invalid" });
        return;
      }
      setState({
        phase: "done",
        outcome: json.status === "refused" ? "refused" : "confirmed",
      });
    } catch {
      setState({ phase: "error", status: "invalid" });
    } finally {
      setBusy(false);
    }
  }

  if (state.phase === "loading") {
    return <p className="text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>Loading… · लोड हो रहा है…</p>;
  }

  if (state.phase === "error") {
    const m = MESSAGES[state.status] ?? MESSAGES.invalid;
    return (
      <>
        <h1 className="text-[1.8rem]" style={{ fontFamily: "var(--font-display)" }}>
          Poshan
        </h1>
        <p className="mt-4 text-[0.95rem]">{m.en}</p>
        <p className="mt-1 text-[0.95rem]" style={{ color: "var(--ink-soft)" }}>{m.hi}</p>
      </>
    );
  }

  if (state.phase === "done") {
    const copy = {
      confirmed: {
        en: `Thank you. Permission recorded — you can withdraw it at any time by writing to ${FIDUCIARY.grievanceOfficer.email}.`,
        hi: `धन्यवाद। अनुमति दर्ज कर ली गई — आप इसे कभी भी ${FIDUCIARY.grievanceOfficer.email} पर लिखकर वापस ले सकते हैं।`,
      },
      refused: {
        en: "Recorded. We will not use this child's data, and nobody will ask you again about this request.",
        hi: "दर्ज कर लिया गया। हम इस बच्चे का डेटा उपयोग नहीं करेंगे, और इस अनुरोध के बारे में आपसे दोबारा नहीं पूछा जाएगा।",
      },
      already_confirmed: {
        en: "This permission was already given. Nothing further is needed.",
        hi: "यह अनुमति पहले ही दी जा चुकी है। अब कुछ और अपेक्षित नहीं है।",
      },
    }[state.outcome];

    return (
      <>
        <h1 className="text-[1.8rem]" style={{ fontFamily: "var(--font-display)" }}>
          Poshan
        </h1>
        <p className="mt-4 text-[0.95rem]">{copy.en}</p>
        <p className="mt-1 text-[0.95rem]" style={{ color: "var(--ink-soft)" }}>{copy.hi}</p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[1.8rem]" style={{ fontFamily: "var(--font-display)" }}>
        Permission for {state.childName}
      </h1>

      <section className="mt-6 grid gap-4 text-[0.95rem] leading-relaxed">
        <p>
          Hello {state.guardianName}. Someone has added <strong>{state.childName}</strong> to
          Poshan, a nutrition app, and named you as their {state.relationship}.
        </p>
        <p style={{ color: "var(--ink-soft)" }}>
          नमस्ते। किसी ने <strong>{state.childName}</strong> को पोषण ऐप में जोड़ा है और आपको
          उनका {state.relationship} बताया है।
        </p>

        <div
          className="rounded-xl p-4 text-[0.9rem]"
          style={{ background: "var(--roti-2)" }}
        >
          <p className="font-semibold">If you give permission, Poshan will:</p>
          <ul className="ml-5 mt-2 list-disc grid gap-1">
            <li>Store their age, height, weight and dietary preferences.</li>
            <li>Use those to work out suitable portions and meals.</li>
          </ul>
          <p className="mt-3 font-semibold">It will not, whatever you decide:</p>
          <ul className="ml-5 mt-2 list-disc grid gap-1">
            <li>Show them streaks, badges or leaderboards.</li>
            <li>Track their behaviour or show them advertising.</li>
          </ul>
          <p className="mt-3" style={{ color: "var(--ink-soft)" }}>
            The second list is not a setting. Indian law forbids it for children,
            and we could not switch it on even at your request.
          </p>
        </div>

        <p style={{ color: "var(--ink-soft)" }}>
          If you were not expecting this, close this page. The request expires by
          itself and the details are deleted. · यदि आपको इसकी अपेक्षा नहीं थी, तो यह
          पृष्ठ बंद कर दें।
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("grant")}
          className="min-h-11 rounded-full px-5 text-[0.9rem] font-semibold disabled:opacity-50"
          style={{ background: "var(--kesar-fill)", color: "#fff" }}
        >
          Yes, I give permission
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("refuse")}
          className="min-h-11 rounded-full px-5 text-[0.9rem] font-semibold disabled:opacity-50"
          style={{ border: "1.5px solid var(--line)", color: "var(--ink)" }}
        >
          No, do not use their data
        </button>
      </div>
    </>
  );
}
