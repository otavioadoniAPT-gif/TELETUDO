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

---

## 7. Templates de Mensagem (captura com emojis animados)

Permite capturar mensagens prontas do Telegram (com **custom emojis animados**,
formatação e mídia) e reutilizá-las no agendamento. Como cada expert usa um bot
diferente, a mídia é guardada no Storage e reenviada por URL (funciona em qualquer
bot); os emojis animados são preservados via `entities`/`caption_entities`.

> **Requisito:** a conta dona precisa ser **Telegram Premium** e os custom emojis
> devem vir de pacotes acessíveis (criados via @Stickers, link `t.me/addemoji`).

### 7.1 Criar o bot de captura
1. No Telegram, fale com **@BotFather** → `/newbot` → escolha nome e username.
2. Copie o **token** do bot (formato `123456:ABC...`).

### 7.2 Definir os secrets e publicar
```bash
supabase secrets set CAPTURE_BOT_TOKEN="SEU_TOKEN_DO_BOT_DE_CAPTURA" --project-ref gcvrwccjoddyuorksbwa
# CAPTURE_WEBHOOK_SECRET já foi definido no deploy; se precisar trocar:
# supabase secrets set CAPTURE_WEBHOOK_SECRET="um-segredo-forte" --project-ref gcvrwccjoddyuorksbwa
supabase functions deploy capture --project-ref gcvrwccjoddyuorksbwa
```

### 7.3 Registrar o webhook no Telegram
Aponte o bot de captura para a Edge Function (use o MESMO valor de `CAPTURE_WEBHOOK_SECRET`):
```bash
curl "https://api.telegram.org/bot<CAPTURE_BOT_TOKEN>/setWebhook?url=https://gcvrwccjoddyuorksbwa.supabase.co/functions/v1/capture&secret_token=<CAPTURE_WEBHOOK_SECRET>"
```

### 7.4 Usar
1. No frontend, defina `VITE_CAPTURE_BOT_USERNAME=@SeuBotDeCaptura` (aparece nas instruções).
2. No Telegram, **encaminhe** a mensagem pronta para o bot de captura.
3. No painel → aba **Templates** → ela aparece em *Rascunhos*. Dê um nome e salve.
4. Em **Novo Agendamento** (ou botão "Usar" do template), escolha **um ou vários experts**
   e agende. Cada expert reenvia pelo seu bot, mantendo os emojis animados.

**Observação sobre mídia:** por usarem bots diferentes, todo arquivo é reenviado a
partir da cópia no Storage (não por `file_id`) — um pouco mais lento, porém confiável.
Se um custom emoji estiver inacessível ou a mídia não puder ser lida, a mensagem é
marcada como **falha** no Histórico com o erro claro.
