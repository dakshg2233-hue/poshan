"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { OnboardingFlow } from "@/components/poshan/onboarding-flow";
import type { User } from "@supabase/supabase-js";
import { FORCE_PREMIUM } from "@/lib/dev-flags";

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  /* Inlined for the same reason as /dashboard/meals: `checkSubscription`
     was a hoisted declaration below this effect, so the effect referenced
     a binding that did not exist yet at the point it was written. */
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
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", data.user.id)
          .in("product", ["home", "college"])
          .in("status", ["trialing", "active"])
          /* maybeSingle, not single: `single()` treats "no subscription"
             as an error, so the free-tier case — the common one — went
             through the catch. Same outcome here, but the catch should
             mean something went wrong, not that the user hasn't paid. */
          .maybeSingle();

        if (!cancelled) setIsPremium(FORCE_PREMIUM || !!subscription);
      } catch {
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
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      {saveFailed && (
        <div
          role="alert"
          className="mx-auto mt-4 w-[min(52ch,100%-2rem)] rounded-xl px-4 py-3 text-[0.9rem]"
          style={{
            border: "1.5px solid color-mix(in srgb, var(--kesar) 45%, transparent)",
            background: "color-mix(in srgb, var(--kesar) 10%, transparent)",
            color: "var(--ink)",
          }}
        >
          We could not save your answers. Nothing has been lost from this
          screen — try Finish again, and tell us if it keeps failing.
        </div>
      )}
      <OnboardingFlow
      isPremium={isPremium}
      onComplete={async (data) => {
        // Save onboarding data to profile
        const supabase = browserClient();
        if (!supabase) return;

        /* Keyed on `id`. profiles.id IS the auth user id — the table has no
           user_id column and never had one, so the `.eq("user_id", ...)`
           this used to send matched nothing and PostgREST rejected the
           whole statement. Every other query against profiles in this
           codebase already keys on id; this was the one that did not.

           It failed in total silence. supabase-js resolves with
           { data, error } rather than throwing, so the try/catch here never
           fired, the returned error was never read, and the redirect ran as
           though the save had worked. Nothing was written: not the calorie
           target, not the goal, not the region or diet, and not
           onboarding_completed — which is why finishing onboarding never
           actually finished it.

           The body inputs go in alongside the target now. Without them the
           profile held a maintenance figure the app could not recompute,
           and /api/daily reads `target.tdee ?? estimate(...)`, so that one
           frozen number would have won for as long as the account existed,
           through every weight change. */
        const { error } = await supabase
          .from("profiles")
          .update({
            tdee: data.tdee,
            goal: data.goal,
            region: data.region,
            diet: data.diet,
            weight_kg: data.weight,
            height_cm: data.height,
            age: data.age,
            sex: data.sex,
            activity_level: data.activityLevel,
            onboarding_completed: true,
          })
          .eq("id", user.id);

        if (error) {
          /* Surfaced rather than swallowed: sending someone to a dashboard
             that has none of their answers is worse than telling them the
             save failed. */
          console.error("Failed to save onboarding data:", error.message);
          setSaveFailed(true);
          return;
        }

        router.push("/dashboard");
      }}
      />
    </>
  );
}
