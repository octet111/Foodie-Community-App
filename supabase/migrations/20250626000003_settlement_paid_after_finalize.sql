-- 精算確定後も支払チェック（paid / paid_at）のみ更新可能にする
create or replace function public.block_finalized_items()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_finalized boolean;
begin
  if tg_op = 'DELETE' then
    select (s.status = 'finalized') into v_finalized
    from public.settlements s
    where s.id = old.settlement_id;

    if v_finalized then
      raise exception 'settlement is finalized; unlock first（確定取消が必要です）';
    end if;

    return old;
  end if;

  select (s.status = 'finalized') into v_finalized
  from public.settlements s
  where s.id = new.settlement_id;

  if v_finalized then
    if tg_op = 'INSERT' then
      raise exception 'settlement is finalized; unlock first（確定取消が必要です）';
    end if;

    -- UPDATE: 支払フラグのみ変更を許可
    if (
      new.id = old.id
      and new.settlement_id = old.settlement_id
      and new.user_id = old.user_id
      and new.amount = old.amount
      and new.adjusted_by is not distinct from old.adjusted_by
    ) then
      return new;
    end if;

    raise exception 'settlement is finalized; unlock first（確定取消が必要です）';
  end if;

  return new;
end;
$$;
