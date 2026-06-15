const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { upload } = require('../middleware/upload');
const scheduler = require('../services/scheduler');

const router = express.Router();

const VALID_TYPES = ['text', 'photo', 'video', 'document', 'link', 'sticker'];
const VALID_PARSE_MODES = ['none', 'Markdown', 'HTML'];

// Normaliza para o formato do SQLite "YYYY-MM-DD HH:MM:SS".
// Aceita "YYYY-MM-DDTHH:MM" (datetime-local) garantindo comparação correta com datetime('now').
function normalizeScheduledAt(value) {
  if (!value) return value;
  let v = String(value).trim().replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) v += ':00'; // adiciona segundos
  return v;
}

// Normaliza um registro de mensagem juntando dados do expert
function withExpert(message) {
  if (!message) return message;
  const expert = db
    .prepare('SELECT id, name, avatar_url FROM experts WHERE id = ?')
    .get(message.expert_id);
  return { ...message, expert: expert || null };
}

// GET /api/messages — lista com filtros (expert_id, status, data)
router.get('/', (req, res) => {
  try {
    const { expert_id, status, date } = req.query;
    const clauses = [];
    const params = [];
    if (expert_id) {
      clauses.push('expert_id = ?');
      params.push(expert_id);
    }
    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }
    if (date) {
      clauses.push("date(scheduled_at) = date(?)");
      params.push(date);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM scheduled_messages ${where} ORDER BY scheduled_at DESC, id DESC`)
      .all(...params);
    res.json({ success: true, data: rows.map(withExpert) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/messages/history — histórico paginado
router.get('/history', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage, 10) || 20));
    const offset = (page - 1) * perPage;

    const { expert_id, status, start_date, end_date } = req.query;
    const clauses = [];
    const params = [];
    if (expert_id) {
      clauses.push('expert_id = ?');
      params.push(expert_id);
    }
    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }
    if (start_date) {
      clauses.push("date(scheduled_at) >= date(?)");
      params.push(start_date);
    }
    if (end_date) {
      clauses.push("date(scheduled_at) <= date(?)");
      params.push(end_date);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const total = db
      .prepare(`SELECT COUNT(*) AS count FROM scheduled_messages ${where}`)
      .get(...params).count;

    const rows = db
      .prepare(
        `SELECT * FROM scheduled_messages ${where}
         ORDER BY COALESCE(scheduled_at, created_at) DESC, id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, perPage, offset);

    res.json({
      success: true,
      data: {
        items: rows.map(withExpert),
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/messages/:id — detalhe
router.get('/:id', (req, res) => {
  try {
    const message = db
      .prepare('SELECT * FROM scheduled_messages WHERE id = ?')
      .get(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Mensagem não encontrada.' });
    }
    res.json({ success: true, data: withExpert(message) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/messages — cria agendamento (multipart/form-data para suportar upload)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const {
      expert_id,
      content_type,
      text_content,
      link_url,
      link_preview_title,
      link_preview_description,
      scheduled_at,
      target_chats,
      send_now,
      recurrence,
      sticker_id,
      parse_mode,
    } = req.body;

    const normalizedRecurrence = recurrence === 'daily' ? 'daily' : 'none';
    const normalizedParseMode = VALID_PARSE_MODES.includes(parse_mode) ? parse_mode : 'none';

    if (!expert_id) {
      return res.status(400).json({ success: false, error: 'expert_id é obrigatório.' });
    }
    if (!VALID_TYPES.includes(content_type)) {
      return res
        .status(400)
        .json({ success: false, error: `content_type inválido. Use: ${VALID_TYPES.join(', ')}` });
    }
    const expert = db.prepare('SELECT * FROM experts WHERE id = ?').get(expert_id);
    if (!expert) {
      return res.status(404).json({ success: false, error: 'Expert não encontrado.' });
    }

    // Validações específicas por tipo
    if (content_type === 'text' && (!text_content || !text_content.trim())) {
      return res.status(400).json({ success: false, error: 'O texto é obrigatório.' });
    }
    if (['photo', 'video', 'document'].includes(content_type) && !req.file) {
      return res.status(400).json({ success: false, error: 'É necessário enviar um arquivo.' });
    }
    if (content_type === 'link' && (!link_url || !link_url.trim())) {
      return res.status(400).json({ success: false, error: 'A URL do link é obrigatória.' });
    }
    if (content_type === 'sticker' && (!sticker_id || !sticker_id.trim())) {
      return res
        .status(400)
        .json({ success: false, error: 'O file_id da figurinha é obrigatório.' });
    }

    const isSendNow = send_now === 'true' || send_now === true;
    if (!isSendNow && (!scheduled_at || !scheduled_at.trim())) {
      return res
        .status(400)
        .json({ success: false, error: 'Informe a data de envio ou marque "Enviar agora".' });
    }
    // Recorrência diária exige um horário base — não pode ser apenas "enviar agora"
    if (normalizedRecurrence === 'daily' && (!scheduled_at || !scheduled_at.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Para repetir diariamente, defina a data/hora do primeiro envio.',
      });
    }

    // Normaliza chats de destino (array JSON)
    let normalizedTargets = null;
    if (target_chats) {
      try {
        const parsed = typeof target_chats === 'string' ? JSON.parse(target_chats) : target_chats;
        if (Array.isArray(parsed)) {
          normalizedTargets = JSON.stringify(parsed.map(String).filter(Boolean));
        }
      } catch (_) {
        // se vier como string única, trata como um único chat
        normalizedTargets = JSON.stringify([String(target_chats)]);
      }
    }

    const filePath = req.file ? req.file.path : null;
    const fileName = req.file ? req.file.originalname : null;

    const info = db
      .prepare(
        `INSERT INTO scheduled_messages
          (expert_id, content_type, text_content, file_path, file_name,
           link_url, link_preview_title, link_preview_description,
           scheduled_at, status, target_chats, recurrence, parse_mode, sticker_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
      )
      .run(
        expert_id,
        content_type,
        text_content || null,
        filePath,
        fileName,
        link_url || null,
        link_preview_title || null,
        link_preview_description || null,
        // recorrência mantém o horário; envio único "agora" zera o scheduled_at
        isSendNow && normalizedRecurrence !== 'daily'
          ? null
          : normalizeScheduledAt(scheduled_at),
        normalizedTargets,
        normalizedRecurrence,
        normalizedParseMode,
        content_type === 'sticker' ? sticker_id.trim() : null
      );

    const messageId = info.lastInsertRowid;

    if (isSendNow) {
      const result = await scheduler.sendMessageNow(messageId);
      const message = db.prepare('SELECT * FROM scheduled_messages WHERE id = ?').get(messageId);
      if (result.status === 'failed') {
        return res
          .status(502)
          .json({ success: false, error: result.error, data: withExpert(message) });
      }
      return res.status(201).json({ success: true, data: withExpert(message) });
    }

    const message = db.prepare('SELECT * FROM scheduled_messages WHERE id = ?').get(messageId);
    res.status(201).json({ success: true, data: withExpert(message) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/messages/:id/send-now — envia imediatamente
router.post('/:id/send-now', async (req, res) => {
  try {
    const message = db.prepare('SELECT * FROM scheduled_messages WHERE id = ?').get(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Mensagem não encontrada.' });
    }
    const result = await scheduler.sendMessageNow(req.params.id);
    const updated = db.prepare('SELECT * FROM scheduled_messages WHERE id = ?').get(req.params.id);
    if (result.status === 'failed') {
      return res
        .status(502)
        .json({ success: false, error: result.error, data: withExpert(updated) });
    }
    res.json({ success: true, data: withExpert(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/messages/:id — cancela agendamento pendente
router.delete('/:id', (req, res) => {
  try {
    const message = db.prepare('SELECT * FROM scheduled_messages WHERE id = ?').get(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Mensagem não encontrada.' });
    }
    if (message.status !== 'pending') {
      return res
        .status(400)
        .json({ success: false, error: 'Apenas agendamentos pendentes podem ser cancelados.' });
    }
    // Remove arquivo associado apenas se nenhuma outra mensagem o utiliza
    // (ocorrências recorrentes compartilham o mesmo arquivo)
    const otherRefs = message.file_path
      ? db
          .prepare('SELECT COUNT(*) AS c FROM scheduled_messages WHERE file_path = ? AND id != ?')
          .get(message.file_path, message.id).c
      : 0;
    if (message.file_path && otherRefs === 0 && fs.existsSync(message.file_path)) {
      try {
        fs.unlinkSync(message.file_path);
      } catch (_) {
        /* ignora erro de remoção de arquivo */
      }
    }
    db.prepare('DELETE FROM scheduled_messages WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
