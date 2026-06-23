-- stocks に非公開フラグを追加（デフォルト公開）
alter table public.stocks
  add column is_private boolean not null default false;

comment on column public.stocks.is_private is 'true=自分だけ表示、false=コミュニティに公開（デフォルト公開）';

-- RLS: 本人のストックは全件、他者のストックは is_private=false のみ閲覧可
drop policy if exists "stocks_all_own" on public.stocks;

create policy "stocks_select_own_or_public" on public.stocks
  for select to authenticated
  using (user_id = auth.uid() or is_private = false or public.is_admin());

create policy "stocks_insert_own" on public.stocks
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy "stocks_update_own" on public.stocks
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "stocks_delete_own" on public.stocks
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
