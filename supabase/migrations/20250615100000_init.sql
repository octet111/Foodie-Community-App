-- ============================================================
-- フーディコミュニティ運営アプリ スキーマ DDL v1.0
-- 対応: 要件定義書 v1.1 §6 データモデル
-- 前提: Supabase（auth.users と profiles を連携）
-- ============================================================

-- ---------- ENUM ----------
create type user_role          as enum ('member','admin');
create type shop_rarity        as enum ('walk_in','reservable','referral_only','months_wait','members_only');
create type claim_type         as enum ('regular','acquaintance','referral','membership','other');
create type event_status       as enum ('open','closed','held','archived');
create type participation_status as enum ('joined','cancelled');
create type settlement_status  as enum ('collecting','finalized');
create type reminder_channel   as enum ('in_app','email');

-- ---------- profiles（メンバー）※auth.usersと1:1 ----------
-- 要件のusersテーブルに相当。emailはauth.users側で管理（非公開要件を自然に満たす）
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nickname   text not null,                -- ニックネーム（公開表示名）
  role       user_role not null default 'member',
  created_at timestamptz not null default now()
);

-- ---------- community_settings（コミュニティ設定）----------
create table public.community_settings (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                -- コミュニティ名
  logo_path  text,                         -- ロゴ（Storage パス）
  updated_at timestamptz not null default now()
);
-- 単一レコード運用（将来の汎用化時にコミュニティマスタへ拡張）

-- ---------- shops（店）----------
create table public.shops (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,           -- 店名
  url             text,                    -- 店リンク（食べログ/Google Maps/主要グルメサイト）
  ogp_image_url   text,                    -- OGP画像URL（自動取得）
  image_path      text,                    -- 手動アップロード画像（OGP失敗時の代替）
  ogp_description text,                    -- OGP説明文
  area            text,                    -- エリア
  rarity          shop_rarity not null default 'reservable',  -- 予約難易度
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now()
);

-- ---------- stocks（行きたい店ストック）----------
create table public.stocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  shop_id    uuid not null references public.shops(id) on delete cascade,
  memo       text,
  created_at timestamptz not null default now(),
  unique (user_id, shop_id)
);

-- ---------- secure_claims（確保宣言）----------
create table public.secure_claims (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,  -- コネ保有者
  shop_id    uuid not null references public.shops(id) on delete cascade,
  claim_type claim_type not null default 'other',   -- コネ種別
  note       text,                                  -- 「平日なら」「4名まで」等
  created_at timestamptz not null default now(),
  unique (user_id, shop_id)
);

-- ---------- events（企画）----------
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops(id),
  organizer_id uuid not null references public.profiles(id),  -- 企画者
  title        text not null,
  description  text,                       -- 企画説明（プレーンテキスト・改行のみ）
  held_at      timestamptz not null,       -- 開催日時
  location     text,
  status       event_status not null default 'open',
  deleted_at   timestamptz,                -- 論理削除（参加・精算データは保持）
  created_at   timestamptz not null default now()
);

-- ---------- event_parts（参加パート）----------
create table public.event_parts (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  name         text not null,              -- 一次会 / 二次会 / 三次会…
  capacity     int  not null check (capacity > 0),
  fee_estimate int  not null default 0 check (fee_estimate >= 0),  -- 想定費用（円）
  sort_order   int  not null default 1
);

-- ---------- participations（参加表明）----------
create table public.participations (
  id            uuid primary key default gen_random_uuid(),
  event_part_id uuid not null references public.event_parts(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        participation_status not null default 'joined',
  joined_at     timestamptz not null default now(),
  unique (event_part_id, user_id)
);

-- ---------- settlements（精算）※1企画1精算 ----------
create table public.settlements (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null unique references public.events(id) on delete cascade,  -- unique = 1企画1精算
  finalized_by    uuid references public.profiles(id),  -- 立替者（精算管理の追加権限者）
  status          settlement_status not null default 'collecting',
  total_collected int not null default 0,   -- 集金合計（切り上げ後）
  actual_amount   int not null default 0,   -- 実額
  surplus         int generated always as (total_collected - actual_amount) stored,  -- 差分（おつり・幹事預かり）
  created_at      timestamptz not null default now()
);

-- ---------- settlement_items（精算明細）----------
create table public.settlement_items (
  id            uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),
  amount        int not null check (amount >= 0),  -- 請求額（パート合算・円単位切り上げ）
  paid          boolean not null default false,
  paid_at       timestamptz,
  adjusted_by   uuid references public.profiles(id),  -- 金額を上書き調整した人
  unique (settlement_id, user_id)
);

-- ---------- reminders（リマインド）----------
create table public.reminders (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references public.events(id) on delete cascade,
  remind_at timestamptz not null,           -- 前日・当日の2回分を企画公開時に生成
  channel   reminder_channel not null,
  sent_at   timestamptz
);

-- ---------- comments（企画へのコメント）----------
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- photos（アルバム写真・フェーズ2）----------
create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- ---------- インデックス（最小限・小規模前提のためFK検索のみ）----------
create index idx_events_held_at        on public.events (held_at) where deleted_at is null;
create index idx_participations_user   on public.participations (user_id);
create index idx_reminders_unsent      on public.reminders (remind_at) where sent_at is null;
