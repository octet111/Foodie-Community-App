-- 企画公開時にリマインド2行を生成（RLSバイパス・企画者のみ実行可）
create or replace function public.create_event_reminders(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_held_at timestamptz;
  v_organizer uuid;
  v_day_before timestamptz;
  v_day_of timestamptz;
begin
  select held_at, organizer_id
    into v_held_at, v_organizer
  from public.events
  where id = p_event_id and deleted_at is null;

  if v_held_at is null then
    raise exception 'event not found';
  end if;

  if v_organizer <> auth.uid() and not public.is_admin() then
    raise exception 'not allowed';
  end if;

  v_day_before :=
    ((date_trunc('day', v_held_at at time zone 'Asia/Tokyo') - interval '1 day')
      + interval '18 hours') at time zone 'Asia/Tokyo';

  v_day_of :=
    ((date_trunc('day', v_held_at at time zone 'Asia/Tokyo')
      + interval '9 hours') at time zone 'Asia/Tokyo');

  insert into public.reminders (event_id, remind_at, channel)
  values
    (p_event_id, v_day_before, 'in_app'),
    (p_event_id, v_day_of, 'in_app');
end;
$$;

revoke all on function public.create_event_reminders(uuid) from public;
grant execute on function public.create_event_reminders(uuid) to authenticated;
