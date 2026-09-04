"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useLang } from "./lang-provider";

/**
 * "Talk to us" for Hospital and Enterprise — the tiers CLINIC_TIERS marks
 * `selfServe: false` on purpose: these buy on a purchase order, not a card.
 * Replaces what used to be a dead link to /login with an actual contact
 * point, backed by /api/clinic-leads.
 */
export function ClinicLeadForm({
  tier,
  ctaClassName,
  ctaStyle,
}: {
  tier: "hospital" | "enterprise";
  ctaClassName: string;
  ctaStyle: React.CSSProperties;
}) {
  const { T } = useLang();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      const form = new FormData(e.currentTarget);
      try {
        const res = await fetch("/api/clinic-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier,
            name: form.get("name"),
            org: form.get("org"),
            email: form.get("email"),
            phone: form.get("phone"),
            message: form.get("message"),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(
            data.error ||
              T({ en: "Could not send that. Try again.", hi: "भेजा नहीं जा सका। दोबारा कोशिश करें।" })
          );
          return;
        }
        setDone(true);
      } catch {
        setError(T({ en: "Could not reach the server.", hi: "सर्वर तक नहीं पहुँच सके।" }));
      } finally {
        setBusy(false);
      }
    },
    [tier, T]
  );

  return (
    <>
      <button type="button" data-magnetic onClick={() => setOpen(true)} className={ctaClassName} style={ctaStyle}>
        {T({ en: "Talk to us", hi: "हमसे बात करें" })}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={T({ en: "Talk to us", hi: "हमसे बात करें" })}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgb(0 0 0 / 0.5)" }}
            onClick={() => !busy && setOpen(false)}
          />
          <div
            className="card-in relative w-[min(30rem,100%)] max-h-[85vh] overflow-y-auto rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--panel-ink)" }}
          >
            {done ? (
              <div className="py-6 text-center">
                <p className="text-[1.15rem] font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  {T({ en: "Got it.", hi: "मिल गया।" })}
                </p>
                <p className="mt-2 text-[0.9rem]" style={{ color: "color-mix(in srgb, var(--panel-ink) 70%, var(--panel))" }}>
                  {T({
                    en: "We'll write back to plan your onboarding.",
                    hi: "हम आपके ऑनबोर्डिंग की योजना बनाने के लिए जवाब देंगे।",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-5 min-h-11 rounded-full px-5 text-[0.86rem] font-semibold"
                  style={{ border: "1.5px solid var(--line)", color: "var(--panel-ink)" }}
                >
                  {T({ en: "Close", hi: "बंद करें" })}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-3">
                <h3 className="text-[1.2rem]" style={{ fontFamily: "var(--font-display)" }}>
                  {T({ en: "Talk to us", hi: "हमसे बात करें" })}
                </h3>
                <p className="text-[0.85rem] -mt-1" style={{ color: "color-mix(in srgb, var(--panel-ink) 70%, var(--panel))" }}>
                  {T({
                    en: "Purchase orders and annual contracts, not a card. We'll reply from a real inbox.",
                    hi: "परचेज़ ऑर्डर और वार्षिक अनुबंध, कार्ड से नहीं। हम असल ईमेल से जवाब देंगे।",
                  })}
                </p>

                <Field name="name" label={T({ en: "Your name", hi: "आपका नाम" })} required />
                <Field
                  name="org"
                  label={T({ en: tier === "hospital" ? "Hospital name" : "Organisation name", hi: tier === "hospital" ? "अस्पताल का नाम" : "संस्था का नाम" })}
                  required
                />
                <Field name="email" type="email" label={T({ en: "Work email", hi: "कार्य ईमेल" })} required />
                <Field name="phone" type="tel" label={T({ en: "Phone (optional)", hi: "फ़ोन (वैकल्पिक)" })} />
                <div className="grid gap-1">
                  <label htmlFor="message" className="text-[0.78rem] font-semibold" style={{ color: "color-mix(in srgb, var(--panel-ink) 70%, var(--panel))" }}>
                    {T({ en: "Anything we should know? (optional)", hi: "कुछ बताना चाहेंगे? (वैकल्पिक)" })}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    className="rounded-lg px-3 py-2 text-[0.9rem]"
                    style={{ background: "var(--roti-2)", border: "1px solid var(--line)", color: "var(--panel-ink)" }}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-[0.82rem]" style={{ color: "var(--mirch)" }}>
                    {error}
                  </p>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-11 flex-1 rounded-full px-5 text-[0.86rem] font-extrabold disabled:opacity-60"
                    style={{ background: "var(--kesar-fill)", color: "#fff" }}
                  >
                    {busy ? T({ en: "Sending…", hi: "भेज रहे हैं…" }) : T({ en: "Send", hi: "भेजें" })}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                    className="min-h-11 rounded-full px-5 text-[0.86rem] font-semibold"
                    style={{ border: "1.5px solid var(--line)", color: "var(--panel-ink)" }}
                  >
                    {T({ en: "Cancel", hi: "रद्द करें" })}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <label
        htmlFor={name}
        className="text-[0.78rem] font-semibold"
        style={{ color: "color-mix(in srgb, var(--panel-ink) 70%, var(--panel))" }}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="min-h-11 rounded-lg px-3 text-[0.9rem]"
        style={{ background: "var(--roti-2)", border: "1px solid var(--line)", color: "var(--panel-ink)" }}
      />
    </div>
  );
}
