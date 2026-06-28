-- shops: 登録者も自分の店を削除できるようにする（管理者は従来どおり）
drop policy if exists "shops_delete_admin" on public.shops;
create policy "shops_delete_creator_admin" on public.shops for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
