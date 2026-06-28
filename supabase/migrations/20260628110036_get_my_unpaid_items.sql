-- マイページの未払い一覧: settlements の SELECT RLS を回避して本人の未払明細を返す
create or replace function public.get_my_unpaid_items()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce(
    (
      select json_agg(
        json_build_object(
          'eventId', e.id,
          'eventTitle', e.title,
          'amount', si.amount
        )
        order by e.title
      )
      from public.settlement_items si
      join public.settlements s on s.id = si.settlement_id
      join public.events e on e.id = s.event_id
      where si.user_id = auth.uid()
        and si.paid = false
        and e.deleted_at is null
    ),
    '[]'::json
  );
end;
$$;

revoke all on function public.get_my_unpaid_items() from public;
grant execute on function public.get_my_unpaid_items() to authenticated;
