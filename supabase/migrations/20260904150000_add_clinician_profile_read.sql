-- Extends profiles and user_conditions with a read policy for a linked
-- clinician. Missed in the original clinician-platform migration: drafting
-- a care plan needs the patient's region/diet/goal/height/weight/age/sex
-- and their recorded conditions, and until now nothing let a clinician read
-- either — only the patient's own "read own profile" / "read own
-- conditions" policies existed. Scoped the same way every other
-- clinician-facing policy in this feature is: an active patient_links row
-- between the two ids, checked live, so a revoked link loses read access
-- immediately, not just in the UI.
create policy "linked clinician reads patient profile"
  on public.profiles for select
  to authenticated using (
    exists (
      select 1 from public.patient_links
      where patient_links.patient_id = profiles.id
        and patient_links.clinician_id = (select auth.uid())
        and patient_links.status = 'active'
    )
  );

create policy "linked clinician reads patient conditions"
  on public.user_conditions for select
  to authenticated using (
    exists (
      select 1 from public.patient_links
      where patient_links.patient_id = user_conditions.user_id
        and patient_links.clinician_id = (select auth.uid())
        and patient_links.status = 'active'
    )
  );
