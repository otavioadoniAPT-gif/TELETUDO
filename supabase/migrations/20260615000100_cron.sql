-- ============================================================
-- Agendador: pg_cron chama a Edge Function "telegram" a cada minuto.
--
-- ANTES DE RODAR, substitua os dois valores abaixo:
--   <<CRON_SECRET>>  -> um segredo qualquer que você inventar
--                       (o MESMO valor deve ser definido como secret
--                        CRON_SECRET da Edge Function — ver DEPLOY-SUPABASE.md)
-- O domínio do projeto (gcvrwccjoddyuorksbwa) já está preenchido.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento anterior, se existir (evita duplicar ao rodar de novo)
select cron.unschedule('teletudo-dispatch')
where exists (select 1 from cron.job where jobname = 'teletudo-dispatch');

select cron.schedule(
  'teletudo-dispatch',
  '* * * * *',  -- a cada minuto
  $$
  select net.http_post(
    url     := 'https://gcvrwccjoddyuorksbwa.supabase.co/functions/v1/telegram',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<<CRON_SECRET>>'
    ),
    body    := jsonb_build_object('action', 'cron')
  );
  $$
);
