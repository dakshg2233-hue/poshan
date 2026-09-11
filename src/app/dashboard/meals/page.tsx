"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { DashboardNavbar } from "@/components/poshan/dashboard-navbar";
import { MealsShowcase } from "@/components/poshan/meals-showcase";
import type { User } from "@supabase/supabase-js";
import { FORCE_PREMIUM } from "@/lib/dev-flags";
import type { GoalKey } from "@/lib/poshan-data";

export default function MealsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [goal, setGoal] = useState<GoalKey | undefined>();

  /* Everything the page needs, in one effect.
     `loadUserData` used to be a function declaration below this, called
     from inside the .then(). Hoisting made that run, but the effect was
     capturing a binding declared after it — so the version it called was
     not guaranteed to be the current one, which is what
     react-hooks/immutability objects to. Inlining removes the question. */
  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) {
      router.push("/login");
      return;
    }

    let cancelled = false;

    const run = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!data.user) {
        router.push("/login");
        setLoading(false);
        return;
      }
      setUser(data.user);

      try {
        /* profiles is keyed on `id`, not `user_id` — it references
           auth.users(id) directly (schema.sql:13), and every other query
           in the codebase uses `id`. With `user_id` this select failed on
           an unknown column, the catch below swallowed it, and `goal`
           was never set: the meals list silently stopped personalising to
           the user's goal and nobody saw an error. */
        const { data: profile } = await supabase
          .from("profiles")
          .select("goal")
          .eq("id", data.user.id)
          .single();

        if (!cancelled && profile?.goal) setGoal(profile.goal as GoalKey);

        // subscriptions IS keyed on user_id — different table, different shape.
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", data.user.id)
          .in("product", ["home", "college"])
          .in("status", ["trialing", "active"])
          .maybeSingle();

        if (!cancelled) setIsPremium(FORCE_PREMIUM || !!subscription);
      } catch (error) {
        console.error("Failed to load user data:", error);
        if (!cancelled) setIsPremium(FORCE_PREMIUM);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meals...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <DashboardNavbar />
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <MealsShowcase isPremium={isPremium} goal={goal} />
      </div>
    </>
  );
}
