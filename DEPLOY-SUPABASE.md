# TeleTudo — Deploy (Supabase + Netlify, sem servidor próprio)

Toda a lógica do antigo backend Node foi migrada para o Supabase:

| Antes | Agora |
|-------|-------|
| SQLite | Postgres (Supabase) |
| `uploads/` em disco | Supabase Storage (bucket `media`) |
| `telegram.js` + `node-cron` | Edge Function `telegram` + `pg_cron` |
| Rotas Express | `supabase-js` direto do frontend |

Siga os passos na ordem.

---

## 1. Banco de dados e Storage

No painel do Supabase → **SQL Editor**, cole e rode o conteúdo de:

```
supabase/migrations/20260615000000_init.sql
```

Isso cria as tabelas (`experts`, `expert_chats`, `scheduled_messages`), as políticas
de segurança (RLS) e o bucket público `media`.

---

## 2. Edge Function `telegram`

Precisa do **Supabase CLI** instalado (`npm i -g supabase`).

```bash
# na raiz do projeto
supabase login                      # abre o navegador para autenticar
supabase link --project-ref gcvrwccjoddyuorksbwa

# Defina os secrets da função:
#  - CRON_SECRET: invente um valor secreto (use o MESMO no passo 3)
supabase secrets set CRON_SECRET="troque-por-um-segredo-forte"

# (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente)

# Publica a função
supabase functions deploy telegram
```

---

## 3. Agendador (pg_cron)

No **SQL Editor**, abra `supabase/migrations/20260615000100_cron.sql`,
**substitua `<<CRON_SECRET>>`** pelo mesmo valor do passo 2 e rode.

Isso agenda a função `telegram` para rodar **a cada minuto** e enviar as
mensagens pendentes vencidas.

> Conferir agendamento: `select * from cron.job;`
> Ver execuções: `select * from cron.job_run_details order by start_time desc limit 20;`

---

## 4. Autenticação (login)

Supabase → **Authentication → Providers → Email**: deixe habilitado.
Para testes sem confirmar e-mail, desligue "Confirm email".

Crie o primeiro usuário em **Authentication → Users → Add user**
(marque *Auto Confirm User*), ou pela tela "Criar conta" do app.

---

## 5. Frontend no Netlify

1. Conecte o repositório no Netlify (o `netlify.toml` já está configurado:
   base `frontend`, build `npm run build`, publish `dist`).
2. Em **Site settings → Environment variables**, defina:
   - `VITE_SUPABASE_URL` = `https://gcvrwccjoddyuorksbwa.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (a anon key do projeto)
3. Deploy.

---

## 6. Teste de ponta a ponta

1. Faça login no site publicado.
2. Crie um Expert (com Bot Token + Chat ID) e use **Enviar teste**.
3. Agende uma mensagem para daqui 1–2 minutos e confirme que chegou no Telegram.
4. No Supabase, confira `scheduled_messages.status` virando `sent`.

O backend Node em `backend/` não é mais necessário em produção — pode ficar
no repositório como referência ou ser removido.
