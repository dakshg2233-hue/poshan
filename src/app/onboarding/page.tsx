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

  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) {
      router.push("/login");
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUser(data.user);
        // Check if user has premium subscription
        checkSubscription(data.user.id);
      }
      setLoading(false);
    });
  }, [router]);

  async function checkSubscription(userId: string) {
    const supabase = browserClient();
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("product", "home")
        .in("status", ["trialing", "active"])
        .single();

      setIsPremium(FORCE_PREMIUM || !!data);
    } catch {
      setIsPremium(FORCE_PREMIUM);
    }
  }

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
