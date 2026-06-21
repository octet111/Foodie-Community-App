-- 精算開始時に企画を開催済へ。既存の精算付き企画も開催済に揃える。
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
    update public.events
    set status = 'held'
    where id = p_event_id
      and status in ('open', 'closed');
    return v_row;
  end if;

  insert into public.settlements (event_id, finalized_by, status)
  values (p_event_id, auth.uid(), 'collecting')
  returning * into v_row;

  update public.events
  set status = 'held'
  where id = p_event_id
    and status in ('open', 'closed');

  return v_row;
end;
$$;

update public.events e
set status = 'held'
from public.settlements s
where s.event_id = e.id
  and e.status in ('open', 'closed');
