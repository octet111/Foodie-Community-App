-- アプリ内通知（リマインド等）。insert は Edge Function（service role）のみ。
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  body       text not null,
  event_id   uuid references public.events(id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index idx_notifications_user_unread
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

create policy "notif_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy "notif_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid());
