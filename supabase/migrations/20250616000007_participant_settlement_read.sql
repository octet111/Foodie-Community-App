-- 参加者が自分の精算明細を settlements 結合なしで取得できる RPC
-- settlements の SELECT RLS と settlement_items の循環参照を避ける
create or replace function public.get_my_settlement_for_event(p_event_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settlement public.settlements%rowtype;
  v_item public.settlement_items%rowtype;
begin
  select * into v_settlement
  from public.settlements
  where event_id = p_event_id;

  if not found then
    return null;
  end if;

  select * into v_item
  from public.settlement_items
  where settlement_id = v_settlement.id
    and user_id = auth.uid();

  if not found then
    return null;
  end if;

  return json_build_object(
    'settlement', row_to_json(v_settlement),
    'item', row_to_json(v_item)
  );
end;
$$;

revoke all on function public.get_my_settlement_for_event(uuid) from public;
grant execute on function public.get_my_settlement_for_event(uuid) to authenticated;
