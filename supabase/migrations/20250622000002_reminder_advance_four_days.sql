-- 先行リマインドを前日から4日前に変更
create or replace function public.create_event_reminders(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_held_at timestamptz;
  v_organizer uuid;
  v_advance timestamptz;
  v_day_of timestamptz;
  v_advance_time time;
  v_of_time time;
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

  select
    coalesce(reminder_day_before_time, '18:00'::time),
    coalesce(reminder_day_of_time, '09:00'::time)
  into v_advance_time, v_of_time
  from public.community_settings
  limit 1;

  v_advance :=
    ((date_trunc('day', v_held_at at time zone 'Asia/Tokyo') - interval '4 days')
      + (extract(hour from v_advance_time) * interval '1 hour')
      + (extract(minute from v_advance_time) * interval '1 minute')
    ) at time zone 'Asia/Tokyo';

  v_day_of :=
    ((date_trunc('day', v_held_at at time zone 'Asia/Tokyo')
      + (extract(hour from v_of_time) * interval '1 hour')
      + (extract(minute from v_of_time) * interval '1 minute'))
    ) at time zone 'Asia/Tokyo';

  insert into public.reminders (event_id, remind_at, channel)
  values
    (p_event_id, v_advance, 'in_app'),
    (p_event_id, v_day_of, 'in_app');
end;
$$;
