-- ============================================================
-- Templates de Mensagem — captura via bot (webhook) e reúso
-- preservando custom emojis animados (entities).
-- ============================================================

create table if not exists public.message_templates (
  id            bigint generated always as identity primary key,
  name          text,                       -- nulo/empty = rascunho recém-capturado
  content_type  text not null,              -- text | photo | video | document
  text_content  text,                       -- texto ou caption original
  entities_json jsonb not null default '[]'::jsonb,  -- MessageEntity[] (offsets UTF-16)
  file_path     text,                       -- cópia da mídia no bucket "media" (templates/...)
  file_name     text,
  mime_type     text,
  status        text not null default 'rascunho',    -- rascunho | salvo
  created_at    timestamptz not null default now()
);

create index if not exists idx_templates_status
  on public.message_templates (status, created_at desc);

alter table public.message_templates enable row level security;

drop policy if exists "authenticated full access" on public.message_templates;
create policy "authenticated full access" on public.message_templates
  for all to authenticated using (true) with check (true);

-- A Edge Function de captura (service_role) insere os rascunhos; o painel
-- (authenticated) lê/edita. Leitura pública não é necessária.

-- ---------- Integração com o agendamento ----------
alter table public.scheduled_messages
  add column if not exists template_id bigint references public.message_templates(id) on delete set null;
alter table public.scheduled_messages
  add column if not exists entities_json jsonb;
