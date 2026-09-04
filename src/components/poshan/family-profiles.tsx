"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, Trash2 } from "lucide-react";
import { useFamilyMembers, type FamilyMember } from "@/lib/hooks/use-family-members";
import { bandFor } from "@/lib/poshan-data";

const MAX_FAMILY_MEMBERS = 5;

const EMPTY_FORM = {
  full_name: "",
  relationship: "",
  height_cm: "",
  weight_kg: "",
  age: "",
  sex: "" as "" | "male" | "female",
  diet: "" as "" | "veg" | "nonveg" | "vegan" | "jain",
  region: "" as "" | "north" | "south" | "east" | "west",
  goal: "" as "" | "loss" | "muscle" | "diabetes" | "pcos" | "thyroid",
  activity_level: "" as "" | "sedentary" | "moderate" | "heavy",
};

/**
 * "Up to six family profiles" (PREMIUM_FEATURES, poshan-data.ts) — the
 * account owner's own profile is one, this manages the other five. Premium
 * gate is enforced server-side (/api/family); this component just reflects
 * that back rather than re-deciding it, since a client-side isPremium flag
 * is trivially spoofable and the route never trusts it.
 */
export function FamilyProfiles({ isPremium }: { isPremium: boolean }) {
  const { members, loading, error, addMember, removeMember } = useFamilyMembers();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isPremium) {
    return (
      <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
            <Users className="h-5 w-5" style={{ color: "var(--kesar)" }} />
            Family
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--ink-soft)]">
            Manage nutrition for up to five family members from one account — a Poshan Home feature.{" "}
            <Link href="/#premium" style={{ color: "var(--kesar)" }}>See Poshan Home</Link>.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.full_name.trim()) {
      setFormError("A name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await addMember({
        full_name: form.full_name.trim(),
        relationship: form.relationship.trim() || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        age: form.age ? Number(form.age) : null,
        sex: form.sex || null,
        diet: form.diet || null,
        region: form.region || null,
        goal: form.goal || null,
        activity_level: form.activity_level || null,
      });
      setForm(EMPTY_FORM);
      setAdding(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add family member.");
    } finally {
      setSubmitting(false);
    }
  }

  const atCap = members.length >= MAX_FAMILY_MEMBERS;

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <Users className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Family
        </CardTitle>
        {!adding && !atCap && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-sm font-medium cursor-pointer"
            style={{ color: "var(--kesar)" }}
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        ) : error ? (
          <p className="text-sm text-[var(--ink-soft)]">{error}</p>
        ) : members.length === 0 && !adding ? (
          <p className="text-sm text-[var(--ink-soft)]">
            No family members added yet. Add up to {MAX_FAMILY_MEMBERS}, and manage their nutrition alongside your own.
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((m) => (
              <MemberRow key={m.id} member={m} onRemove={() => removeMember(m.id)} />
            ))}
          </div>
        )}

        {adding && (
          <form onSubmit={handleAdd} className="mt-4 grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <input
              placeholder="Name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="col-span-2 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
              autoFocus
            />
            <input
              placeholder="Relationship (e.g. spouse, child)"
              value={form.relationship}
              onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
              className="col-span-2 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <input
              placeholder="Height (cm)"
              type="number"
              value={form.height_cm}
              onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <input
              placeholder="Weight (kg)"
              type="number"
              value={form.weight_kg}
              onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <input
              placeholder="Age"
              type="number"
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <select
              value={form.sex}
              onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as typeof f.sex }))}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            >
              <option value="">Sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <select
              value={form.diet}
              onChange={(e) => setForm((f) => ({ ...f, diet: e.target.value as typeof f.diet }))}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            >
              <option value="">Diet</option>
              <option value="veg">Vegetarian</option>
              <option value="nonveg">Non-vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="jain">Jain</option>
            </select>
            <select
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value as typeof f.region }))}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            >
              <option value="">Region</option>
              <option value="north">North</option>
              <option value="south">South</option>
              <option value="east">East</option>
              <option value="west">West</option>
            </select>
            <select
              value={form.activity_level}
              onChange={(e) => setForm((f) => ({ ...f, activity_level: e.target.value as typeof f.activity_level }))}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            >
              <option value="">Activity</option>
              <option value="sedentary">Sedentary</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>

            {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}

            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--kesar-fill)" }}
              >
                {submitting ? "Adding…" : "Add family member"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setForm(EMPTY_FORM);
                  setFormError(null);
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{ color: "var(--ink-soft)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {atCap && !adding && (
          <p className="mt-3 text-xs text-[var(--ink-soft)]">
            You&apos;ve added {MAX_FAMILY_MEMBERS} family members — the maximum for one account.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MemberRow({ member, onRemove }: { member: FamilyMember; onRemove: () => void }) {
  const bmi =
    member.height_cm && member.weight_kg
      ? member.weight_kg / Math.pow(member.height_cm / 100, 2)
      : null;
  const band = bmi !== null ? bandFor(bmi) : null;

  return (
    <div className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--roti-2, var(--roti))" }}>
      <div>
        <p className="font-medium" style={{ color: "var(--ink)" }}>
          {member.full_name}
          {member.relationship ? (
            <span className="ml-2 text-xs font-normal text-[var(--ink-soft)]">{member.relationship}</span>
          ) : null}
        </p>
        <p className="text-xs text-[var(--ink-soft)]">
          {member.age ? `${member.age} yrs` : "Age not set"}
          {bmi !== null && band ? ` · BMI ${bmi.toFixed(1)} (${band.name.en})` : " · Height/weight not set"}
        </p>
      </div>
      <button
        onClick={onRemove}
        aria-label={`Remove ${member.full_name}`}
        className="rounded-full p-1.5 hover:opacity-70"
        style={{ color: "var(--ink-soft)" }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
