-- Close two ways a minor could consent on their own behalf.
--
-- DPDP s.9(1) says a child's data is not processed until a guardian has
-- verifiably consented. Poshan's check (in /api/daily and /api/family) is
-- a parental_consents row with verified_at set. Only the guardian was
-- meant to be able to set it, by opening the emailed link. Two things let
-- anyone else set it.
--
-- 1. The insert policy checked who owned the row and nothing else. A
--    signed-in minor, or the adult who added a child as a family member,
--    could POST straight to PostgREST with the anon key and their own
--    session:
--      insert into parental_consents (..., verified_at) values (..., now())
--    and the plan was built. The server route never sets verified_at on
--    insert, so requiring it null costs the real flow nothing.
--
-- 2. The select policy returned the whole row to the minor, including
--    verification_token, which is the secret in the guardian's link. With
--    a real guardian email on file, the minor could still read the token
--    and open /guardian-consent/<token> themselves. The column is now
--    withheld from signed-in users. The routes that need it (the email
--    send and the guardian's page) use the service role, which is not
--    affected by this grant.

drop policy if exists "create own parental consent" on public.parental_consents;
create policy "create own parental consent"
  on public.parental_consents for insert
  with check (
    (
      auth.uid() = minor_user_id
      or exists (
        select 1 from public.family_members fm
        where fm.id = parental_consents.family_member_id
          and fm.account_id = auth.uid()
      )
    )
    -- Born unverified and unrevoked. Only the guardian's round trip,
    -- through the service role, moves it on from here.
    and verified_at is null
    and revoked_at is null
    and verification_method = 'email_token'
  );

revoke select on public.parental_consents from anon, authenticated;
grant select (
  id, minor_user_id, family_member_id,
  guardian_name, guardian_email, guardian_phone, guardian_relationship,
  verification_method, token_expires_at, verified_at, revoked_at,
  notice_version, notice_lang, created_at
) on public.parental_consents to authenticated;
