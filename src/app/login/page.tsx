"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthSection, Field } from "@/components/ui/auth-section-1";
import { MagneticCursor } from "@/components/ui/magnetic-cursor";
import { browserClient, supabaseReady } from "@/lib/supabase-browser";

type Step = "email" | "otp" | "done";

const OTP_LENGTH = 6;
/**
 * Resend cooldown. Short in development so testing sign-in is not painful;
 * 45s in production, where this is the only thing stopping the endpoint being
 * used as a free email cannon pointed at arbitrary addresses.
 *
 * Note this is client-side friction only. The real ceiling is Supabase's own
 * auth email rate limit, which lives in the dashboard, not in this repo.
 */
const RESEND_SECONDS = process.env.NODE_ENV === "development" ? 5 : 45;

/**
 * useSearchParams() opts the tree into dynamic rendering, so Next requires a
 * Suspense boundary around it or the /login prerender fails outright. The
 * fallback mirrors the real layout so there is no flash of a different shape.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section
          className="min-h-screen p-3"
          style={{ background: "var(--roti)" }}
          aria-busy="true"
        />
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /* Middleware puts the page they were heading for in ?next. Only same-site
     paths are honoured: an absolute URL here would be an open redirect. */
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/";
  const [step, setStep] = useState<Step>("email");
  /* The hero's email field hands the address over in ?email so it does not
     have to be typed twice. Seeded once at init, never synced afterwards:
     the field is the user's to edit from that point on. */
  const [email, setEmail] = useState(() => searchParams.get("email")?.slice(0, 254) ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  const configured = supabaseReady();

  /* Resend cooldown. Rate limiting one-time codes matters, without it the
     endpoint is a free SMS/email cannon pointed at arbitrary addresses. */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    /* Validate the input first. Telling someone their address is malformed is
       useful whether or not the backend is reachable: the config check below
       would otherwise mask it. */
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("That email address does not look right.");
      return;
    }
    if (!configured) {
      setError(
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
      );
      return;
    }

    setBusy(true);
    const supabase = browserClient()!;
    /* Supabase generates, stores and later checks this code itself — it is
       also the one that emails it. A second, independently-generated code
       used to be sent here through a custom Resend email as a "nicer"
       notification: that code was never registered with Supabase, so it
       could never pass verifyOtp below. Anyone who used the nicer-looking
       email instead of Supabase's own got a permanently wrong code and a
       login that looked broken. Only Supabase's own email carries a code
       that actually works. */
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);

    if (err) {
      setError(err.message);
      return;
    }

    setCooldown(RESEND_SECONDS);
    setSuccess("Code sent! Check your email.");
    setStep("otp");
  }

  async function verifyCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (code.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }

    setBusy(true);
    const supabase = browserClient()!;
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setBusy(false);

    if (err) {
      /* Deliberately not "wrong code" vs "expired code": do not help someone
         probe which addresses have pending codes. */
      setError("That code did not work. Check it, or send a new one.");
      setCode("");
      return;
    }

    setStep("done");

    // Check if user is new (just signed up) and needs onboarding
    const sb = browserClient();
    if (sb) {
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: profile } = await sb
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .single();

        // If onboarding not completed, send to onboarding page
        if (!profile?.onboarding_completed) {
          router.push("/onboarding");
        } else {
          router.push(next);
        }
      } else {
        router.push(next);
      }
    } else {
      router.push(next);
    }
    router.refresh();
  }

  return (
    <MagneticCursor magneticFactor={0.35} cursorSize={28} blendMode="exclusion">
      <AuthSection
        title={step === "otp" ? "Check your email" : "Sign in to Poshan"}
        subtitle={
          step === "otp"
            ? `We sent a ${OTP_LENGTH}-digit code to ${email}. It expires in an hour.`
            : "One code by email. No password to forget, and nothing to remember."
        }
        panelHeading={
          <>
            Know your body.
            <br />
            <span style={{ color: "#f0b055" }}>Eat like home.</span>
          </>
        }
        panelFoot={
          <p
            className="text-[0.95rem] max-w-[46ch]"
            style={{ color: "color-mix(in srgb, var(--panel-ink) 78%, transparent)" }}
          >
            Your measurements and conditions stay on your account, readable only
            by you. Signing in is free: Poshan Home is the paid tier, and it is
            separate.
          </p>
        }
      >
        {step === "email" && (
          <form onSubmit={sendCode} className="grid gap-5" noValidate>
            <Field
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hint="We'll send a one-time code. No password is stored."
            />

            {error && <ErrorNote>{error}</ErrorNote>}

            <button
              type="submit"
              disabled={busy}
              data-magnetic
              className="min-h-12 rounded-full font-extrabold text-[0.95rem] cursor-pointer disabled:opacity-60"
              style={{ background: "var(--kesar-fill)", color: "#fff" }}
            >
              {busy ? "Sending…" : "Send me a code"}
            </button>

            <p className="text-[0.8rem]" style={{ color: "var(--ink-soft)" }}>
              New here? The same code signs you up: there is no separate
              registration step.
            </p>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyCode} className="grid gap-5" noValidate>
            {success && <SuccessNote>{success}</SuccessNote>}

            <div>
              <label
                htmlFor="otp"
                className="block text-[0.72rem] font-extrabold uppercase mb-1.5"
                style={{ letterSpacing: "0.12em", color: "var(--ink-soft)" }}
              >
                6-digit code
              </label>
              <input
                id="otp"
                ref={otpRef}
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full min-h-14 px-4 rounded-xl outline-none text-center"
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--roti-2)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-data)",
                  fontSize: "1.6rem",
                  letterSpacing: "0.5em",
                  textIndent: "0.5em",
                }}
              />
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            <button
              type="submit"
              disabled={busy || code.length !== OTP_LENGTH}
              data-magnetic
              className="min-h-12 rounded-full font-extrabold text-[0.95rem] cursor-pointer disabled:opacity-60"
              style={{ background: "var(--kesar-fill)", color: "#fff" }}
            >
              {busy ? "Checking…" : "Verify and sign in"}
            </button>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[0.85rem]">
              <button
                type="button"
                onClick={() => cooldown === 0 && sendCode()}
                disabled={cooldown > 0}
                className="underline cursor-pointer disabled:no-underline disabled:cursor-default"
                style={{ color: cooldown > 0 ? "var(--ink-soft)" : "var(--kesar)" }}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                className="underline cursor-pointer"
                style={{ color: "var(--ink-soft)" }}
              >
                Use a different email
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <p style={{ color: "var(--ink-soft)" }}>Signed in. Taking you back…</p>
        )}

        {!configured && step === "email" && (
          <p
            className="mt-6 text-[0.8rem] rounded-xl p-3"
            style={{ background: "var(--roti-2)", color: "var(--ink-soft)" }}
          >
            Supabase keys are not set, so sign-in is inactive. Everything else on
            the site works without an account: you just cannot save yet.
          </p>
        )}
      </AuthSection>
    </MagneticCursor>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      /* form-shake: a wrong code or a rejected email is exactly what the
         brief calls an instant-validation moment — three quick pixels of
         lateral motion say "no" faster than reading the sentence does. */
      className="form-shake text-[0.85rem] rounded-xl p-3"
      style={{
        background: "color-mix(in srgb, var(--mirch) 10%, var(--surface))",
        border: "1px solid var(--mirch)",
        color: "var(--ink)",
      }}
    >
      {children}
    </p>
  );
}

function SuccessNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="card-in text-[0.85rem] rounded-xl p-3 flex items-center gap-2"
      style={{
        background: "color-mix(in srgb, #22c55e 10%, var(--surface))",
        border: "1px solid #22c55e",
        color: "var(--ink)",
      }}
    >
      {/* A drawn checkmark, not a static glyph: the stroke animates in via
          stroke-dashoffset, which — like transform and opacity — is a
          paint-only property change, not a layout one. */}
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden className="shrink-0">
        <path
          className="checkmark-draw"
          d="M4 12.5 9.5 18 20 6"
          fill="none"
          stroke="#22c55e"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </p>
  );
}
