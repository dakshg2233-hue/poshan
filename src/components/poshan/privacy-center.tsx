"use client";

import { useEffect, useState } from "react";
import { useLang } from "./lang-provider";
import { usePrivacy, type Permission } from "@/lib/hooks/use-privacy";
import { SCOPE_LABELS, type ConsentScope } from "@/lib/consent";
import { SignInPrompt } from "./sign-in-prompt";
import { track } from "@/lib/analytics";

/**
 * The Privacy Centre: who can see this person's health data, and who has
 * actually opened it.
 *
 * Built as a product surface rather than a paragraph in the terms page,
 * because in Indian healthtech this is genuinely unclaimed ground —
 * nobody markets privacy because almost nobody has it to market. Poshan
 * does: patient_links has enforced patient-grants-and-revokes at the
 * database level since the clinician platform shipped, and the audit log
 * records every clinician read. This screen is the first time any of that
 * is visible to the person it protects.
 *
 * The access list is the same audit_log the Hospital tier's compliance
 * export reads. One record, two audiences — a separate "friendly" history
 * for patients would be a second source of truth about the same events,
 * and the two would diverge exactly when someone needed them not to.
 */
export function PrivacyCenter() {
  const { T, lang } = useLang();
  const { access, permissions, loading, signedOut, error, revoke, narrowScopes } = usePrivacy();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /* Counts of grants and reads, never who or what. This screen exists to
     prove Poshan does not leak health behaviour to third parties; firing a
     clinician's name into one would be an unusually direct way to make it
     a lie. */
  useEffect(() => {
    if (!loading && !signedOut && !error) {
      track("privacy_centre_opened", {
        grants: permissions.filter((p) => p.status === "active").length,
        reads: access.length,
      });
    }
  }, [loading, signedOut, error, permissions, access.length]);

  if (loading) {
    return (
      <div className="py-10 text-center text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>
        {T({ en: "Loading…", hi: "लोड हो रहा है…" })}
      </div>
    );
  }
  if (signedOut) {
    return (
      <SignInPrompt
        next="/privacy-centre"
        title={{ en: "Sign in to see who has access", hi: "कौन देख सकता है, जानने के लिए साइन इन करें" }}
        detail={{
          en: "Your access record is part of your health data, so it needs the same sign-in. Nobody can see it but you.",
          hi: "आपका पहुँच रिकॉर्ड भी आपके स्वास्थ्य डेटा का हिस्सा है, इसलिए उसी साइन-इन की ज़रूरत है। आपके अलावा इसे कोई नहीं देख सकता।",
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

  const active = permissions.filter((p) => p.status === "active");
  const past = permissions.filter((p) => p.status !== "active");

  return (
    <section className="w-full grid gap-10">
      <header>
        <h2
          className="text-[clamp(1.5rem,3.5vw,2.1rem)] leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {T({ en: "Privacy centre", hi: "गोपनीयता केंद्र" })}
        </h2>
        <p className="mt-2 text-[0.92rem] max-w-[54ch]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "Your health data is yours. Nobody sees it unless you grant them access, and you can take that back at any moment — including right now, from this page.",
            hi: "आपका स्वास्थ्य डेटा आपका है। जब तक आप अनुमति न दें, कोई इसे नहीं देखता, और आप वह अनुमति कभी भी वापस ले सकते हैं — अभी, इसी पेज से।",
          })}
        </p>
      </header>

      {actionError && (
        <p className="text-[0.86rem]" style={{ color: "#C0392B" }} role="alert">
          {actionError}
        </p>
      )}

      {/* -------------------------------------------- active permissions */}
      <div>
        <h3 className="text-[1.12rem] mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {T({ en: "Who has access right now", hi: "अभी किसके पास पहुँच है" })}
        </h3>
        <p className="text-[0.85rem] mb-4" style={{ color: "var(--ink-soft)" }}>
          {active.length === 0
            ? T({
                en: "Nobody. No clinician can see any of your health data.",
                hi: "कोई नहीं। कोई चिकित्सक आपका कोई स्वास्थ्य डेटा नहीं देख सकता।",
              })
            : T({
                en: `${active.length} ${active.length === 1 ? "person has" : "people have"} access you granted.`,
                hi: `${active.length} व्यक्ति को आपने पहुँच दी है।`,
              })}
        </p>

        <div className="grid gap-3">
          {active.map((p) => (
            <PermissionCard
              key={p.id}
              permission={p}
              busy={busyId === p.id}
              onRevoke={async () => {
                setBusyId(p.id);
                setActionError(null);
                try {
                  await revoke(p.id);
                  track("consent_revoked", { scopes: p.scopes.length });
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : "Could not revoke.");
                } finally {
                  setBusyId(null);
                }
              }}
              onNarrow={async (scopes) => {
                setBusyId(p.id);
                setActionError(null);
                try {
                  await narrowScopes(p.id, scopes);
                  track("consent_narrowed", { from: p.scopes.length, to: scopes.length });
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : "Could not update.");
                } finally {
                  setBusyId(null);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------- access history */}
      <div>
        <h3 className="text-[1.12rem] mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {T({ en: "Who opened your data", hi: "किसने आपका डेटा खोला" })}
        </h3>
        <p className="text-[0.85rem] mb-4 max-w-[54ch]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "Every time a clinician opens anything of yours, it is recorded here. They cannot switch this off and neither can we.",
            hi: "जब भी कोई चिकित्सक आपकी कोई जानकारी खोलता है, वह यहाँ दर्ज होती है। न वे इसे बंद कर सकते हैं, न हम।",
          })}
        </p>

        {access.length === 0 ? (
          <p
            className="rounded-xl p-4 text-[0.88rem]"
            style={{ background: "var(--roti-2)", color: "var(--ink-soft)" }}
          >
            {T({
              en: "Nobody has opened your health data.",
              hi: "किसी ने आपका स्वास्थ्य डेटा नहीं खोला है।",
            })}
          </p>
        ) : (
          <ul className="list-none p-0 m-0 grid gap-2">
            {access.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl px-4 py-3"
                style={{ background: "var(--roti-2)" }}
              >
                <div className="min-w-0">
                  <span className="text-[0.92rem] font-medium">{a.who}</span>
                  {a.clinic && (
                    <span className="text-[0.82rem]" style={{ color: "var(--ink-soft)" }}>
                      {" · "}
                      {a.clinic}
                    </span>
                  )}
                  <div className="text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
                    {T(a.label)}
                  </div>
                </div>
                <time
                  dateTime={a.at}
                  className="text-[0.78rem] tabular-nums shrink-0"
                  style={{ color: "var(--ink-soft)", fontFamily: "var(--font-data)" }}
                >
                  {new Date(a.at).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --------------------------------------------------------- past */}
      {past.length > 0 && (
        <div>
          <h3 className="text-[1.12rem] mb-3" style={{ fontFamily: "var(--font-display)" }}>
            {T({ en: "Access you've ended", hi: "समाप्त की गई पहुँच" })}
          </h3>
          <ul className="list-none p-0 m-0 grid gap-2">
            {past.map((p) => (
              <li
                key={p.id}
                className="flex items-baseline justify-between gap-4 rounded-xl px-4 py-3 text-[0.88rem]"
                style={{ background: "var(--roti-2)", color: "var(--ink-soft)" }}
              >
                <span>{p.who}</span>
                <span className="text-[0.8rem]">
                  {p.status === "expired"
                    ? T({ en: "expired", hi: "समाप्त" })
                    : T({ en: "revoked", hi: "वापस ली गई" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PermissionCard({
  permission,
  busy,
  onRevoke,
  onNarrow,
}: {
  permission: Permission;
  busy: boolean;
  onRevoke: () => void;
  onNarrow: (scopes: ConsentScope[]) => void;
}) {
  const { T, lang } = useLang();
  const [confirming, setConfirming] = useState(false);

  const granted = permission.scopes.map((s) => s.key);

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--roti-2)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[1rem] font-medium">{permission.who}</p>
          {permission.specialty && (
            <p className="text-[0.84rem]" style={{ color: "var(--ink-soft)" }}>
              {permission.specialty}
            </p>
          )}
        </div>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="rounded-full px-3.5 py-1.5 text-[0.82rem] font-semibold shrink-0 disabled:opacity-50"
            style={{ border: "1px solid #C0392B", color: "#C0392B" }}
          >
            {T({ en: "Revoke", hi: "वापस लें" })}
          </button>
        ) : (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onRevoke}
              disabled={busy}
              className="rounded-full px-3.5 py-1.5 text-[0.82rem] font-semibold disabled:opacity-50"
              style={{ background: "#C0392B", color: "#fff" }}
            >
              {busy
                ? T({ en: "Revoking…", hi: "वापस ले रहे हैं…" })
                : T({ en: "Yes, revoke", hi: "हाँ, वापस लें" })}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full px-3 py-1.5 text-[0.82rem]"
              style={{ color: "var(--ink-soft)" }}
            >
              {T({ en: "Keep", hi: "रहने दें" })}
            </button>
          </div>
        )}
      </div>

      {permission.purpose && (
        <p className="mt-3 text-[0.86rem]" style={{ color: "var(--ink-soft)" }}>
          {T({ en: "Purpose: ", hi: "उद्देश्य: " })}
          {permission.purpose}
        </p>
      )}

      <div className="mt-3">
        <p className="text-[0.78rem] uppercase tracking-wide mb-2" style={{ color: "var(--ink-soft)" }}>
          {T({ en: "They can see", hi: "वे देख सकते हैं" })}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {permission.scopes.map((s) => (
            <span
              key={s.key}
              className="rounded-full px-2.5 py-1 text-[0.78rem] inline-flex items-center gap-1.5"
              style={{ background: "var(--roti)", border: "1px solid var(--line, rgba(0,0,0,0.12))" }}
            >
              {T(s.label)}
              {/* Removing one scope is narrowing, which is always allowed.
                  Adding one is a new consent decision and deliberately has
                  no control here — see the note in use-privacy.ts. */}
              {granted.length > 1 && (
                <button
                  type="button"
                  aria-label={`Stop sharing ${SCOPE_LABELS[s.key][lang]}`}
                  disabled={busy}
                  onClick={() => onNarrow(granted.filter((g) => g !== s.key))}
                  className="opacity-50 hover:opacity-100 disabled:opacity-25"
                  style={{ lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[0.8rem]" style={{ color: "var(--ink-soft)" }}>
        {permission.expiresAt
          ? T({
              en: `Ends automatically on ${new Date(permission.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
              hi: `${new Date(permission.expiresAt).toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" })} को अपने आप समाप्त`,
            })
          : T({
              en: "No end date — this stays until you revoke it.",
              hi: "कोई अंतिम तिथि नहीं — जब तक आप वापस न लें, यह चलती रहेगी।",
            })}
      </p>
    </div>
  );
}
