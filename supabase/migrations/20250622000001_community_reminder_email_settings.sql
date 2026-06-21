-- リマインド時刻デフォルト・メールテンプレート（community_settings 拡張）
alter table public.community_settings
  add column if not exists reminder_day_before_time time not null default '18:00',
  add column if not exists reminder_day_of_time time not null default '09:00',
  add column if not exists email_reminder_subject_template text,
  add column if not exists email_reminder_body_template text;

-- 企画公開時のリマインド生成: community_settings の時刻を参照
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
  v_before_time time;
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
  into v_before_time, v_of_time
  from public.community_settings
  limit 1;

  v_day_before :=
    ((date_trunc('day', v_held_at at time zone 'Asia/Tokyo') - interval '1 day')
      + (extract(hour from v_before_time) * interval '1 hour')
      + (extract(minute from v_before_time) * interval '1 minute')
    ) at time zone 'Asia/Tokyo';

  v_day_of :=
    ((date_trunc('day', v_held_at at time zone 'Asia/Tokyo')
      + (extract(hour from v_of_time) * interval '1 hour')
      + (extract(minute from v_of_time) * interval '1 minute'))
    ) at time zone 'Asia/Tokyo';

  insert into public.reminders (event_id, remind_at, channel)
  values
    (p_event_id, v_day_before, 'in_app'),
    (p_event_id, v_day_of, 'in_app');
end;
$$;
