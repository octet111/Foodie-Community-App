-- settlement_items ↔ settlements の RLS 循環参照を解消
drop policy if exists "stl_select_participant" on public.settlements;
