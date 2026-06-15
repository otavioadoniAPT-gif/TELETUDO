# TelegramManager

Sistema interno para gerenciar o envio e agendamento de mensagens no Telegram para **múltiplos experts**, cada um com seu próprio bot e múltiplos chats (grupos/canais).

## Funcionalidades

- Cadastro de experts com bot próprio (bot_token) e múltiplos chats vinculados
- Agendamento de mensagens: texto, foto, vídeo, arquivo e link formatado
- Envio imediato ou agendado (processado a cada minuto)
- Dashboard com métricas e próximos agendamentos
- Histórico paginado com filtros e detalhe de erros

## Stack

- **Backend:** Node.js + Express, SQLite (better-sqlite3), node-cron, node-telegram-bot-api, multer
- **Frontend:** React + Vite, React Router, axios

## Estrutura

```
/backend    → API REST + agendador (porta 3001)
/frontend   → painel React (porta 5173, com proxy para o backend)
```

---

## Instalação e execução

Pré-requisito: **Node.js 18+**.

### 1. Backend

```bash
cd backend
npm install
npm run seed      # (opcional) popula o banco com 2 experts de exemplo
npm run dev       # inicia em http://localhost:3001 com nodemon
```

O arquivo `.env` já vem configurado:

```
PORT=3001
DB_PATH=./data/db.sqlite
UPLOADS_PATH=./uploads
```

O banco SQLite e as tabelas são criados automaticamente na primeira execução.

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev       # inicia em http://localhost:5173
```

O Vite faz proxy de `/api` e `/uploads` para o backend, então basta acessar **http://localhost:5173**.

---

## Como obter o `bot_token` (BotFather)

1. No Telegram, abra uma conversa com [@BotFather](https://t.me/BotFather).
2. Envie `/newbot` e siga as instruções (nome e username do bot).
3. O BotFather devolve um **token** no formato `123456789:ABCdef...`. Esse é o `bot_token`.
4. Cadastre esse token ao criar/editar o expert no painel.

> Para enviar mensagens, o bot precisa **fazer parte do grupo/canal** (como membro ou administrador). Em canais, adicione o bot como administrador.

## Como obter o `chat_id` de grupos e canais

**Opção A — via @userinfobot / @getidsbot:**
1. Adicione [@getidsbot](https://t.me/getidsbot) (ou similar) ao grupo/canal.
2. Ele informa o ID. Grupos e canais costumam ter ID negativo, ex.: `-1001234567890`.

**Opção B — via API do seu bot:**
1. Adicione seu bot ao grupo/canal e envie qualquer mensagem lá.
2. Acesse no navegador:
   `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
3. Procure o campo `chat.id` na resposta JSON.

> Canais geralmente têm IDs começando com `-100`. Use esse valor completo no campo **Chat ID**.

---

## API

Todas as respostas seguem o formato:

```json
{ "success": true, "data": ... }
```
ou
```json
{ "success": false, "error": "mensagem" }
```

### Experts
- `GET /api/experts` — lista todos
- `GET /api/experts/:id` — detalhe
- `POST /api/experts` — cria
- `PUT /api/experts/:id` — edita
- `DELETE /api/experts/:id` — remove
- `GET /api/experts/:id/chats` — lista chats
- `POST /api/experts/:id/chats` — adiciona chat
- `DELETE /api/experts/:id/chats/:chatId` — remove chat

### Mensagens
- `GET /api/messages` — lista com filtros (`expert_id`, `status`, `date`)
- `GET /api/messages/history` — histórico paginado (`page`, `perPage`, `expert_id`, `status`, `start_date`, `end_date`)
- `POST /api/messages` — cria agendamento (`multipart/form-data`)
- `POST /api/messages/:id/send-now` — envia imediatamente
- `DELETE /api/messages/:id` — cancela agendamento pendente

### Dashboard
- `GET /api/dashboard/stats` — métricas e próximos 10 agendamentos

---

## Observações

- O agendador (`node-cron`) roda a cada minuto, busca mensagens `pending` com `scheduled_at <= agora` e dispara o envio. Ao iniciar o servidor, mensagens pendentes presas são reprocessadas.
- Uploads ficam em `/backend/uploads` (limite de 50MB por arquivo).
- Os experts de exemplo são criados **sem bot_token real** — servem apenas para visualizar o painel. Para enviar de verdade, configure um token válido.
