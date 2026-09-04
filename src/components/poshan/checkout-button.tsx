"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useLang } from "./lang-provider";
import { PREMIUM } from "@/lib/poshan-data";

/* Razorpay's checkout script is loaded from their domain only when the
   visitor actually starts a payment: the page itself still makes zero
   external requests on load. */
const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayResponse = {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutButton({ yearly, signedIn }: { yearly: boolean; signedIn: boolean }) {
  const { T } = useLang();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const pay = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/razorpay/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: yearly ? "yearly" : "monthly" }),
      });
      const data = await res.json();

      if (res.status === 503) {
        setStatus(
          T({
            en: "Checkout isn't connected yet: add your Razorpay keys on the server and this button goes live.",
            hi: "चेकआउट अभी जुड़ा नहीं है: सर्वर पर अपनी रेज़रपे कुंजियाँ जोड़ें और यह बटन चालू हो जाएगा।",
          })
        );
        return;
      }
      if (res.status === 401) {
        setStatus(
          T({
            en: "Sign in first, then subscribing links Poshan Home to your account.",
            hi: "पहले साइन इन करें, फिर सदस्यता आपके खाते से जुड़ेगी।",
          })
        );
        return;
      }
      if (!res.ok) {
        setStatus(T({ en: "Could not start the payment. Try again.", hi: "भुगतान शुरू नहीं हो सका। दोबारा कोशिश करें।" }));
        return;
      }

      const ok = await loadCheckout();
      if (!ok || !window.Razorpay) {
        setStatus(T({ en: "Could not load the payment window.", hi: "भुगतान विंडो लोड नहीं हो सकी।" }));
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Poshan",
        description: T({
          en: `Poshan Home, ${yearly ? "yearly" : "monthly"} — ${PREMIUM.trialDays} days free, then billed automatically`,
          hi: `पोषण घर, ${yearly ? "वार्षिक" : "मासिक"} — ${PREMIUM.trialDays} दिन मुफ़्त, फिर अपने-आप बिल`,
        }),
        theme: { color: "#A8500A" },
        /* Razorpay collects card, UPI and netbanking details inside their own
           window. Nothing sensitive passes through this app. */
        handler: async (r: RazorpayResponse) => {
          const v = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(r),
          });
          const vd = await v.json();
          setStatus(
            vd.verified
              ? T({
                  en: `Poshan Home is active. Nothing charged today — day ${PREMIUM.trialDays} you'll be billed automatically, unless you cancel first.`,
                  hi: `पोषण घर सक्रिय है। आज कुछ शुल्क नहीं लिया गया — दिन ${PREMIUM.trialDays} पर अपने-आप बिल लिया जाएगा, जब तक आप पहले रद्द न करें।`,
                })
              : T({ en: "We could not verify that. Nothing has been charged, contact support.", hi: "हम उसकी पुष्टि नहीं कर सके। कोई शुल्क नहीं लिया गया: सहायता से संपर्क करें।" })
          );
        },
        modal: {
          ondismiss: () =>
            setStatus(T({ en: "Payment cancelled. Nothing was charged.", hi: "भुगतान रद्द। कोई शुल्क नहीं लिया गया।" })),
        },
      });
      rzp.open();
    } catch {
      setStatus(T({ en: "Something went wrong starting checkout.", hi: "चेकआउट शुरू करने में कुछ ग़लत हुआ।" }));
    } finally {
      setBusy(false);
    }
  }, [yearly, T]);

  if (!signedIn) {
    return (
      <div>
        <Link
          href="/login"
          data-magnetic
          className="inline-flex flex-col items-center justify-center w-full min-h-14 px-6 py-2 rounded-full font-extrabold text-[0.94rem] no-underline transition-transform hover:-translate-y-0.5"
          style={{ background: "var(--kesar-fill)", color: "#fff" }}
        >
          <span>{T({ en: "Sign in to subscribe", hi: "सदस्यता के लिए साइन इन करें" })}</span>
          <span className="text-[0.72rem] font-semibold opacity-90">
            {T({
              en: "Poshan Home needs an account to attach to",
              hi: "पोषण घर के लिए एक खाता ज़रूरी है",
            })}
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="sweep inline-flex flex-col items-center justify-center w-full min-h-14 px-6 py-2 rounded-full font-extrabold text-[0.94rem] cursor-pointer transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: "var(--kesar-fill)", color: "#fff" }}
      >
        <span>
          {busy
            ? T({ en: "Opening…", hi: "खोल रहे हैं…" })
            : T({
                en: `Start ${PREMIUM.trialDays} days free`,
                hi: `${PREMIUM.trialDays} दिन मुफ़्त शुरू करें`,
              })}
        </span>
        <span className="text-[0.72rem] font-semibold opacity-90">
          {T({ en: "UPI, card or netbanking · via Razorpay", hi: "यूपीआई, कार्ड या नेटबैंकिंग · रेज़रपे से" })}
        </span>
      </button>
      {status && (
        <p
          role="status"
          className="card-in text-[0.8rem] mt-2.5 text-center"
          style={{ color: "color-mix(in srgb, var(--roti) 78%, transparent)" }}
        >
          {status}
        </p>
      )}
    </div>
  );
}
