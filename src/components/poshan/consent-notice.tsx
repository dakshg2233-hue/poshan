"use client";

import { useState } from "react";
import { NOTICE_ITEMS, PROCESSORS, NOTICE_VERSION } from "@/lib/dpdp";

/**
 * The notice DPDP s.5 requires, shown before an account exists.
 *
 * Poshan's sign-in was an email field and a button. That is a fine sign-in
 * and an unlawful sign-up: the same form creates the account
 * (shouldCreateUser: true), and by the time someone has a session Poshan
 * is already holding their email, about to hold their weight, their
 * conditions and their lab values, without ever having said so.
 *
 * s.5(1) wants the categories of data and the purpose of each, itemised —
 * not a paragraph saying "we collect information to improve your
 * experience". s.5(2) wants the way to withdraw and the way to complain to
 * the Board. s.5(3) wants it available in a Schedule language, which for
 * Poshan's users means Hindi.
 *
 * Two decisions worth naming:
 *
 * The detail is collapsed but the summary is not. Hiding the itemised list
 * behind a link would technically "make it available"; putting the
 * categories on screen and the detail one tap away is the difference
 * between available and read. Nothing that changes what someone is
 * agreeing to lives inside the collapse.
 *
 * The checkbox starts unticked and has no default. A pre-ticked consent
 * box is not a clear affirmative action under s.6(1), and it is the single
 * most common way a consent flow fails — usually because someone thought
 * the friction was hurting conversion, which is exactly the reasoning the
 * section exists to overrule.
 */
export function ConsentNotice({
  accepted,
  onChange,
  lang = "en",
}: {
  accepted: boolean;
  onChange: (v: boolean) => void;
  lang?: "en" | "hi";
}) {
  const [open, setOpen] = useState(false);
  const L = <T,>(pair: { en: T; hi: T }) => pair[lang];

  return (
    <div
      className="rounded-xl p-3.5 text-left"
      style={{ background: "var(--roti-2)", border: "1px solid var(--line)" }}
    >
      <p className="text-[0.82rem] leading-relaxed">
        {L({
          en: "Creating an account means we store your email, the body measurements you enter, any health conditions you select, and your lab values — to build and keep your plan, and nothing else.",
          hi: "खाता बनाने का अर्थ है कि हम आपका ईमेल, आपके दर्ज शारीरिक माप, चुनी गई स्वास्थ्य स्थितियाँ और जाँच मान रखते हैं — केवल आपकी योजना बनाने और बनाए रखने के लिए, और किसी काम के लिए नहीं।",
        })}
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-1.5 text-[0.8rem] underline"
        style={{ color: "var(--kesar)" }}
      >
        {open
          ? L({ en: "Hide the detail", hi: "विवरण छिपाएँ" })
          : L({ en: "What exactly, and why", hi: "वास्तव में क्या, और क्यों" })}
      </button>

      {open && (
        <div className="mt-3 grid gap-3 text-[0.79rem] leading-relaxed">
          <ul className="ml-4 list-disc grid gap-1.5">
            {NOTICE_ITEMS.map((item) => (
              <li key={item.what.en}>
                <strong>{L(item.what)}</strong> — {L(item.why)}
              </li>
            ))}
          </ul>

          <div>
            <p className="font-semibold">
              {L({ en: "Who else processes it", hi: "और कौन इसे संसाधित करता है" })}
            </p>
            <ul className="ml-4 mt-1 list-disc grid gap-1">
              {PROCESSORS.map((p) => (
                <li key={p.name}>
                  <strong>{p.name}</strong> — {L(p.does)} ({L(p.where)})
                </li>
              ))}
            </ul>
          </div>

          <p style={{ color: "var(--ink-soft)" }}>
            {L({
              en: "You can withdraw consent, download everything we hold, or delete your account at any time from the Privacy centre. Complaints go to our Grievance Officer, and after that to the Data Protection Board of India.",
              hi: "आप कभी भी गोपनीयता केंद्र से सहमति वापस ले सकते हैं, अपना सारा डेटा डाउनलोड कर सकते हैं, या खाता मिटा सकते हैं। शिकायतें हमारे शिकायत अधिकारी को, और उसके बाद भारतीय डेटा संरक्षण बोर्ड को जाती हैं।",
            })}
          </p>

          <p className="text-[0.72rem]" style={{ color: "var(--ink-soft)" }}>
            {L({ en: "Notice version", hi: "सूचना संस्करण" })}: {NOTICE_VERSION} ·{" "}
            <a href="/privacy" className="underline" style={{ color: "var(--kesar)" }}>
              {L({ en: "Full policy", hi: "पूरी नीति" })}
            </a>
          </p>
        </div>
      )}

      <label className="mt-3 flex items-start gap-2.5 text-[0.82rem] leading-snug">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4.5 w-4.5 shrink-0"
          style={{ width: "1.1rem", height: "1.1rem" }}
        />
        <span>
          {L({
            en: "I have read this and agree to Poshan storing my data for these purposes.",
            hi: "मैंने यह पढ़ लिया है और इन उद्देश्यों के लिए पोषण द्वारा मेरा डेटा रखने पर सहमत हूँ।",
          })}
        </span>
      </label>
    </div>
  );
}
