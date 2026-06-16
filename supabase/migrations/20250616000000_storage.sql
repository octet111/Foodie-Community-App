-- Storage buckets for shop images, community assets, and event photos

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'shop-images',
    'shop-images',
    true,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  ),
  (
    'community',
    'community',
    true,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  ),
  (
    'event-photos',
    'event-photos',
    false,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do nothing;

-- shop-images: 公開読み取り / 認証ユーザーの自分フォルダへの書き込み
create policy "shop_images_public_read"
  on storage.objects for select
  using (bucket_id = 'shop-images');

create policy "shop_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shop-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "shop_images_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'shop-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "shop_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'shop-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- community: 公開読み取り / 管理者のみ書き込み
create policy "community_public_read"
  on storage.objects for select
  using (bucket_id = 'community');

create policy "community_admin_write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'community' and public.is_admin());

create policy "community_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'community' and public.is_admin());

create policy "community_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'community' and public.is_admin());

-- event-photos: 認証ユーザーのみ読み書き（本人フォルダ）
create policy "event_photos_read_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'event-photos');

create policy "event_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "event_photos_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "event_photos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
