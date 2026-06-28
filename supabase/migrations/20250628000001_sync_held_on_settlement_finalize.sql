-- 精算確定済み企画の status を held に揃える（実績リストは events.status = held で全員参照可能）
update public.events e
set status = 'held'
from public.settlements s
where s.event_id = e.id
  and s.status = 'finalized'
  and e.deleted_at is null
  and e.status in ('open', 'closed');

-- settlements の確定/取消に合わせて events.status を同期（アプリ層と二重で保証）
create or replace function public.sync_event_status_on_settlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finalized' and old.status is distinct from 'finalized' then
    update public.events
    set status = 'held'
    where id = new.event_id
      and status in ('open', 'closed');
  elsif new.status = 'collecting' and old.status = 'finalized' then
    update public.events
    set status = 'closed'
    where id = new.event_id
      and status = 'held';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_event_on_settlement on public.settlements;
create trigger trg_sync_event_on_settlement
  after update of status on public.settlements
  for each row
  execute function public.sync_event_status_on_settlement();
