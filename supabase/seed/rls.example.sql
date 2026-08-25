-- Example policies. Review before applying (not part of automatic migrations).
-- The items table already has RLS enabled.
--
-- Apply manually after auth model is decided:
--   npx supabase db query --linked -f supabase/seed/rls.example.sql
-- or paste into the SQL editor.

-- Members may only read/write their own profile item.
-- Assumes pk = 'MEMBER#' || auth.uid()::text and sk = 'PROFILE'.

create policy items_member_own_profile
  on public.items
  for all
  to authenticated
  using (
    pk = 'MEMBER#' || auth.uid()::text
    and sk = 'PROFILE'
  )
  with check (
    pk = 'MEMBER#' || auth.uid()::text
    and sk = 'PROFILE'
  );

-- Staff: JWT app_metadata.role = 'admin' (set in Supabase Auth).
create policy items_admin_all
  on public.items
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
