-- 立替者は企画詳細で指定。精算自動作成時は finalized_by を null にする。
-- 精算開始（ensure_settlement）は精算管理者（企画者・立替者・管理者）が実行可。

create or replace function public.ensure_settlement(p_event_id uuid)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.settlements;
begin
  if not public.is_event_manager(p_event_id) then
    raise exception 'not allowed';
  end if;

  select * into v_row from public.settlements where event_id = p_event_id;
  if found then
    return v_row;
  end if;

  insert into public.settlements (event_id, finalized_by, status)
  values (p_event_id, null, 'collecting')
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.set_event_finalizer(
  p_event_id uuid,
  p_finalizer_id uuid
)
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

  if p_finalizer_id is not null
    and not exists (select 1 from public.profiles where id = p_finalizer_id)
  then
    raise exception 'invalid finalizer';
  end if;

  select * into v_row from public.settlements where event_id = p_event_id;
  if found then
    update public.settlements
    set finalized_by = p_finalizer_id
    where event_id = p_event_id
    returning * into v_row;
  else
    insert into public.settlements (event_id, finalized_by, status)
    values (p_event_id, p_finalizer_id, 'collecting')
    returning * into v_row;
  end if;

  return v_row;
end;
$$;
