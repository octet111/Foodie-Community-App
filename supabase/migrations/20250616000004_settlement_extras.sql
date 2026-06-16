-- パート別実額（JSON: { "event_part_id": amount }）
alter table public.settlements
  add column if not exists part_actuals jsonb not null default '{}'::jsonb;

-- 集金連絡用の振込先（管理者が community_settings で設定）
alter table public.community_settings
  add column if not exists transfer_info text;

-- 参加者が自分の明細がある精算ヘッダを参照できる
-- ※ settlement_items ポリシーとの循環参照を避けるため stl_select_participant は採用しない
--   参加者は settlement_items のみ参照（本人行の RLS で足りる）
