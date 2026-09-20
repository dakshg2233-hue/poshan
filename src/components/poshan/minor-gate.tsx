"use client";

import { useState } from "react";
import { useLang } from "./lang-provider";

/**
 * The s.9(1) gate, for a 13-to-17-year-old who signed up for themselves.
 *
 * profiles.age has allowed 13 since the first schema, so this is not a
 * hypothetical user — it is one Poshan has always accepted and never
 * treated differently. Under the Act their data may not be processed at
 * all until a parent or guardian has verifiably consented.
 *
 * Written to be read by a teenager, which rules out the register the rest
 * of a privacy flow is usually written in. Three things it does on
 * purpose:
 *
 *   - Says what happens next in the order it happens, so the wait for a
 *     parent to check their email is expected rather than a dead end.
 *   - Does not ask them to prove their age or justify themselves. They
 *     entered a number; taking it at face value and acting on it is the
 *     respectful reading, and a child lying downward is not a risk this
 *     screen can address anyway.
 *   - Is honest that they can stop. Closing the page is an option with a
 *     stated consequence, not a failure state.
 *
 * It does not block the nutrition content. Poshan is a food app and a
 * seventeen-year-old reading about dal is not processing that needs
 * consent; what needs consent is Poshan *storing their profile*, which is
 * what this gate stands in front of.
 */
export function MinorGate({
  age,
  onSent,
  onSkip,
}: {
  age: number;
  onSent: () => void;
  onSkip?: () => void;
}) {
  const { T, lang } = useLang();
  const [form, setForm] = useState({ name: "", email: "", relationship: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/privacy/parental-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forSelf: true,
          guardianName: form.name,
          guardianEmail: form.email,
          guardianRelationship: form.relationship,
          lang,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not send the request.");
      setSent(true);
      onSent();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="grid gap-3 text-center">
        <h2 className="text-[1.5rem]" style={{ fontFamily: "var(--font-display)" }}>
          {T({ en: "We've emailed them", hi: "हमने उन्हें ईमेल भेज दिया है" })}
        </h2>
        <p className="text-[0.92rem]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "As soon as they say yes, your profile is saved and everything works normally. You can close this page — nothing is lost.",
            hi: "जैसे ही वे हाँ कहते हैं, आपकी प्रोफ़ाइल सहेज ली जाती है और सब कुछ सामान्य रूप से काम करता है। आप यह पृष्ठ बंद कर सकते हैं — कुछ भी नहीं खोएगा।",
          })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <h2 className="text-[1.5rem]" style={{ fontFamily: "var(--font-display)" }}>
        {T({ en: "One thing first", hi: "पहले एक बात" })}
      </h2>

      <p className="text-[0.92rem] leading-relaxed">
        {T({
          en: `You told us you're ${age}. Indian law says we need a parent or guardian's permission before we can save a profile for anyone under 18 — so we need an adult's email to ask them.`,
          hi: `आपने बताया कि आप ${age} वर्ष के हैं। भारतीय कानून के अनुसार 18 वर्ष से कम आयु के किसी भी व्यक्ति की प्रोफ़ाइल सहेजने से पहले माता-पिता या अभिभावक की अनुमति चाहिए — इसलिए हमें एक वयस्क का ईमेल चाहिए।`,
        })}
      </p>

      <div className="rounded-xl p-3.5 text-[0.85rem]" style={{ background: "var(--roti-2)" }}>
        {T({
          en: "Two things worth knowing: they only get asked once, and streaks, badges and leaderboards stay off for under-18s whatever they answer — that part isn't a setting.",
          hi: "दो बातें जानने लायक: उनसे केवल एक बार पूछा जाएगा, और 18 से कम उम्र वालों के लिए स्ट्रीक, बैज और लीडरबोर्ड बंद रहेंगे, चाहे वे कुछ भी उत्तर दें — यह कोई सेटिंग नहीं है।",
        })}
      </div>

      <div className="grid gap-2">
        <input
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={T({ en: "Their name", hi: "उनका नाम" })}
          className="min-h-11 rounded-lg px-3 text-[0.9rem]"
          style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder={T({ en: "Their email address", hi: "उनका ईमेल पता" })}
          className="min-h-11 rounded-lg px-3 text-[0.9rem]"
          style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
        />
        <input
          required
          value={form.relationship}
          onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
          placeholder={T({ en: "Mother, father, guardian…", hi: "माता, पिता, अभिभावक…" })}
          className="min-h-11 rounded-lg px-3 text-[0.9rem]"
          style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
        />
      </div>

      {error && (
        <p className="text-[0.85rem]" role="alert" style={{ color: "#C0392B" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="min-h-12 rounded-full font-bold text-[0.95rem] disabled:opacity-60"
        style={{ background: "var(--kesar-fill)", color: "#fff" }}
      >
        {busy
          ? T({ en: "Sending…", hi: "भेजा जा रहा है…" })
          : T({ en: "Ask them", hi: "उनसे पूछें" })}
      </button>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="text-[0.85rem] underline"
          style={{ color: "var(--ink-soft)" }}
        >
          {T({
            en: "Not now — I'll just browse the food",
            hi: "अभी नहीं — मैं बस भोजन देखूँगा",
          })}
        </button>
      )}
    </form>
  );
}
