-- 既存データをすべて公開にし、デフォルトも公開に変更
update public.stocks set is_private = false;

alter table public.stocks alter column is_private set default false;

comment on column public.stocks.is_private is 'true=自分だけ表示、false=コミュニティに公開（デフォルト公開）';
