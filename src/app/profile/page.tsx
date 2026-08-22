"use client"

import { useState } from "react"
import { useProfile, type Profile } from "@/lib/hooks/use-profile"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/* Numbers live as strings in form state. An <input type="number"> yields a
   string, and coercing on every keystroke turns a half-typed "17" into 17,
   fighting the user mid-edit. Coerce once, at submit. */
type FormState = {
  full_name: string
  height_cm: string
  weight_kg: string
  region: NonNullable<Profile["region"]>
  diet: NonNullable<Profile["diet"]>
  goal: NonNullable<Profile["goal"]>
}

const EMPTY_FORM: FormState = {
  full_name: "",
  height_cm: "",
  weight_kg: "",
  region: "north",
  diet: "veg",
  goal: "loss",
}

export default function ProfilePage() {
  const { profile, updateProfile, loading } = useProfile()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    )
  }

  /* The form is a separate component mounted only once loading has settled, so
     its useState initialiser sees the real profile. `key` remounts it if the
     signed-in user changes. This is what fixes the data-loss bug: the previous
     version seeded useState on the first render, while profile was still null,
     then wrote those blanks back over the saved row on submit. */
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm
                key={profile?.id ?? "anon"}
                profile={profile}
                updateProfile={updateProfile}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function ProfileForm({
  profile,
  updateProfile,
}: {
  profile: Profile | null
  updateProfile: (updates: Partial<Profile>) => Promise<unknown>
}) {
  /* Safe to seed from props here: this component only mounts after the parent
     has finished loading, so `profile` is already settled. */
  const [formData, setFormData] = useState<FormState>(() =>
    profile
      ? {
          full_name: profile.full_name ?? "",
          height_cm: profile.height_cm?.toString() ?? "",
          weight_kg: profile.weight_kg?.toString() ?? "",
          region: profile.region ?? "north",
          diet: profile.diet ?? "veg",
          goal: profile.goal ?? "loss",
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    try {
      /* Send only what actually changed. A field left blank then submitted
         should not null out a stored value. */
      const patch: Partial<Profile> = {}
      if (formData.full_name !== (profile?.full_name ?? ""))
        patch.full_name = formData.full_name || null
      if (formData.height_cm !== (profile?.height_cm?.toString() ?? ""))
        patch.height_cm = formData.height_cm ? Number(formData.height_cm) : null
      if (formData.weight_kg !== (profile?.weight_kg?.toString() ?? ""))
        patch.weight_kg = formData.weight_kg ? Number(formData.weight_kg) : null
      if (formData.region !== profile?.region) patch.region = formData.region
      if (formData.diet !== profile?.diet) patch.diet = formData.diet
      if (formData.goal !== profile?.goal) patch.goal = formData.goal

      if (Object.keys(patch).length === 0) {
        setMessage("Nothing to save, no changes.")
        setSaving(false)
        setTimeout(() => setMessage(""), 3000)
        return
      }

      await updateProfile(patch)
      setMessage("Profile updated successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch {
      setMessage("Failed to update profile")
    }
    setSaving(false)
  }

  return (
    <>
      {message && (
        <div
          role="status"
          className={`mb-4 p-4 rounded ${message.includes("successfully") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                    placeholder="Your name"
                  />
                </div>

                {/* Height & Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Height (cm)</label>
                    <input
                      type="number"
                      name="height_cm"
                      value={formData.height_cm}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                      placeholder="170"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Weight (kg)</label>
                    <input
                      type="number"
                      name="weight_kg"
                      value={formData.weight_kg}
                      onChange={handleChange}
                      step="0.1"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                      placeholder="70"
                    />
                  </div>
                </div>

                {/* Region */}
                <div>
                  <label className="block text-sm font-medium mb-2">Region</label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    <option value="north">North</option>
                    <option value="south">South</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                  </select>
                </div>

                {/* Diet */}
                <div>
                  <label className="block text-sm font-medium mb-2">Diet</label>
                  <select
                    name="diet"
                    value={formData.diet}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="nonveg">Non-Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="jain">Jain</option>
                  </select>
                </div>

                {/* Goal */}
                <div>
                  <label className="block text-sm font-medium mb-2">Goal</label>
                  <select
                    name="goal"
                    value={formData.goal}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    <option value="loss">Weight Loss</option>
                    <option value="muscle">Muscle Gain</option>
                    <option value="diabetes">Diabetes Management</option>
                    <option value="pcos">PCOS</option>
                    <option value="thyroid">Thyroid</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
      </form>
    </>
  )
}
