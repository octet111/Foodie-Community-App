-- AI企画ドラフト（既存 events 等には触れない）
create type draft_status as enum ('generated', 'adopted', 'discarded');

create table public.event_drafts (
  id               uuid primary key default gen_random_uuid(),
  created_by       uuid not null references public.profiles(id) on delete cascade,
  status           draft_status not null default 'generated',
  generation_phase text not null default 'concept',
  input_params     jsonb not null default '{}'::jsonb,
  concept_options  jsonb not null default '[]'::jsonb,
  selected_concept jsonb,
  title            text,
  description      text,
  shop_id          uuid references public.shops(id),
  parts            jsonb not null default '[]'::jsonb,
  model            text,
  raw_response     jsonb,
  adopted_event_id uuid references public.events(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.draft_shop_candidates (
  id         uuid primary key default gen_random_uuid(),
  draft_id   uuid not null references public.event_drafts(id) on delete cascade,
  shop_id    uuid not null references public.shops(id),
  reason     text,
  sort_order int not null default 1,
  unique (draft_id, shop_id)
);

create index idx_event_drafts_creator
  on public.event_drafts (created_by) where status = 'generated';

alter table public.event_drafts enable row level security;
alter table public.draft_shop_candidates enable row level security;

create policy "own drafts all" on public.event_drafts
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "candidates via parent" on public.draft_shop_candidates
  for all to authenticated
  using (
    exists (
      select 1 from public.event_drafts d
      where d.id = draft_id and d.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.event_drafts d
      where d.id = draft_id and d.created_by = auth.uid()
    )
  );

-- ドラフト採用（トランザクション内で events / event_parts / reminders を生成）
create or replace function public.adopt_event_draft(
  p_draft_id uuid,
  p_held_at timestamptz
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_draft public.event_drafts%rowtype;
  v_event_id uuid;
  v_part jsonb;
  v_sort int := 0;
begin
  select * into v_draft
  from public.event_drafts
  where id = p_draft_id
    and created_by = auth.uid()
    and status = 'generated'
  for update;

  if not found then
    raise exception 'draft not found or not adoptable';
  end if;

  if v_draft.shop_id is null or v_draft.title is null or trim(v_draft.title) = '' then
    raise exception 'draft missing required fields';
  end if;

  if p_held_at is null then
    raise exception 'held_at is required';
  end if;

  insert into public.events (
    shop_id, organizer_id, title, description, held_at, status
  ) values (
    v_draft.shop_id,
    auth.uid(),
    trim(v_draft.title),
    nullif(trim(coalesce(v_draft.description, '')), ''),
    p_held_at,
    'open'
  )
  returning id into v_event_id;

  for v_part in select * from jsonb_array_elements(v_draft.parts)
  loop
    v_sort := v_sort + 1;
    insert into public.event_parts (
      event_id, name, capacity, fee_estimate, sort_order
    ) values (
      v_event_id,
      v_part->>'name',
      (v_part->>'capacity')::int,
      coalesce((v_part->>'fee_estimate')::int, 0),
      coalesce((v_part->>'sort_order')::int, v_sort)
    );
  end loop;

  perform public.create_event_reminders(v_event_id);

  update public.event_drafts
  set
    status = 'adopted',
    adopted_event_id = v_event_id,
    generation_phase = 'done',
    updated_at = now()
  where id = p_draft_id;

  return v_event_id;
end;
$$;

revoke all on function public.adopt_event_draft(uuid, timestamptz) from public;
grant execute on function public.adopt_event_draft(uuid, timestamptz) to authenticated;
