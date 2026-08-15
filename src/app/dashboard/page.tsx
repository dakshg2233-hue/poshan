"use client"

import { useEffect, useState } from "react"
import { browserClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import { useBiomarkers } from "@/lib/hooks/use-biomarkers"
import { useProfile } from "@/lib/hooks/use-profile"
import { useConditions } from "@/lib/hooks/use-conditions"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Heart, Droplet, TrendingUp } from "lucide-react"
import type { User } from "@supabase/supabase-js"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { biomarkers } = useBiomarkers()
  const { profile } = useProfile()
  const { conditions } = useConditions()

  useEffect(() => {
    const supabase = browserClient()
    if (!supabase) {
      router.push("/login")
      return
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login")
      } else {
        setUser(data.user)
      }
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name || user.email}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Track your health and wellness journey</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Height
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{profile?.height_cm || "--"} cm</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Weight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{profile?.weight_kg || "--"} kg</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Biomarkers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{biomarkers.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Droplet className="w-4 h-4" />
                  Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{conditions.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Biomarkers Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Biomarkers</CardTitle>
              </CardHeader>
              <CardContent>
                {biomarkers.length > 0 ? (
                  <div className="space-y-4">
                    {biomarkers.slice(0, 5).map((b) => (
                      <div key={b.id} className="flex justify-between items-center pb-4 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{b.marker}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{b.taken_on}</p>
                        </div>
                        <p className="text-lg font-bold">{b.value} {b.unit}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No biomarkers recorded yet. Add one to get started!</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Health Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                {conditions.length > 0 ? (
                  <div className="space-y-2">
                    {conditions.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        <span className="capitalize">{c.condition}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No conditions recorded. Add one if applicable.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <button className="p-4 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition">
              ➕ Add Biomarker
            </button>
            <button className="p-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
              📋 View Meal Plans
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
