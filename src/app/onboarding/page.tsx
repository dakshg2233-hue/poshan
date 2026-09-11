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
    <OnboardingFlow
      isPremium={isPremium}
      onComplete={async (data) => {
        // Save onboarding data to profile
        const supabase = browserClient();
        if (!supabase) return;

        try {
          await supabase
            .from("profiles")
            .update({
              tdee: data.tdee,
              goal: data.goal,
              region: data.region,
              diet: data.diet,
              onboarding_completed: true,
            })
            .eq("user_id", user.id);

          // Redirect to dashboard
          router.push("/dashboard");
        } catch (error) {
          console.error("Failed to save onboarding data:", error);
        }
      }}
    />
  );
}
