"use client";

import { useEffect, useState } from "react";
import { useLang } from "./lang-provider";
import { recordCookieConsent, unloadAnalytics } from "./consent";

/**
 * The rights a Data Principal holds against Poshan itself — DPDP ss.6(4),
 * 11, 12 and 14, made into four things a person can actually do.
 *
 * The Privacy Centre next to this answers "who else has seen my data",
 * which Poshan built early and built well. It never answered "what do you
 * hold, stop holding it, and let me take it with me", and those are the
 * ones the Act is mostly about. Same page, because a person who came here
 * to check on their data should not have to learn that their rights live
 * somewhere else.
 *
 * Every action here is one request. That is the requirement, not a nicety:
 * s.6(4) says withdrawing consent must be as easy as giving it, and the
 * Rules expect erasure to be a mechanism rather than a mailbox. A flow
 * that takes more steps to leave than to join fails the test however good
 * its intentions.
 */

type ConsentRow = {
  purpose: string;
  granted: boolean | null;
  at: string | null;
};

export function YourData() {
  const { T, lang } = useLang();

  const [analytics, setAnalytics] = useState<boolean | null>(null);
  const [nominee, setNominee] = useState({ name: "", email: "", relationship: "" });
  const [nomineeSaved, setNomineeSaved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([
          fetch("/api/privacy/consents").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/profile").then((r) => (r.ok ? r.json() : null)),
        ]);
        const row = (c?.consents as ConsentRow[] | undefined)?.find(
          (x) => x.purpose === "analytics_cookies"
        );
        setAnalytics(row?.granted ?? false);
        if (p?.profile) {
          setNominee({
            name: p.profile.nominee_name ?? "",
            email: p.profile.nominee_email ?? "",
            relationship: p.profile.nominee_relationship ?? "",
          });
        }
      } catch {
        setAnalytics(false);
      }
    })();
  }, []);

  async function toggleAnalytics(next: boolean) {
    setBusy("analytics");
    setAnalytics(next);
    try {
      localStorage.setItem("poshan-consent", next ? "accepted" : "declined");
    } catch {
      /* Blocked storage; the ledger write below is the one that counts. */
    }
    await recordCookieConsent(next, lang);
    /* Withdrawal has to take effect now, not at the next page load.
       Consent that continues to be acted on until the user happens to
       navigate is not consent that was withdrawn. */
    if (!next) unloadAnalytics();
    setBusy(null);
  }

  async function saveNominee(e: React.FormEvent) {
    e.preventDefault();
    setBusy("nominee");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nominee_name: nominee.name || null,
          nominee_email: nominee.email || null,
          nominee_relationship: nominee.relationship || null,
          nominee_updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save.");
      setNomineeSaved(true);
      setTimeout(() => setNomineeSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Deletion failed.");
      /* Hard navigation rather than a router push, and the lint rule is
         overruled deliberately. router.push keeps the React tree, the
         Supabase client and its cached session alive — all of which now
         refer to a user that no longer exists. A full document load is the
         only thing that guarantees no stale authenticated state survives
         the deletion, which on this particular action is the whole point. */
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/?deleted=1";
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <section className="grid gap-10">
      <header>
        <h3 className="text-[1.12rem]" style={{ fontFamily: "var(--font-display)" }}>
          {T({ en: "Your data, and your rights over it", hi: "आपका डेटा, और उस पर आपके अधिकार" })}
        </h3>
        <p className="mt-2 text-[0.85rem] max-w-[54ch]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "Under India's Digital Personal Data Protection Act, you can see what we hold, correct it, take it elsewhere, and have it erased. Each of these is one click, because the law says taking consent back must be as easy as giving it.",
            hi: "भारत के डिजिटल पर्सनल डेटा प्रोटेक्शन अधिनियम के तहत आप देख सकते हैं कि हम क्या रखते हैं, उसे सुधार सकते हैं, कहीं और ले जा सकते हैं, और मिटवा सकते हैं। हर काम एक क्लिक में — क्योंकि कानून कहता है कि सहमति वापस लेना उतना ही आसान होना चाहिए जितना देना।",
          })}
        </p>
      </header>

      {error && (
        <p className="text-[0.86rem]" role="alert" style={{ color: "#C0392B" }}>
          {error}
        </p>
      )}

      {/* ------------------------------------------------ s.11 — access */}
      <div className="rounded-xl p-4" style={{ background: "var(--roti-2)" }}>
        <h4 className="text-[0.98rem] font-semibold">
          {T({ en: "Download everything we hold", hi: "हमारे पास जो कुछ है, डाउनलोड करें" })}
        </h4>
        <p className="mt-1 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "One file with every row attached to your account, and the list of companies it has been shared with.",
            hi: "एक फ़ाइल जिसमें आपके खाते से जुड़ी हर पंक्ति है, और उन कंपनियों की सूची जिनके साथ इसे साझा किया गया है।",
          })}
        </p>
        <a
          href="/api/privacy/export"
          download
          className="mt-3 inline-block min-h-11 rounded-full px-4 py-2.5 text-[0.85rem] font-semibold no-underline"
          style={{ border: "1.5px solid var(--line)", color: "var(--ink)" }}
        >
          {T({ en: "Download my data", hi: "मेरा डेटा डाउनलोड करें" })}
        </a>
      </div>

      {/* --------------------------------------- s.6(4) — withdraw consent */}
      <div className="rounded-xl p-4" style={{ background: "var(--roti-2)" }}>
        <h4 className="text-[0.98rem] font-semibold">
          {T({ en: "Usage measurement", hi: "उपयोग मापन" })}
        </h4>
        <p className="mt-1 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "Anonymous analytics, so we can see which parts of Poshan get used. Never your meals, weight or lab values.",
            hi: "गुमनाम एनालिटिक्स, ताकि हम देख सकें कि पोषण के कौन से हिस्से इस्तेमाल होते हैं। आपका भोजन, वज़न या जाँच मान कभी नहीं।",
          })}
        </p>
        <label className="mt-3 flex items-center gap-3 text-[0.88rem]">
          <input
            type="checkbox"
            checked={analytics === true}
            disabled={analytics === null || busy === "analytics"}
            onChange={(e) => toggleAnalytics(e.target.checked)}
            className="h-5 w-5"
          />
          {analytics
            ? T({ en: "On — turn it off at any time", hi: "चालू — कभी भी बंद करें" })
            : T({ en: "Off", hi: "बंद" })}
        </label>
      </div>

      {/* ----------------------------------------------- s.14 — nomination */}
      <form onSubmit={saveNominee} className="rounded-xl p-4" style={{ background: "var(--roti-2)" }}>
        <h4 className="text-[0.98rem] font-semibold">
          {T({ en: "Nominate someone", hi: "किसी को नामित करें" })}
        </h4>
        <p className="mt-1 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "If you die or become unable to act for yourself, this person may exercise these rights on your behalf. Optional, and you can change or remove it whenever you like.",
            hi: "यदि आपकी मृत्यु हो जाती है या आप स्वयं निर्णय लेने में असमर्थ हो जाते हैं, तो यह व्यक्ति आपकी ओर से ये अधिकार उपयोग कर सकता है। वैकल्पिक, और आप इसे कभी भी बदल या हटा सकते हैं।",
          })}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            value={nominee.name}
            onChange={(e) => setNominee((n) => ({ ...n, name: e.target.value }))}
            placeholder={T({ en: "Name", hi: "नाम" })}
            className="min-h-11 rounded-lg px-3 text-[0.88rem]"
            style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
          />
          <input
            value={nominee.email}
            onChange={(e) => setNominee((n) => ({ ...n, email: e.target.value }))}
            placeholder={T({ en: "Email", hi: "ईमेल" })}
            type="email"
            className="min-h-11 rounded-lg px-3 text-[0.88rem]"
            style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
          />
          <input
            value={nominee.relationship}
            onChange={(e) => setNominee((n) => ({ ...n, relationship: e.target.value }))}
            placeholder={T({ en: "Relationship", hi: "रिश्ता" })}
            className="min-h-11 rounded-lg px-3 text-[0.88rem]"
            style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
          />
        </div>
        <button
          type="submit"
          disabled={busy === "nominee"}
          className="mt-3 min-h-11 rounded-full px-4 text-[0.85rem] font-semibold disabled:opacity-50"
          style={{ border: "1.5px solid var(--line)", color: "var(--ink)" }}
        >
          {nomineeSaved
            ? T({ en: "Saved", hi: "सहेजा गया" })
            : T({ en: "Save nomination", hi: "नामांकन सहेजें" })}
        </button>
      </form>

      {/* -------------------------------------------- s.12(3) — erasure */}
      <div className="rounded-xl p-4" style={{ border: "1.5px solid #C0392B33" }}>
        <h4 className="text-[0.98rem] font-semibold" style={{ color: "#C0392B" }}>
          {T({ en: "Delete my account", hi: "मेरा खाता मिटाएँ" })}
        </h4>
        <p className="mt-1 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "Removes your profile, meals, weights, lab values, conditions, chats, family profiles and payment records. This cannot be undone. Records of which clinicians opened your data are kept but stripped of your identity, so past access stays auditable.",
            hi: "आपकी प्रोफ़ाइल, भोजन, वज़न, जाँच मान, स्थितियाँ, चैट, पारिवारिक प्रोफ़ाइल और भुगतान रिकॉर्ड हटा देता है। यह वापस नहीं लिया जा सकता। किन चिकित्सकों ने आपका डेटा खोला, उसका रिकॉर्ड रहता है पर आपकी पहचान हटाकर।",
          })}
        </p>
        <label className="mt-3 block text-[0.85rem]">
          {T({
            en: "Type DELETE to confirm:",
            hi: "पुष्टि के लिए DELETE लिखें:",
          })}
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1 block min-h-11 w-40 rounded-lg px-3 text-[0.88rem]"
            style={{ border: "1px solid var(--line)", background: "var(--surface)" }}
          />
        </label>
        <button
          type="button"
          disabled={confirmText !== "DELETE" || busy === "delete"}
          onClick={deleteAccount}
          className="mt-3 min-h-11 rounded-full px-4 text-[0.85rem] font-semibold disabled:opacity-40"
          style={{ background: "#C0392B", color: "#fff" }}
        >
          {busy === "delete"
            ? T({ en: "Deleting…", hi: "मिटाया जा रहा है…" })
            : T({ en: "Delete my account permanently", hi: "मेरा खाता स्थायी रूप से मिटाएँ" })}
        </button>
      </div>
    </section>
  );
}
