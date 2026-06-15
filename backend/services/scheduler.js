const cron = require('node-cron');
const db = require('../db');
const telegram = require('./telegram');

// Resolve a lista de chats de destino para uma mensagem.
// Usa target_chats (JSON) se presente; senão cai para o chat_id padrão do expert.
function resolveTargetChats(message, expert) {
  let chats = [];
  if (message.target_chats) {
    try {
      const parsed = JSON.parse(message.target_chats);
      if (Array.isArray(parsed)) chats = parsed.filter(Boolean);
    } catch (_) {
      // ignora JSON inválido
    }
  }
  if (chats.length === 0 && expert.chat_id) {
    chats = [expert.chat_id];
  }
  return chats;
}

async function processMessage(message) {
  const expert = db.prepare('SELECT * FROM experts WHERE id = ?').get(message.expert_id);
  if (!expert) {
    throw new Error('Expert não encontrado para a mensagem.');
  }
  if (!expert.bot_token) {
    throw new Error('Expert sem bot_token configurado.');
  }

  const chats = resolveTargetChats(message, expert);
  if (chats.length === 0) {
    throw new Error('Nenhum chat de destino definido para a mensagem.');
  }

  const errors = [];
  for (const chatId of chats) {
    try {
      await telegram.dispatchMessage(expert, message, chatId);
    } catch (err) {
      const detail = err && err.response && err.response.body
        ? JSON.stringify(err.response.body)
        : err.message;
      errors.push(`Chat ${chatId}: ${detail}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' | '));
  }
}

// Cria a próxima ocorrência de uma mensagem recorrente diária.
// O novo registro fica pendente para o dia seguinte, no mesmo horário.
function scheduleNextOccurrence(message) {
  if (message.recurrence !== 'daily' || !message.scheduled_at) return;
  const next = db
    .prepare("SELECT datetime(?, '+1 day') AS next")
    .get(message.scheduled_at).next;
  db.prepare(
    `INSERT INTO scheduled_messages
       (expert_id, content_type, text_content, file_path, file_name,
        link_url, link_preview_title, link_preview_description,
        scheduled_at, status, target_chats, recurrence, parent_id, parse_mode, sticker_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'daily', ?, ?, ?)`
  ).run(
    message.expert_id,
    message.content_type,
    message.text_content,
    message.file_path,
    message.file_name,
    message.link_url,
    message.link_preview_title,
    message.link_preview_description,
    next,
    message.target_chats,
    message.parent_id || message.id,
    message.parse_mode || 'none',
    message.sticker_id || null
  );
}

// Envia uma mensagem agora e atualiza o status no banco
async function sendMessageNow(messageId) {
  const message = db.prepare('SELECT * FROM scheduled_messages WHERE id = ?').get(messageId);
  if (!message) {
    throw new Error('Mensagem não encontrada.');
  }
  try {
    await processMessage(message);
    db.prepare(
      `UPDATE scheduled_messages
       SET status = 'sent', sent_at = datetime('now'), error_message = NULL
       WHERE id = ?`
    ).run(messageId);
    return { status: 'sent' };
  } catch (err) {
    db.prepare(
      `UPDATE scheduled_messages
       SET status = 'failed', error_message = ?
       WHERE id = ?`
    ).run(err.message, messageId);
    return { status: 'failed', error: err.message };
  }
}

// Processa todas as mensagens pendentes vencidas
async function processDueMessages() {
  const due = db
    .prepare(
      `SELECT * FROM scheduled_messages
       WHERE status = 'pending'
         AND scheduled_at IS NOT NULL
         AND scheduled_at <= datetime('now')
       ORDER BY scheduled_at ASC`
    )
    .all();

  for (const message of due) {
    try {
      await processMessage(message);
      db.prepare(
        `UPDATE scheduled_messages
         SET status = 'sent', sent_at = datetime('now'), error_message = NULL
         WHERE id = ?`
      ).run(message.id);
      scheduleNextOccurrence(message);
      console.log(`[scheduler] Mensagem ${message.id} enviada com sucesso.`);
    } catch (err) {
      db.prepare(
        `UPDATE scheduled_messages
         SET status = 'failed', error_message = ?
         WHERE id = ?`
      ).run(err.message, message.id);
      // Mesmo em falha, mantém a série diária viva para o próximo dia
      scheduleNextOccurrence(message);
      console.error(`[scheduler] Falha ao enviar mensagem ${message.id}: ${err.message}`);
    }
  }
}

function start() {
  // Reprocessa mensagens pendentes presas ao iniciar o servidor
  processDueMessages().catch((err) =>
    console.error('[scheduler] Erro no reprocessamento inicial:', err.message)
  );

  // Roda a cada minuto
  cron.schedule('* * * * *', () => {
    processDueMessages().catch((err) =>
      console.error('[scheduler] Erro no ciclo do cron:', err.message)
    );
  });

  console.log('[scheduler] Agendador iniciado (executa a cada minuto).');
}

module.exports = { start, sendMessageNow, processDueMessages };
