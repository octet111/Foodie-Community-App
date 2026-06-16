-- ============================================================
-- RLSポリシー v1.0
-- 対応: 要件定義書 v1.1 §3.1 CRUD権限マトリクス
-- 方針: アプリ層(UI)＋DB層(RLS)の二層防御。RLSが最後の砦
-- ============================================================

-- ---------- ヘルパー関数 ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- その企画の企画者か
create or replace function public.is_organizer(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from events where id = eid and organizer_id = auth.uid());
$$;

-- その企画の立替者か（settlements.finalized_by）
create or replace function public.is_finalizer(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from settlements where event_id = eid and finalized_by = auth.uid());
$$;

-- 精算管理者（企画者 or 立替者 or 管理者）
create or replace function public.is_event_manager(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_organizer(eid) or public.is_finalizer(eid) or public.is_admin();
$$;

-- ---------- RLS有効化 ----------
alter table public.profiles           enable row level security;
alter table public.community_settings enable row level security;
alter table public.shops              enable row level security;
alter table public.stocks             enable row level security;
alter table public.secure_claims      enable row level security;
alter table public.events             enable row level security;
alter table public.event_parts        enable row level security;
alter table public.participations     enable row level security;
alter table public.settlements        enable row level security;
alter table public.settlement_items   enable row level security;
alter table public.reminders          enable row level security;
alter table public.comments           enable row level security;
alter table public.photos             enable row level security;

-- ============================================================
-- profiles: 全員R / 本人U(nickname) / 管理者U(role)
-- ============================================================
create policy "profiles_select_all"  on public.profiles for select to authenticated using (true);
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
  -- 本人はnickname変更可・role自己昇格は不可
create policy "profiles_update_admin" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- community_settings: 全員R / 管理者のみU
-- ============================================================
create policy "cs_select_all"   on public.community_settings for select to authenticated using (true);
create policy "cs_update_admin" on public.community_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- shops: 全員R・C / 登録者or管理者U / 管理者D
-- ============================================================
create policy "shops_select_all" on public.shops for select to authenticated using (true);
create policy "shops_insert_any" on public.shops for insert to authenticated
  with check (created_by = auth.uid());
create policy "shops_update_creator_admin" on public.shops for update to authenticated
  using (created_by = auth.uid() or public.is_admin());
create policy "shops_delete_admin" on public.shops for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- stocks: 本人のみCRUD / 管理者全件
-- ============================================================
create policy "stocks_all_own" on public.stocks for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- secure_claims: 全員R / 本人のみCUD / 管理者全件
-- ============================================================
create policy "claims_select_all" on public.secure_claims for select to authenticated using (true);
create policy "claims_insert_own" on public.secure_claims for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());
create policy "claims_update_own" on public.secure_claims for update to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "claims_delete_own" on public.secure_claims for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- events: 全員R(論理削除は非表示) / 全員C / 企画者・管理者U
-- 削除は論理削除（deleted_atのupdate）。物理DELETEは管理者のみ
-- ============================================================
create policy "events_select_visible" on public.events for select to authenticated
  using (deleted_at is null or organizer_id = auth.uid() or public.is_admin());
create policy "events_insert_any" on public.events for insert to authenticated
  with check (organizer_id = auth.uid());
create policy "events_update_organizer_admin" on public.events for update to authenticated
  using (organizer_id = auth.uid() or public.is_admin());
create policy "events_delete_admin" on public.events for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- event_parts: 全員R / 企画者・管理者CUD（企画編集に含む）
-- ============================================================
create policy "parts_select_all" on public.event_parts for select to authenticated using (true);
create policy "parts_cud_organizer" on public.event_parts for all to authenticated
  using (public.is_organizer(event_id) or public.is_admin())
  with check (public.is_organizer(event_id) or public.is_admin());

-- ============================================================
-- participations: 全員R / 本人C・D(締切前=アプリ層で制御)
-- 締切後の取消は企画者・管理者のみ（status更新含む）
-- ============================================================
create policy "ptc_select_all" on public.participations for select to authenticated using (true);
create policy "ptc_insert_own" on public.participations for insert to authenticated
  with check (user_id = auth.uid());
create policy "ptc_update_own_or_mgr" on public.participations for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_organizer((select event_id from event_parts where id = event_part_id))
    or public.is_admin()
  );
create policy "ptc_delete_own_or_mgr" on public.participations for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_organizer((select event_id from event_parts where id = event_part_id))
    or public.is_admin()
  );
-- 注: 「締切前のみ本人キャンセル可」の時間条件はアプリ層＋必要ならトリガで補強

-- ============================================================
-- settlements: 精算管理者(企画者/立替者/管理者)のみR・C・U
-- ============================================================
create policy "stl_select_manager" on public.settlements for select to authenticated
  using (public.is_event_manager(event_id));
create policy "stl_insert_organizer" on public.settlements for insert to authenticated
  with check (public.is_organizer(event_id) or public.is_admin());
create policy "stl_update_manager" on public.settlements for update to authenticated
  using (public.is_event_manager(event_id));
create policy "stl_delete_admin" on public.settlements for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- settlement_items: 本人R(自分の明細) + 精算管理者R全件
-- C・U・Dは精算管理者のみ。確定後のロックはトリガで強制
-- ============================================================
create policy "sti_select_own_or_manager" on public.settlement_items for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_event_manager((select event_id from settlements where id = settlement_id))
  );
create policy "sti_cud_manager" on public.settlement_items for all to authenticated
  using (public.is_event_manager((select event_id from settlements where id = settlement_id)))
  with check (public.is_event_manager((select event_id from settlements where id = settlement_id)));

-- 確定後ロック: status='finalized' の精算の明細は変更不可（確定取消で解除）
create or replace function public.block_finalized_items()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from settlements s
    where s.id = coalesce(new.settlement_id, old.settlement_id)
      and s.status = 'finalized'
  ) then
    raise exception 'settlement is finalized; unlock first（確定取消が必要です）';
  end if;
  return coalesce(new, old);
end $$;
create trigger trg_block_finalized
  before insert or update or delete on public.settlement_items
  for each row execute function public.block_finalized_items();

-- ============================================================
-- reminders: クライアント書込なし（service roleのみ）/ 管理者R
-- ============================================================
create policy "rem_select_admin" on public.reminders for select to authenticated
  using (public.is_admin());
-- insert/update はEdge Function（service role・RLSバイパス）が行う

-- ============================================================
-- comments: 全員R・C / 本人のみU / 本人D + 管理者D（U不可）
-- ============================================================
create policy "cmt_select_all" on public.comments for select to authenticated using (true);
create policy "cmt_insert_own" on public.comments for insert to authenticated
  with check (user_id = auth.uid());
create policy "cmt_update_own" on public.comments for update to authenticated
  using (user_id = auth.uid());          -- 管理者でも他人のコメントは編集不可
create policy "cmt_delete_own_or_admin" on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- photos（フェーズ2）: 全員R・C / 本人D + 企画者D(自企画) + 管理者D
-- ============================================================
create policy "ph_select_all" on public.photos for select to authenticated using (true);
create policy "ph_insert_own" on public.photos for insert to authenticated
  with check (user_id = auth.uid());
create policy "ph_delete_own_org_admin" on public.photos for delete to authenticated
  using (user_id = auth.uid() or public.is_organizer(event_id) or public.is_admin());
