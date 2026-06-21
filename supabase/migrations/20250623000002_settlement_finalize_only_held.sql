-- 精算開始時の開催済化をやめ、精算確定時のみ開催済にする。
create or replace function public.ensure_settlement(p_event_id uuid)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.settlements;
begin
  if not (public.is_organizer(p_event_id) or public.is_admin()) then
    raise exception 'not allowed';
  end if;

  select * into v_row from public.settlements where event_id = p_event_id;
  if found then
    return v_row;
  end if;

  insert into public.settlements (event_id, finalized_by, status)
  values (p_event_id, auth.uid(), 'collecting')
  returning * into v_row;

  return v_row;
end;
$$;

-- 収集中の精算だけで開催済になっていた企画を締切に戻す
update public.events e
set status = 'closed'
from public.settlements s
where s.event_id = e.id
  and s.status = 'collecting'
  and e.status = 'held';

-- 精算確定済みの企画は開催済に揃える
update public.events e
set status = 'held'
from public.settlements s
where s.event_id = e.id
  and s.status = 'finalized'
  and e.status in ('open', 'closed');
