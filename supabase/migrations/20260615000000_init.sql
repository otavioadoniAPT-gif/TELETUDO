-- ============================================================
-- TeleTudo — schema inicial no Postgres (migração do SQLite)
-- ============================================================

-- ---------- Tabelas ----------

create table if not exists public.experts (
  id          bigint generated always as identity primary key,
  name        text not null,
  avatar_url  text,
  bot_token   text,
  chat_id     text,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.expert_chats (
  id         bigint generated always as identity primary key,
  expert_id  bigint not null references public.experts(id) on delete cascade,
  chat_id    text not null,
  chat_name  text,
  chat_type  text not null default 'group',
  active     boolean not null default true
);

create table if not exists public.scheduled_messages (
  id                       bigint generated always as identity primary key,
  expert_id                bigint not null references public.experts(id) on delete cascade,
  content_type             text not null,
  text_content             text,
  file_path                text,            -- caminho no bucket "media"
  file_name                text,
  link_url                 text,
  link_preview_title       text,
  link_preview_description text,
  scheduled_at             timestamptz,
  sent_at                  timestamptz,
  status                   text not null default 'pending',
  error_message            text,
  target_chats             jsonb,           -- array de chat_ids
  recurrence               text not null default 'none',
  parent_id                bigint,
  parse_mode               text not null default 'none',
  sticker_id               text,
  created_at               timestamptz not null default now()
);

create index if not exists idx_msgs_due
  on public.scheduled_messages (status, scheduled_at);
create index if not exists idx_msgs_expert
  on public.scheduled_messages (expert_id);
create index if not exists idx_chats_expert
  on public.expert_chats (expert_id);

-- ---------- Row Level Security ----------
-- App interno: qualquer usuário autenticado tem acesso total.
-- (a Edge Function usa a service_role e ignora RLS)

alter table public.experts            enable row level security;
alter table public.expert_chats       enable row level security;
alter table public.scheduled_messages enable row level security;

drop policy if exists "authenticated full access" on public.experts;
create policy "authenticated full access" on public.experts
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.expert_chats;
create policy "authenticated full access" on public.expert_chats
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated full access" on public.scheduled_messages;
create policy "authenticated full access" on public.scheduled_messages
  for all to authenticated using (true) with check (true);

-- ---------- Storage: bucket de mídia ----------
-- Público para leitura (o Telegram baixa os arquivos por URL).

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media authenticated write" on storage.objects;
create policy "media authenticated write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media');

drop policy if exists "media authenticated update" on storage.objects;
create policy "media authenticated update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media');

drop policy if exists "media authenticated delete" on storage.objects;
create policy "media authenticated delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media');

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select to public
  using (bucket_id = 'media');
