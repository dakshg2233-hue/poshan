"use client";

import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/lib/hooks/use-push-notifications";

/**
 * "Log breakfast" reminders — browser push, not WhatsApp/SMS (see
 * .env.example for why). Hides itself entirely when VAPID keys aren't
 * configured or the browser doesn't support Push, rather than showing a
 * button that would just fail.
 */
export function ReminderOptIn() {
  const { supported, subscribed, busy, error, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ background: "var(--roti-2, var(--roti))" }}>
      <div className="flex items-center gap-2">
        {subscribed ? (
          <Bell className="h-4 w-4" style={{ color: "var(--kesar)" }} />
        ) : (
          <BellOff className="h-4 w-4" style={{ color: "var(--ink-soft)" }} />
        )}
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Daily reminders</p>
          <p className="text-xs text-[var(--ink-soft)]">
            {subscribed ? "On for this device." : "Get a nudge to log your meals."}
          </p>
        </div>
      </div>
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={busy}
        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
        style={
          subscribed
            ? { color: "var(--ink-soft)", border: "1px solid var(--line)" }
            : { background: "var(--kesar-fill)", color: "#fff" }
        }
      >
        {busy ? "…" : subscribed ? "Turn off" : "Turn on"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
