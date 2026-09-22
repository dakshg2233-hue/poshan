-- Close the storage buckets, and give them the policies they never had.
--
-- 20260815_setup_extensions_and_storage.sql created two buckets and stopped
-- there. `avatars` was created public, which means every object in it is
-- readable by anyone holding the URL — no session, no account, no referrer
-- check. And neither bucket got a single row-level policy, so what a signed-in
-- user may upload, overwrite or delete was left to whatever the defaults
-- happened to be rather than to a decision anybody made.
--
-- Three things are wrong with that, in rising order of seriousness:
--
--   A profile photograph on a health app is personal data. A public bucket
--   makes it world-readable, and the object path begins with the user's own
--   uuid, so the URL leaks the account id alongside the face.
--
--   Without an owner policy, one user could overwrite or delete another
--   user's object. `upsert: true` in the upload route makes the overwrite
--   case a single request.
--
--   A public bucket with unrestricted upload is free anonymous file hosting.
--   Whatever is put there is served from Poshan's own domain, which is the
--   part that matters — a phishing page or a malware binary on poshan.co.in
--   is Poshan's reputation, not the uploader's.
--
-- The route-side half of this (file type, size, filename sanitisation, signed
-- URLs) is in src/app/api/storage/avatar/route.ts. Neither half is sufficient
-- alone: the policies below hold even if the route is bypassed, and the route
-- checks hold even for a bucket somebody later flips back to public.

-- ------------------------------------------------------------- private
--
-- Existing objects are unaffected in content; they simply stop being
-- retrievable without a signed URL. Nothing in the app reads these today —
-- no avatar_url column exists on profiles — so there is no fetch to update.
update storage.buckets set public = false where id = 'avatars';

-- `documents` was already private. Stated explicitly rather than assumed,
-- so a future edit to the bucket's row does not silently open it.
update storage.buckets set public = false where id = 'documents';

-- -------------------------------------------------- owner-only policies
--
-- Supabase stores the object key in storage.objects.name, and the upload
-- route writes it as `<user uuid>/<file>`. So the first path segment is the
-- owner, and (storage.foldername(name))[1] is the check.
--
-- Written as four separate policies rather than one FOR ALL, because the
-- four verbs genuinely differ: a user may read and write their own folder,
-- but "delete" is the one worth being able to revoke on its own later
-- without also taking away their ability to upload.

do $$
declare
  b text;
begin
  foreach b in array array['avatars', 'documents'] loop
    execute format($p$
      drop policy if exists "own folder read %1$s" on storage.objects;
      create policy "own folder read %1$s" on storage.objects for select
        using (
          bucket_id = %1$L
          and auth.uid() is not null
          and (storage.foldername(name))[1] = auth.uid()::text
        );

      drop policy if exists "own folder insert %1$s" on storage.objects;
      create policy "own folder insert %1$s" on storage.objects for insert
        with check (
          bucket_id = %1$L
          and auth.uid() is not null
          and (storage.foldername(name))[1] = auth.uid()::text
        );

      drop policy if exists "own folder update %1$s" on storage.objects;
      create policy "own folder update %1$s" on storage.objects for update
        using (
          bucket_id = %1$L
          and auth.uid() is not null
          and (storage.foldername(name))[1] = auth.uid()::text
        );

      drop policy if exists "own folder delete %1$s" on storage.objects;
      create policy "own folder delete %1$s" on storage.objects for delete
        using (
          bucket_id = %1$L
          and auth.uid() is not null
          and (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$, b);
  end loop;
end
$$;

-- The service role bypasses all of the above, which is what lets the account
-- deletion route in /api/account clear a departing user's objects. That is
-- the only code that should ever reach across folders.
