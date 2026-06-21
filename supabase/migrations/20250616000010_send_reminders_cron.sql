-- pg_cron: send-reminders Edge Function を毎時0分（JSTの :00 と一致）に発火
-- 初回適用後、Supabase Vault に cron 用シークレットを登録すること（README 参照）

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 既存ジョブがあれば削除して再登録
do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-reminders-hourly') then
    perform cron.unschedule('send-reminders-hourly');
  end if;
end $$;

-- Vault シークレット名:
--   send_reminders_function_url  … https://<project-ref>.supabase.co/functions/v1/send-reminders
--   send_reminders_cron_secret   … Edge Function の CRON_SECRET と同一値
select cron.schedule(
  'send-reminders-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'send_reminders_function_url' limit 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'send_reminders_cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);
