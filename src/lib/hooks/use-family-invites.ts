"use client";

import { useEffect, useState, useCallback } from "react";

export interface FamilyInvite {
  id: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  expires_at: string;
}

export function useFamilyInvites() {
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/family/invite");
      if (response.status === 403 || response.status === 401) {
        setInvites([]);
        return;
      }
      if (!response.ok) throw new Error("Failed to load invites");
      setInvites(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* Doesn't call `load` directly: the linter (rightly) treats a bare
       call to a function that sets state as a synchronous effect body.
       Same inline-IIFE shape as useFamilyMembers/usePantry/useDaily. */
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/family/invite");
        if (response.status === 403 || response.status === 401) {
          if (!cancelled) setInvites([]);
          return;
        }
        if (!response.ok) throw new Error("Failed to load invites");
        const data = await response.json();
        if (!cancelled) setInvites(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createInvite = async () => {
    const response = await fetch("/api/family/invite", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to create invite");
    await load();
    return data as FamilyInvite & { url: string };
  };

  const revokeInvite = async (id: string) => {
    const response = await fetch(`/api/family/invite?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to revoke invite");
    }
    await load();
  };

  return { invites, loading, error, createInvite, revokeInvite };
}
