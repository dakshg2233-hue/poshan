"use client";

import { useEffect, useState, use as usePromise } from "react";

const EMPTY = {
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
 * The public half of the family-invite flow (src/app/api/family/invite/
 * [token]/route.ts): reached by whoever holds the link, no account of
 * their own needed. Fills in their own profile once; the server route
 * turns it into a normal family_members row against the inviting account.
 */
export default function FamilyInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = usePromise(params);
  const [status, setStatus] = useState<"checking" | "valid" | "invalid" | "done">("checking");
  const [invalidReason, setInvalidReason] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/family/invite/${token}`)
      .then(async (r) => {
        if (r.ok) {
          setStatus("valid");
        } else {
          const data = await r.json().catch(() => ({}));
          setInvalidReason(data.error ?? "This invite link isn't valid.");
          setStatus("invalid");
        }
      })
      .catch(() => {
        setInvalidReason("Couldn't reach the server.");
        setStatus("invalid");
      });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) {
      setError("A name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/family/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not join.");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-16" style={{ background: "var(--paper)" }}>
      <div className="mx-auto max-w-md rounded-2xl border p-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <h1 className="mb-1 text-xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          Join a Poshan family account
        </h1>

        {status === "checking" && <p className="text-sm text-[var(--ink-soft)]">Checking your invite…</p>}

        {status === "invalid" && <p className="text-sm text-[var(--ink-soft)]">{invalidReason}</p>}

        {status === "done" && (
          <p className="text-sm" style={{ color: "var(--ink)" }}>
            You&apos;re added. The account owner will now see your plate alongside their own.
          </p>
        )}

        {status === "valid" && (
          <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3">
            <p className="col-span-2 text-sm text-[var(--ink-soft)]">
              Fill in your own details — these stay with the account that invited you.
            </p>
            <input
              placeholder="Your name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="col-span-2 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
              autoFocus
            />
            <input
              placeholder="Relationship (e.g. spouse)"
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
              value={form.goal}
              onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value as typeof f.goal }))}
              className="col-span-2 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            >
              <option value="">Goal</option>
              <option value="loss">Weight loss</option>
              <option value="muscle">Muscle gain</option>
              <option value="diabetes">Blood sugar</option>
              <option value="pcos">PCOS</option>
              <option value="thyroid">Thyroid</option>
            </select>

            {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="col-span-2 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--kesar-fill)" }}
            >
              {submitting ? "Joining…" : "Join"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
