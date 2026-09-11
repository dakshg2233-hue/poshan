"use client";

import { useCallback, useEffect, useState } from "react";
import type { Bi } from "@/lib/poshan-data";
import type { ConsentScope } from "@/lib/consent";

export interface AccessEntry {
  id: string;
  who: string;
  specialty: string | null;
  clinic: string | null;
  action: string;
  label: Bi;
  at: string;
}

export interface Permission {
  id: string;
  who: string;
  specialty: string | null;
  status: "active" | "revoked" | "expired" | "pending";
  scopes: { key: ConsentScope; label: Bi }[];
  purpose: string | null;
  expiresAt: string | null;
  linkedAt: string | null;
  revokedAt: string | null;
}

/** See use-timeline.ts for why signed-out is a flag rather than an error
 *  string. This hook used to fold a 401 into "Could not load your privacy
 *  centre." — which told a signed-out visitor that something had broken,
 *  when nothing had. */
type FetchOutcome =
  | { kind: "ok"; access: AccessEntry[]; permissions: Permission[] }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

async function fetchPrivacy(): Promise<FetchOutcome> {
  try {
    const r = await fetch("/api/privacy");
    if (r.status === 401) return { kind: "signed-out" };
    if (!r.ok) return { kind: "error", message: "Could not load your privacy centre." };
    const d = await r.json();
    return { kind: "ok", access: d.access ?? [], permissions: d.permissions ?? [] };
  } catch {
    return { kind: "error", message: "Could not load your privacy centre." };
  }
}

export function usePrivacy() {
  const [access, setAccess] = useState<AccessEntry[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((outcome: FetchOutcome) => {
    if (outcome.kind === "ok") {
      setAccess(outcome.access);
      setPermissions(outcome.permissions);
      setSignedOut(false);
      setError(null);
    } else if (outcome.kind === "signed-out") {
      setAccess([]);
      setPermissions([]);
      setSignedOut(true);
      setError(null);
    } else {
      setSignedOut(false);
      setError(outcome.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const outcome = await fetchPrivacy();
      if (!cancelled) apply(outcome);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const reload = useCallback(async () => {
    apply(await fetchPrivacy());
  }, [apply]);

  /**
   * Revoking and narrowing both go through the same PATCH. Deliberately no
   * `grant` here: widening access is a new consent decision and belongs in
   * the consent dialog, not behind a toggle in a management screen.
   */
  const revoke = useCallback(
    async (id: string) => {
      const r = await fetch("/api/privacy/consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, revoke: true }),
      });
      if (!r.ok) throw new Error("Could not revoke that access.");
      await reload();
    },
    [reload]
  );

  const narrowScopes = useCallback(
    async (id: string, scopes: ConsentScope[]) => {
      const r = await fetch("/api/privacy/consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, scopes }),
      });
      if (!r.ok) throw new Error("Could not update that access.");
      await reload();
    },
    [reload]
  );

  return { access, permissions, loading, signedOut, error, reload, revoke, narrowScopes };
}
