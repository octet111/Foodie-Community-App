-- Default community settings row (single-record design)
insert into public.community_settings (name)
select '美食倶楽部'
where not exists (select 1 from public.community_settings);

-- Allow admin to create settings on fresh installs
create policy "cs_insert_admin"
  on public.community_settings
  for insert
  to authenticated
  with check (public.is_admin());
