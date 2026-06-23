-- ============================================================
-- Recorrência por dias do mês (ex.: dias 2, 15 e 21).
-- recurrence = 'monthdays' usa recurrence_days = [2,15,21].
-- ============================================================
alter table public.scheduled_messages
  add column if not exists recurrence_days jsonb;
