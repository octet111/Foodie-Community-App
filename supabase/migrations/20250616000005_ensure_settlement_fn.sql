-- 企画者が精算レコードを確実に作成できる（1企画1精算）
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

revoke all on function public.ensure_settlement(uuid) from public;
grant execute on function public.ensure_settlement(uuid) to authenticated;
