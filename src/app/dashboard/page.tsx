"use client"

import { useEffect, useState } from "react"
import { browserClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import { useBiomarkers } from "@/lib/hooks/use-biomarkers"
import { useProfile } from "@/lib/hooks/use-profile"
import { useConditions } from "@/lib/hooks/use-conditions"
import { DashboardNavbar } from "@/components/poshan/dashboard-navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MacroPersonalizer } from "@/components/poshan/macro-personalizer"
import type { GoalKey } from "@/lib/poshan-data"
import { TodayWidget } from "@/components/poshan/today-widget"
import { FamilyProfiles } from "@/components/poshan/family-profiles"
import { PatientCare } from "@/components/poshan/patient-care"
import { Activity, Heart, Droplet, TrendingUp } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { FORCE_PREMIUM } from "@/lib/dev-flags"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const { biomarkers } = useBiomarkers()
  const { profile } = useProfile()
  const { conditions } = useConditions()

  useEffect(() => {
    const supabase = browserClient()
    if (!supabase) {
      router.push("/login")
      return
    }

    async function checkSubscription(userId: string) {
      const supabase = browserClient()
      if (!supabase) return

      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .eq("product", "home")
          .in("status", ["trialing", "active"])
          .single()

        setIsPremium(FORCE_PREMIUM || !!data)
      } catch {
        setIsPremium(FORCE_PREMIUM)
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login")
      } else {
        setUser(data.user)
        checkSubscription(data.user.id)
      }
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--paper)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--kesar)] mx-auto mb-4"></div>
          <p className="text-[var(--ink-soft)]">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const statCards = [
    { icon: Heart, label: "Height", value: `${profile?.height_cm || "--"} cm` },
    { icon: Activity, label: "Weight", value: `${profile?.weight_kg || "--"} kg` },
    { icon: TrendingUp, label: "Biomarkers", value: biomarkers.length },
    { icon: Droplet, label: "Conditions", value: conditions.length },
  ]

  return (
    <>
      <DashboardNavbar />
      <div className="min-h-screen bg-[var(--paper)]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 rise">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
              Welcome back, {profile?.full_name || user.email}
            </h1>
            <p className="text-[var(--ink-soft)] mt-2">Track your health and wellness journey</p>
          </div>

          {/* Glanceable summary — the one card meant to answer "where do I
              stand today" without scrolling further. */}
          <div className="mb-8">
            <TodayWidget profile={profile} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {statCards.map(({ icon: Icon, label, value }, i) => (
              <Card
                key={label}
                className="card-in border-[var(--line)] bg-[var(--surface)]"
                style={{ "--i": i } as React.CSSProperties}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-[var(--ink-soft)] flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: "var(--kesar)" }} />
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Biomarkers Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="card-in border-[var(--line)] bg-[var(--surface)]" style={{ "--i": 4 } as React.CSSProperties}>
              <CardHeader>
                <CardTitle style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>Recent Biomarkers</CardTitle>
              </CardHeader>
              <CardContent>
                {biomarkers.length > 0 ? (
                  <div className="space-y-4">
                    {biomarkers.slice(0, 5).map((b) => (
                      <div key={b.id} className="flex justify-between items-center pb-4 border-b last:border-b-0" style={{ borderColor: "var(--line)" }}>
                        <div>
                          <p className="font-medium" style={{ color: "var(--ink)" }}>{b.marker}</p>
                          <p className="text-sm text-[var(--ink-soft)]">{b.taken_on}</p>
                        </div>
                        <p className="text-lg font-bold" style={{ color: "var(--ink)" }}>{b.value} {b.unit}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--ink-soft)]">No biomarkers recorded yet. Add one to get started!</p>
                )}
              </CardContent>
            </Card>

            <Card className="card-in border-[var(--line)] bg-[var(--surface)]" style={{ "--i": 5 } as React.CSSProperties}>
              <CardHeader>
                <CardTitle style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>Health Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                {conditions.length > 0 ? (
                  <div className="space-y-2">
                    {conditions.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 p-2 rounded" style={{ background: "var(--roti-2)" }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: "var(--kesar)" }}></span>
                        <span className="capitalize" style={{ color: "var(--ink)" }}>{c.condition}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--ink-soft)]">No conditions recorded. Add one if applicable.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Family profiles (Premium only — the gate itself is enforced
              server-side in /api/family, this just reflects it). */}
          <div className="mt-8">
            <FamilyProfiles isPremium={isPremium} />
          </div>

          {/* Clinician links — free for every account, not a Premium
              feature: a patient shouldn't have to pay Poshan to accept
              their own doctor's invite. */}
          <div className="mt-8">
            <PatientCare userId={user.id} />
          </div>

          {/* Macro Personalizer (Premium Only) */}
          {isPremium && profile?.tdee && profile?.goal && (
            <div className="mt-8">
              <MacroPersonalizer
                tdee={profile.tdee}
                goal={profile.goal as GoalKey}
                isPremium={true}
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <button
              onClick={() => router.push("/dashboard/meals")}
              className="p-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
              🍛 Browse Meals (130+)
            </button>
            <button className="p-4 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition">
              ➕ Add Biomarker
            </button>
            <button className="p-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
              ⚙️ Edit Profile
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
