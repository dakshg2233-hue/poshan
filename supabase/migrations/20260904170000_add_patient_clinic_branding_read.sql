-- Lets a patient read the clinic branding (name, logo) of a clinician
-- they're actively linked to — needed so the patient-facing plan view can
-- show "your clinic's name and logo on patient-facing plans" (CLINIC_TIERS,
-- poshan-data.ts). Missed in the clinic-teams migration, which only added
-- read access for CLINICIANS looking at their own clinic's roster; nothing
-- there let a PATIENT read clinic_members or clinics at all.
--
-- Two policies, not one: clinic_members.clinic_id -> clinics.id is a real
-- foreign key, so PostgREST can embed clinics inside a clinic_members
-- query in one round trip — but only if the patient's own RLS actually
-- permits reading clinic_members in the first place, which nothing did
-- until now. Both additive, same as every clinic-teams policy: this only
-- ever adds a read path, never narrows what already worked.
create policy "patient reads clinic membership of linked clinician"
  on public.clinic_members for select
  to authenticated using (
    exists (
      select 1 from public.patient_links pl
      where pl.patient_id = (select auth.uid())
        and pl.status = 'active'
        and pl.clinician_id = clinic_members.clinician_id
    )
  );

create policy "patient reads clinic of linked clinician"
  on public.clinics for select
  to authenticated using (
    exists (
      select 1
      from public.patient_links pl
      join public.clinic_members cm on cm.clinician_id = pl.clinician_id
      where pl.patient_id = (select auth.uid())
        and pl.status = 'active'
        and cm.clinic_id = clinics.id
    )
  );
