"use client";

import { useLang, useReveal } from "./lang-provider";
import { CLINIC_TIERS, CLINIC_ROADMAP, type ClinicTier } from "@/lib/poshan-data";

/**
 * Poshan for Clinics — the B2B tier.
 *
 * Two deliberate choices, both commercial rather than technical:
 *
 *  - Only Practitioner and Clinic get a checkout button. Hospitals buy on a
 *    purchase order through procurement; a card form for a ₹1,49,999 annual
 *    contract would simply go unused.
 *  - The roadmap strip at the bottom states plainly what is NOT built yet.
 *    Selling ABDM integration before certification completes would be the
 *    fastest way to lose a hospital's trust permanently.
 */
export function Clinics() {
  const { T } = useLang();
  const reveal = useReveal<HTMLDivElement>();
  const revealCards = useReveal<HTMLDivElement>();

  return (
    <section id="clinics" className="py-14 md:py-24" style={{ background: "var(--roti-2)" }}>
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div ref={reveal} className="rise max-w-[60ch] mb-11">
          <div className="shiro w-[72px] mb-5" />
          <p
            className="text-[0.72rem] font-extrabold uppercase mb-3"
            style={{ letterSpacing: "0.16em", color: "var(--kesar)" }}
          >
            {T({ en: "For hospitals and clinics", hi: "अस्पतालों और क्लिनिकों के लिए" })}
          </p>
          <h2
            className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {T({
              en: "Your patients already eat at home.",
              hi: "आपके मरीज़ घर पर ही खाते हैं।",
            })}{" "}
            <em style={{ color: "var(--kesar)", fontStyle: "italic" }}>
              {T({ en: "Send them a plan that fits it.", hi: "उन्हें उसी के अनुसार प्लान भेजें।" })}
            </em>
          </h2>
          <p className="mt-4 text-[1.02rem]" style={{ color: "var(--ink-soft)" }}>
            {T({
              en: "Enter a patient's lab values, and Poshan drafts a plan from the food their region actually cooks. You review it, sign it off, and only then does the patient see it — every approval logged against your registration number.",
              hi: "मरीज़ के जाँच मान भरें, और पोषण उनके क्षेत्र में सचमुच बनने वाले खाने से प्लान तैयार करता है। आप जाँचें, मंज़ूरी दें, तभी मरीज़ उसे देखता है — हर मंज़ूरी आपके पंजीकरण नंबर के साथ दर्ज।",
            })}
          </p>
        </div>

        <div ref={revealCards} className="rise grid gap-5 md:grid-cols-2 xl:grid-cols-4 items-start">
          {CLINIC_TIERS.map((t) => (
            <TierCard key={t.key} tier={t} />
          ))}
        </div>

        {/* What is not built yet. Stated up front, not buried. */}
        <ul
          className="mt-9 grid gap-2 list-none p-0 rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          {CLINIC_ROADMAP.map((r, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[0.86rem]"
              style={{ color: "var(--ink-soft)" }}
            >
              <span aria-hidden style={{ color: "var(--haldi-ink)" }}>
                ⏳
              </span>
              <span>{T(r)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TierCard({ tier }: { tier: ClinicTier }) {
  const { T } = useLang();
  const quoted = tier.monthly === null;

  return (
    <div
      className="lift rounded-2xl p-6 h-full flex flex-col"
      style={
        tier.best
          ? { background: "var(--surface)", border: "2px solid var(--kesar)" }
          : { background: "var(--surface)", border: "1px solid var(--line)" }
      }
    >
      {tier.best && (
        <span
          className="self-start text-[0.62rem] font-extrabold uppercase px-2.5 py-1 rounded-full mb-3"
          style={{ letterSpacing: "0.12em", background: "var(--kesar-fill)", color: "#fff" }}
        >
          {T({ en: "Most chosen", hi: "सबसे चुना गया" })}
        </span>
      )}

      <h3 className="text-[1.35rem]" style={{ fontFamily: "var(--font-display)" }}>
        {T(tier.name)}
      </h3>

      <div className="mt-3 mb-1">
        {quoted ? (
          <span className="text-[1.6rem] leading-none" style={{ fontFamily: "var(--font-display)" }}>
            {T({ en: "On request", hi: "अनुरोध पर" })}
          </span>
        ) : (
          <>
            <span
              className="text-[2.1rem] leading-none tabular-nums"
              style={{ fontFamily: "var(--font-data)", fontWeight: 500 }}
            >
              ₹{tier.monthly!.toLocaleString("en-IN")}
            </span>
            <span className="text-[0.85rem] ml-1.5" style={{ color: "var(--ink-soft)" }}>
              {T({ en: "/month", hi: "/माह" })}
            </span>
          </>
        )}
      </div>
      {!quoted && (
        <p className="text-[0.78rem] mb-4" style={{ color: "var(--ink-soft)" }}>
          {T({ en: "or ₹", hi: "या ₹" })}
          {tier.yearly!.toLocaleString("en-IN")}
          {T({ en: " a year — two months free", hi: " सालाना — दो माह मुफ़्त" })}
        </p>
      )}

      <dl className="grid gap-1 mb-5 text-[0.84rem]" style={{ color: "var(--ink-soft)" }}>
        <dt className="sr-only">{T({ en: "Seats", hi: "सीटें" })}</dt>
        <dd className="m-0">{T(tier.seats)}</dd>
        <dt className="sr-only">{T({ en: "Patients", hi: "मरीज़" })}</dt>
        <dd className="m-0">{T(tier.patients)}</dd>
      </dl>

      <ul className="grid gap-2 list-none p-0 m-0 mb-6 flex-1">
        {tier.features.map((f, i) => (
          <li key={i} className="flex gap-2 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
            <svg viewBox="0 0 16 16" aria-hidden className="w-3.5 h-3.5 shrink-0 mt-1">
              <path
                d="M3 8.5l3.2 3.2L13 5"
                fill="none"
                stroke="var(--elaichi)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{T(f)}</span>
          </li>
        ))}
      </ul>

      <a
        href={tier.selfServe ? "#clinic-signup" : "#clinic-contact"}
        data-magnetic
        className="inline-flex items-center justify-center min-h-11 px-5 rounded-full font-extrabold text-[0.86rem] no-underline"
        style={
          tier.selfServe
            ? { background: "var(--kesar-fill)", color: "#fff" }
            : { border: "1.5px solid var(--ink)", color: "var(--ink)" }
        }
      >
        {tier.selfServe
          ? T({ en: "Start 14-day trial", hi: "14-दिन का ट्रायल शुरू करें" })
          : T({ en: "Talk to us", hi: "हमसे बात करें" })}
      </a>
    </div>
  );
}
