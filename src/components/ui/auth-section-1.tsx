"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Split auth layout: form on the left, animated grain-gradient panel on the right.
 *
 * Adapted from the supplied auth-section-1. Four things changed, deliberately:
 *  - The original shipped SolaceUI's copy ("Brainstrom in chat, build in cowork",
 *    "solaceui feature updates", "Download the windows app") and hardcoded demo
 *    values as input `value` props. All replaced with real content via props.
 *  - Its `FieldBox` cleared the field on focus and hid the label while typing.
 *    That reads well in a screenshot and fails as a login — labels are now
 *    persistent and inputs are properly controlled by the caller.
 *  - Palette moved from #FC7819 to the masala tokens so it belongs to Poshan.
 *  - Content is passed in, so the same shell serves sign-in, sign-up and the
 *    OTP step without duplicating the layout.
 */
export function AuthSection({
  title,
  subtitle,
  children,
  panelHeading,
  panelFoot,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  panelHeading: ReactNode;
  panelFoot?: ReactNode;
}) {
  return (
    <section
      className="min-h-screen p-3 antialiased [font-synthesis:none]"
      style={{ background: "var(--roti)", color: "var(--ink)" }}
    >
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        {/* ---------------------------------------------------- the form */}
        <div
          className="flex items-start rounded-2xl px-6 py-12 sm:px-10 lg:px-14 lg:py-24 xl:px-20"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <div className="mx-auto w-full max-w-[520px]">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 no-underline mb-10"
              aria-label="Poshan home"
            >
              <svg viewBox="0 0 40 40" aria-hidden className="w-8 h-8">
                <circle cx={20} cy={20} r={18} fill="none" stroke="var(--steel)" strokeWidth={2.5} />
                <circle cx={14} cy={15} r={4.6} fill="var(--haldi)" />
                <circle cx={26} cy={15} r={4.6} fill="var(--elaichi)" />
                <ellipse cx={20} cy={27} rx={7.5} ry={4.4} fill="var(--kesar)" />
              </svg>
              <span className="text-[1.3rem] leading-none" style={{ fontFamily: "var(--font-display)" }}>
                पोषण <span style={{ color: "var(--kesar)" }}>Poshan</span>
              </span>
            </Link>

            <h1
              className="text-[clamp(1.9rem,4vw,2.6rem)] leading-[1.08]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
            <p className="mt-3 text-[1.05rem]" style={{ color: "var(--ink-soft)" }}>
              {subtitle}
            </p>

            <div className="mt-9">{children}</div>
          </div>
        </div>

        {/* --------------------------------------------------- the panel */}
        <div
          className="on-panel relative hidden lg:flex overflow-hidden rounded-2xl p-8 sm:p-12"
          style={{ background: "var(--panel)" }}
        >
          <GrainGradient
            speed={0.6}
            scale={1}
            rotation={0}
            offsetX={0}
            offsetY={0}
            softness={0.6}
            intensity={0.45}
            noise={0.25}
            shape="corners"
            frame={2854.5}
            /* Sindoor: haldi, vermilion and elaichi. Hardcoded because the
               shader takes literals, not CSS vars — keep in step with :root. */
            colors={["#E8A33D", "#B03A16", "#4A7C4E", "#E8A33D"]}
            colorBack="#00000000"
            className="absolute inset-0"
            style={{ background: "var(--panel)" }}
          />

          <div className="relative z-10 flex h-full w-full flex-col justify-between">
            <h2
              className="max-w-[620px] text-[clamp(2.4rem,4.5vw,4rem)] leading-[1.02]"
              style={{ fontFamily: "var(--font-display)", color: "var(--panel-ink)" }}
            >
              {panelHeading}
            </h2>
            {panelFoot && <div className="relative">{panelFoot}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

/** A real form field: persistent label, controlled value, no focus-clearing. */
export function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = `field-${props.name ?? label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[0.72rem] font-extrabold uppercase mb-1.5"
        style={{ letterSpacing: "0.12em", color: "var(--ink-soft)" }}
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="w-full min-h-12 px-4 rounded-xl text-[1rem] outline-none"
        style={{
          border: "1px solid var(--line)",
          background: "var(--roti-2)",
          color: "var(--ink)",
        }}
      />
      {hint && (
        <p className="mt-1.5 text-[0.78rem]" style={{ color: "var(--ink-soft)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
