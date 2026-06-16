-- 企画者・管理者が精算画面から他人の参加表明を追加できる
create policy "ptc_insert_organizer" on public.participations
  for insert to authenticated
  with check (
    public.is_organizer((select event_id from event_parts where id = event_part_id))
    or public.is_admin()
  );
