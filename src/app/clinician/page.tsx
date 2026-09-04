"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { DashboardNavbar } from "@/components/poshan/dashboard-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  Stethoscope,
  UserPlus,
  FlaskConical,
  ClipboardCheck,
  AlertTriangle,
  Building2,
  Upload,
  BookmarkPlus,
  ArrowRightLeft,
  Printer,
  CheckCheck,
  ShieldCheck,
  FolderTree,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { MARKERS } from "@/lib/clinical-markers";

type MeState =
  | { state: "unregistered"; application: { status: string; created_at: string } | null }
  | { state: "unsubscribed"; clinician: Clinician }
  | { state: "active"; clinician: Clinician };

interface Clinician {
  id: string;
  full_name: string;
  registration_number: string;
  registration_council: string;
  specialty: string | null;
}

interface PatientLink {
  id: string;
  patient_id: string | null;
  status: "pending" | "active" | "revoked";
  invite_code: string | null;
  invite_expires_at: string | null;
  linked_at: string | null;
}

interface PatientProfile {
  id: string;
  full_name: string | null;
}

interface ClinicRosterRow {
  id: string;
  clinician_id: string;
  role: "admin" | "member";
  department_id: string | null;
  clinicians: { full_name: string; specialty: string | null } | null;
}

interface Department {
  id: string;
  name: string;
}

interface ClinicMembership {
  id: string;
  clinic_id: string;
  clinician_id: string;
  role: "admin" | "member";
  clinics: { id: string; name: string; logo_url: string | null; owner_id: string };
  roster: ClinicRosterRow[];
  departments: Department[];
}

interface AuditEntry {
  id: string;
  action: string;
  patient_id: string | null;
  created_at: string;
  clinicians: { full_name: string } | null;
}

interface PlanTemplate {
  id: string;
  name: string;
  dishes: { id: string; time: string }[];
}

export default function ClinicianPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeState | null>(null);

  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) {
      router.push("/login");
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push(`/login?next=${encodeURIComponent("/clinician")}`);
        return;
      }
      setUser(data.user);
      fetch("/api/clinician/me")
        .then((r) => r.json())
        .then(setMe)
        .finally(() => setLoading(false));
    });
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--paper)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--kesar)] mx-auto mb-4" />
          <p className="text-[var(--ink-soft)]">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardNavbar />
      <div className="min-h-screen bg-[var(--paper)]">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1
              className="text-3xl font-bold flex items-center gap-3"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              <Stethoscope className="h-7 w-7" style={{ color: "var(--kesar)" }} />
              Clinician
            </h1>
            <p className="text-[var(--ink-soft)] mt-2">
              Poshan for Clinics — Practitioner tier. Phase 1: patient linking, lab entry, and
              plan drafting with the built-in safety checker.
            </p>
          </div>

          {me?.state === "unregistered" && (
            <ApplicationPanel application={me.application} onSubmitted={() => window.location.reload()} />
          )}
          {me?.state === "unsubscribed" && <UnsubscribedPanel clinician={me.clinician} />}
          {me?.state === "active" && <ClinicianDashboard clinician={me.clinician} />}
        </div>
      </div>
    </>
  );
}

function ApplicationPanel({
  application,
  onSubmitted,
}: {
  application: { status: string; created_at: string } | null;
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    registration_number: "",
    registration_council: "",
    specialty: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (application?.status === "pending") {
    return (
      <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
        <CardContent className="pt-6">
          <p style={{ color: "var(--ink)" }}>
            Your application is under review. Poshan confirms every registration number by hand
            before a clinician account goes live — we&apos;ll be in touch.
          </p>
        </CardContent>
      </Card>
    );
  }
  if (application?.status === "rejected") {
    return (
      <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
        <CardContent className="pt-6">
          <p style={{ color: "var(--ink)" }}>
            We couldn&apos;t verify that application. Contact{" "}
            <a href="mailto:dakshg2233@gmail.com" style={{ color: "var(--kesar)" }}>
              dakshg2233@gmail.com
            </a>{" "}
            if you believe this is a mistake.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/clinician/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit application.");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          Register as a clinician
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 max-w-md">
          <Field label="Full name" value={form.full_name} onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} required />
          <Field label="Registration number" value={form.registration_number} onChange={(v) => setForm((f) => ({ ...f, registration_number: v }))} required />
          <Field label="Registration council" value={form.registration_council} onChange={(v) => setForm((f) => ({ ...f, registration_council: v }))} placeholder="e.g. Medical Council of India, or your state council" required />
          <Field label="Specialty (optional)" value={form.specialty} onChange={(v) => setForm((f) => ({ ...f, specialty: v }))} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 w-fit"
            style={{ background: "var(--kesar-fill)" }}
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span style={{ color: "var(--ink-soft)" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="rounded-md border px-3 py-2"
        style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
      />
    </label>
  );
}

function UnsubscribedPanel({ clinician }: { clinician: Clinician }) {
  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardContent className="pt-6">
        <p style={{ color: "var(--ink)" }}>
          Welcome, Dr. {clinician.full_name} — your registration is verified. Practitioner-tier
          checkout isn&apos;t wired up yet (it needs its own Razorpay plan, separate from Poshan
          Home&apos;s), so there&apos;s nothing to subscribe to here yet. Contact{" "}
          <a href="mailto:dakshg2233@gmail.com" style={{ color: "var(--kesar)" }}>
            dakshg2233@gmail.com
          </a>{" "}
          in the meantime.
        </p>
      </CardContent>
    </Card>
  );
}

function ClinicianDashboard({ clinician }: { clinician: Clinician }) {
  const [links, setLinks] = useState<PatientLink[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PatientProfile>>({});
  const [membership, setMembership] = useState<ClinicMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<PatientLink | null>(null);
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [patientsRes, clinicRes] = await Promise.all([
      fetch("/api/clinician/patients"),
      fetch("/api/clinician/clinic"),
    ]);
    const data: PatientLink[] = await patientsRes.json();
    setLinks(Array.isArray(data) ? data : []);
    setMembership(await clinicRes.json());

    const activeIds = (Array.isArray(data) ? data : [])
      .filter((l) => l.status === "active" && l.patient_id)
      .map((l) => l.patient_id as string);
    if (activeIds.length > 0) {
      const supabase = browserClient();
      if (supabase) {
        const { data: rows } = await supabase.from("profiles").select("id, full_name").in("id", activeIds);
        const map: Record<string, PatientProfile> = {};
        (rows ?? []).forEach((r) => (map[r.id] = r));
        setProfiles(map);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function generateInvite() {
    setInviting(true);
    try {
      const res = await fetch("/api/clinician/patients", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setInvite(data);
        load();
      }
    } finally {
      setInviting(false);
    }
  }

  const activeLinks = links.filter((l) => l.status === "active");
  const pendingLinks = links.filter((l) => l.status === "pending");
  const colleagues = (membership?.roster ?? []).filter((r) => r.clinician_id !== clinician.id);

  return (
    <div className="grid gap-8">
      <ClinicPanel membership={membership} onChange={load} />

      {membership && membership.role === "admin" && membership.departments.length > 0 && (
        <AuditTrailPanel />
      )}

      <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
            {membership ? "Practice patients" : "Patients"} ({activeLinks.length})
          </CardTitle>
          <button
            onClick={generateInvite}
            disabled={inviting}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--kesar-fill)" }}
          >
            <UserPlus className="h-4 w-4" /> {inviting ? "Generating…" : "Invite patient"}
          </button>
        </CardHeader>
        <CardContent>
          {invite && (
            <div className="mb-4 rounded-lg p-4" style={{ background: "var(--roti-2, var(--roti))" }}>
              <p className="text-sm" style={{ color: "var(--ink)" }}>
                Give this code to your patient — it expires in 24 hours and works once:
              </p>
              <p
                className="mt-2 text-2xl font-bold tracking-widest"
                style={{ fontFamily: "var(--font-data)", color: "var(--kesar)" }}
              >
                {invite.invite_code}
              </p>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
          ) : (
            <div className="grid gap-2">
              {activeLinks.length === 0 && pendingLinks.length === 0 && (
                <p className="text-sm text-[var(--ink-soft)]">
                  No patients yet — generate an invite code above and hand it to your first patient.
                </p>
              )}
              {activeLinks.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg p-3"
                  style={{
                    background: selected === l.patient_id ? "var(--kesar-fill)" : "var(--roti-2, var(--roti))",
                    color: selected === l.patient_id ? "#fff" : "var(--ink)",
                  }}
                >
                  <button onClick={() => setSelected(l.patient_id)} className="flex-1 text-left cursor-pointer">
                    <span>{profiles[l.patient_id ?? ""]?.full_name ?? "Patient"}</span>
                    <span className="ml-2 text-xs opacity-75">
                      Linked {l.linked_at ? new Date(l.linked_at).toLocaleDateString() : ""}
                    </span>
                  </button>
                  {colleagues.length > 0 && (
                    <ReassignControl linkId={l.id} colleagues={colleagues} onDone={load} />
                  )}
                </div>
              ))}
              {pendingLinks.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg p-3 text-sm"
                  style={{ background: "var(--roti-2, var(--roti))", color: "var(--ink-soft)" }}
                >
                  <span>Invite pending — code {l.invite_code}</span>
                  <span>Expires {l.invite_expires_at ? new Date(l.invite_expires_at).toLocaleString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <PatientPanel
          clinician={clinician}
          patientId={selected}
          patientName={profiles[selected]?.full_name ?? "Patient"}
          clinicId={membership?.clinic_id ?? null}
        />
      )}
    </div>
  );
}

/** Only rendered once other clinicians are on the roster — reassignment is
 *  meaningless with nobody to hand a patient to. */
function ReassignControl({
  linkId,
  colleagues,
  onDone,
}: {
  linkId: string;
  colleagues: ClinicRosterRow[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reassign(clinicianId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/clinician/patients/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_id: linkId, clinician_id: clinicianId }),
      });
      if (res.ok) onDone();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-label="Reassign to a colleague"
        className="ml-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold opacity-80 hover:opacity-100"
        style={{ border: "1px solid currentColor" }}
      >
        <ArrowRightLeft className="h-3.5 w-3.5" /> Reassign
      </button>
      {open && (
        <div
          className="popover-in absolute right-0 z-10 mt-1 w-48 rounded-lg p-1 shadow-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          {colleagues.map((c) => (
            <button
              key={c.clinician_id}
              onClick={() => reassign(c.clinician_id)}
              className="block w-full rounded px-2.5 py-1.5 text-left text-xs hover:opacity-80"
              style={{ color: "var(--ink)" }}
            >
              Dr. {c.clinicians?.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const AUDIT_ACTION_LABEL: Record<string, string> = {
  read_patient_list: "Viewed patient list",
  read_labs: "Viewed lab values",
  read_plan: "Viewed a care plan",
  add_lab: "Added a lab value",
  draft_plan: "Drafted a care plan",
  approve_plan: "Approved a care plan",
  export_pdf: "Exported a PDF",
};

/**
 * "Full audit trail: who read what, who approved what, when" (CLINIC_TIERS)
 * — only rendered once membership.departments.length > 0, since logAudit()
 * only writes rows for clinics that have created a department, matching
 * this being specifically a Hospital-tier promise, not a Clinic-tier one.
 */
function AuditTrailPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/clinician/clinic/audit");
      if (cancelled) return;
      if (res.ok) setEntries(await res.json());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <ShieldCheck className="h-5 w-5" style={{ color: "var(--kesar)" }} /> Audit trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">No activity logged yet.</p>
        ) : (
          <div className="grid gap-1.5 max-h-80 overflow-y-auto">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs" style={{ color: "var(--ink)" }}>
                <span>
                  Dr. {e.clinicians?.full_name ?? "…"} — {AUDIT_ACTION_LABEL[e.action] ?? e.action}
                </span>
                <span style={{ color: "var(--ink-soft)" }}>{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClinicPanel({
  membership,
  onChange,
}: {
  membership: ClinicMembership | null;
  onChange: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [editingBrand, setEditingBrand] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createClinic(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clinician/clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create clinic.");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create clinic.");
    } finally {
      setBusy(false);
    }
  }

  /** "Your clinic's name and logo on patient-facing plans" (CLINIC_TIERS)
   *  — this is the write side; patient-care.tsx (the /dashboard read side)
   *  already renders whatever's saved here. logo_url is just a URL, not an
   *  upload: no image-hosting piece exists in this app yet, so the admin
   *  points at wherever they already host the clinic's logo. */
  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clinician/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: logoUrl.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save branding.");
      setEditingBrand(false);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save branding.");
    } finally {
      setBusy(false);
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!regNumber.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clinician/clinic/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_number: regNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add clinician.");
      setRegNumber("");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add clinician.");
    } finally {
      setBusy(false);
    }
  }

  async function addDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!departmentName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clinician/clinic/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: departmentName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create department.");
      setDepartmentName("");
      setAddingDepartment(false);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create department.");
    } finally {
      setBusy(false);
    }
  }

  async function assignDepartment(memberId: string, departmentId: string) {
    setError(null);
    try {
      const res = await fetch("/api/clinician/clinic/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberId, department_id: departmentId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not assign department.");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign department.");
    }
  }

  if (!membership) {
    return (
      <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
            <Building2 className="h-5 w-5" style={{ color: "var(--kesar)" }} /> Solo practice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-[var(--ink-soft)]">
            Start a clinic to bring colleagues onto a shared patient list, with reassignment,
            plan templates and clinic branding on patient plans (Clinic tier).
          </p>
          {creating ? (
            <form onSubmit={createClinic} className="flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Clinic name"
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
                autoFocus
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--kesar-fill)" }}
              >
                {busy ? "Creating…" : "Create clinic"}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              Start a clinic
            </button>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          {membership.clinics.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL, not a static asset
            <img src={membership.clinics.logo_url} alt="" className="h-6 w-6 rounded object-contain" />
          ) : (
            <Building2 className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          )}
          {membership.clinics.name}
        </CardTitle>
        {membership.role === "admin" && !editingBrand && (
          <button
            onClick={() => {
              setLogoUrl(membership.clinics.logo_url ?? "");
              setEditingBrand(true);
            }}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
            style={{ color: "var(--ink)" }}
          >
            Edit logo
          </button>
        )}
      </CardHeader>
      <CardContent>
        {editingBrand && (
          <form onSubmit={saveBranding} className="panel-in mb-4 flex flex-wrap items-center gap-2">
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Logo image URL"
              className="min-w-64 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
              autoFocus
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--kesar-fill)" }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingBrand(false)}
              className="text-sm font-semibold"
              style={{ color: "var(--ink-soft)" }}
            >
              Cancel
            </button>
          </form>
        )}
        <div className="mb-4 grid gap-2">
          {membership.roster.map((r) => {
            const dept = membership.departments.find((d) => d.id === r.department_id);
            return (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "var(--roti-2, var(--roti))" }}
              >
                <span className="text-sm" style={{ color: "var(--ink)" }}>
                  Dr. {r.clinicians?.full_name} {r.role === "admin" && "· admin"}
                  {dept && <span className="ml-2 text-xs" style={{ color: "var(--ink-soft)" }}>· {dept.name}</span>}
                </span>
                {membership.role === "admin" && membership.departments.length > 0 && (
                  <select
                    value={r.department_id ?? ""}
                    onChange={(e) => assignDepartment(r.id, e.target.value)}
                    className="rounded-md border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
                  >
                    <option value="">No department</option>
                    {membership.departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {membership.role === "admin" && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {membership.departments.map((d) => (
              <span
                key={d.id}
                className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
              >
                <FolderTree className="h-3 w-3" /> {d.name}
              </span>
            ))}
            {addingDepartment ? (
              <form onSubmit={addDepartment} className="flex items-center gap-2">
                <input
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="e.g. Dietetics"
                  className="rounded-md border px-2 py-1.5 text-xs"
                  style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  style={{ background: "var(--kesar-fill)" }}
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                onClick={() => setAddingDepartment(true)}
                className="text-xs font-semibold opacity-70 hover:opacity-100"
                style={{ color: "var(--ink)" }}
              >
                + New department
              </button>
            )}
          </div>
        )}

        {membership.role === "admin" && (
          <form onSubmit={addMember} className="flex flex-wrap items-center gap-2">
            <input
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="Colleague's registration number"
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              {busy ? "Adding…" : "Add to clinic"}
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

interface LabValue {
  id: string;
  marker: string;
  value: number;
  unit: string;
  taken_on: string;
}

interface CarePlan {
  id: string;
  status: "draft" | "approved" | "sent";
  plan_json: {
    dishes: { id: string; name: { en: string; hi: string }; time: string; kcal: number }[];
    targetKcal: number;
    totalKcal: number;
  };
  safety_flags: { mealName: { en: string }; condition: string; verdict: string; why: { en: string } }[];
  approved_at: string | null;
  approved_by_reg_number: string | null;
  opened_by_patient_at: string | null;
  created_at: string;
}

function PatientPanel({
  patientId,
  patientName,
  clinicId,
}: {
  clinician: Clinician;
  patientId: string;
  patientName: string;
  /** null for a solo Practitioner clinician — templates and CSV import are
   *  offered either way (they don't need a clinic), but framed as a
   *  practice-wide tool only when there's a practice to share them with. */
  clinicId: string | null;
}) {
  const [labs, setLabs] = useState<LabValue[]>([]);
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [labForm, setLabForm] = useState({ marker: "hba1c", value: "", unit: "%", taken_on: "" });
  const [savingLab, setSavingLab] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [labsRes, plansRes, templatesRes] = await Promise.all([
      fetch(`/api/clinician/labs?patient_id=${patientId}`),
      fetch(`/api/clinician/plans?patient_id=${patientId}`),
      clinicId ? fetch("/api/clinician/templates") : Promise.resolve(null),
    ]);
    setLabs(await labsRes.json());
    setPlans(await plansRes.json());
    if (templatesRes) setTemplates(await templatesRes.json());
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function addLab(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!labForm.value || !labForm.taken_on) {
      setError("A value and date are required.");
      return;
    }
    setSavingLab(true);
    try {
      const res = await fetch("/api/clinician/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          marker: labForm.marker,
          value: Number(labForm.value),
          unit: labForm.unit,
          taken_on: labForm.taken_on,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save lab value.");
      setLabForm((f) => ({ ...f, value: "" }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save lab value.");
    } finally {
      setSavingLab(false);
    }
  }

  /* Expects "marker,value,unit,taken_on" per line, e.g.
     "hba1c,7.2,%,2026-08-01" — no header row, no quoting: a format this
     narrow needs nothing heavier than String.split, so no CSV library
     either side of this. */
  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportingCsv(true);
    setCsvResult(null);
    setError(null);
    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [marker, value, unit, taken_on] = line.split(",").map((c) => c.trim());
          return { marker, value: Number(value), unit, taken_on };
        });

      const res = await fetch("/api/clinician/labs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not import that file.");
      setCsvResult(
        `Imported ${data.inserted} row${data.inserted === 1 ? "" : "s"}` +
          (data.rejected.length > 0 ? `, skipped ${data.rejected.length}` : "")
      );
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import that file.");
    } finally {
      setImportingCsv(false);
    }
  }

  async function draftPlan() {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/clinician/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          template_id: selectedTemplate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not draft a plan.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft a plan.");
    } finally {
      setDrafting(false);
    }
  }

  async function saveAsTemplate(plan: CarePlan) {
    const name = window.prompt("Template name?");
    if (!name?.trim()) return;
    try {
      const res = await fetch("/api/clinician/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dishes: plan.plan_json.dishes.map((d) => ({ id: d.id, time: d.time })),
        }),
      });
      if (res.ok) load();
    } catch {
      /* best-effort — the plan itself is already saved either way */
    }
  }

  async function approvePlan(id: string) {
    const res = await fetch(`/api/clinician/plans/${id}/approve`, { method: "POST" });
    if (res.ok) load();
  }

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>{patientName}</CardTitle>
        <Link
          href={`/clinician/print/${patientId}`}
          target="_blank"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          <Printer className="h-3.5 w-3.5" /> Export as PDF
        </Link>
      </CardHeader>
      <CardContent className="grid gap-6">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <FlaskConical className="h-4 w-4" style={{ color: "var(--kesar)" }} /> Lab values
            </h3>
            <label
              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              <Upload className="h-3.5 w-3.5" /> {importingCsv ? "Importing…" : "Import CSV"}
              <input type="file" accept=".csv,text/csv" onChange={importCsv} disabled={importingCsv} hidden />
            </label>
          </div>
          {csvResult && <p className="mb-2 text-xs" style={{ color: "var(--ink-soft)" }}>{csvResult}</p>}
          <form onSubmit={addLab} className="flex flex-wrap items-end gap-2 mb-3">
            <select
              value={labForm.marker}
              onChange={(e) => {
                const marker = e.target.value;
                const m = MARKERS.find((x) => x.key === marker);
                setLabForm((f) => ({ ...f, marker, unit: m?.unit ?? f.unit }));
              }}
              className="rounded-md border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            >
              {MARKERS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Value"
              value={labForm.value}
              onChange={(e) => setLabForm((f) => ({ ...f, value: e.target.value }))}
              className="w-24 rounded-md border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <span className="text-xs text-[var(--ink-soft)]">{labForm.unit}</span>
            <input
              type="date"
              value={labForm.taken_on}
              onChange={(e) => setLabForm((f) => ({ ...f, taken_on: e.target.value }))}
              className="rounded-md border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
            />
            <button
              type="submit"
              disabled={savingLab}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--kesar-fill)" }}
            >
              Add
            </button>
          </form>
          {labs.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">No labs recorded yet.</p>
          ) : (
            <div className="grid gap-1.5">
              {labs.map((l) => (
                <div key={l.id} className="flex justify-between text-sm" style={{ color: "var(--ink)" }}>
                  <span>{MARKERS.find((m) => m.key === l.marker)?.label ?? l.marker}</span>
                  <span>
                    {l.value} {l.unit} · {l.taken_on}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <ClipboardCheck className="h-4 w-4" style={{ color: "var(--kesar)" }} /> Care plans
            </h3>
            <div className="flex items-center gap-2">
              {clinicId && templates.length > 0 && (
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="rounded-md border px-2 py-1.5 text-xs"
                  style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
                >
                  <option value="">Start from scratch</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
              <button
                onClick={draftPlan}
                disabled={drafting}
                className="rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
                style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
              >
                {drafting ? "Drafting…" : "Draft new plan"}
              </button>
            </div>
          </div>
          {plans.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">No plans drafted yet.</p>
          ) : (
            <div className="grid gap-3">
              {plans.map((p) => (
                <div key={p.id} className="rounded-lg p-3" style={{ background: "var(--roti-2, var(--roti))" }}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase" style={{ color: "var(--ink-soft)" }}>
                      {p.status} · {new Date(p.created_at).toLocaleDateString()}
                      {p.opened_by_patient_at && (
                        <span className="flex items-center gap-0.5 normal-case" title={`Opened ${new Date(p.opened_by_patient_at).toLocaleString()}`}>
                          <CheckCheck className="h-3.5 w-3.5" style={{ color: "var(--kesar)" }} /> Opened
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {clinicId && (
                        <button
                          onClick={() => saveAsTemplate(p)}
                          aria-label="Save as template"
                          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ border: "1px solid var(--line)", color: "var(--ink-soft)" }}
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" /> Save as template
                        </button>
                      )}
                      {p.status === "draft" && (
                        <button
                          onClick={() => approvePlan(p.id)}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                          style={{ background: "var(--kesar-fill)" }}
                        >
                          Approve &amp; send
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm" style={{ color: "var(--ink)" }}>
                    {p.plan_json.dishes.map((d) => (
                      <div key={d.id} className="flex justify-between">
                        <span className="capitalize">{d.time}: {d.name.en}</span>
                        <span>{d.kcal} kcal</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs pt-1" style={{ color: "var(--ink-soft)" }}>
                      <span>Total</span>
                      <span>{p.plan_json.totalKcal} / {p.plan_json.targetKcal} kcal target</span>
                    </div>
                  </div>
                  {p.safety_flags.length > 0 && (
                    <div className="mt-2 grid gap-1">
                      {p.safety_flags.map((f, i) => (
                        <p key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--ink-soft)" }}>
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "var(--kesar)" }} />
                          {f.mealName.en} — {f.verdict} for {f.condition}: {f.why.en}
                        </p>
                      ))}
                    </div>
                  )}
                  {p.approved_by_reg_number && (
                    <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
                      Signed off · reg. {p.approved_by_reg_number} ·{" "}
                      {p.approved_at && new Date(p.approved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
