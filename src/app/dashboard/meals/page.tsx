"use client";

import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { DashboardNavbar } from "@/components/poshan/dashboard-navbar";
import { MealsShowcase } from "@/components/poshan/meals-showcase";
import type { User } from "@supabase/supabase-js";
import { FORCE_PREMIUM } from "@/lib/dev-flags";

export default function MealsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [goal, setGoal] = useState<string | undefined>();

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
        loadUserData(data.user.id);
      }
      setLoading(false);
    });
  }, [router]);

  async function loadUserData(userId: string) {
    const supabase = browserClient();
    if (!supabase) return;

    try {
      // Get profile with goal
      const { data: profile } = await supabase
        .from("profiles")
        .select("goal")
        .eq("user_id", userId)
        .single();

      if (profile?.goal) {
        setGoal(profile.goal);
      }

      // Check if premium
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("product", "home")
        .in("status", ["trialing", "active"])
        .single();

      setIsPremium(FORCE_PREMIUM || !!subscription);
    } catch (error) {
      console.error("Failed to load user data:", error);
      setIsPremium(FORCE_PREMIUM);
    }
  }

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
        <MealsShowcase isPremium={isPremium} goal={goal as any} />
      </div>
    </>
  );
}
