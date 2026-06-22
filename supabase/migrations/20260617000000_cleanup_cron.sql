-- ============================================================
-- Limpeza automática do histórico: apaga mensagens concluídas
-- (sent/failed) com mais de 24h. Roda de hora em hora chamando a
-- ação "cleanup" da Edge Function "telegram".
--
-- Substitua <<CRON_SECRET>> pelo mesmo valor usado no agendador.
-- ============================================================

select cron.unschedule('teletudo-cleanup')
where exists (select 1 from cron.job where jobname = 'teletudo-cleanup');

select cron.schedule(
  'teletudo-cleanup',
  '7 * * * *',  -- todo minuto 7 de cada hora
  $$
  select net.http_post(
    url     := 'https://gcvrwccjoddyuorksbwa.supabase.co/functions/v1/telegram',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<<CRON_SECRET>>'
    ),
    body    := jsonb_build_object('action', 'cleanup')
  );
  $$
);
