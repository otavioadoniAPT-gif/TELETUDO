const express = require('express');
const db = require('../db');
const telegram = require('../services/telegram');

const router = express.Router();

// GET /api/experts — lista todos
router.get('/', (req, res) => {
  try {
    const experts = db
      .prepare('SELECT * FROM experts ORDER BY created_at DESC')
      .all();
    res.json({ success: true, data: experts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/experts/:id — detalhe
router.get('/:id', (req, res) => {
  try {
    const expert = db.prepare('SELECT * FROM experts WHERE id = ?').get(req.params.id);
    if (!expert) {
      return res.status(404).json({ success: false, error: 'Expert não encontrado.' });
    }
    res.json({ success: true, data: expert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/experts — cria novo
router.post('/', (req, res) => {
  try {
    const { name, avatar_url, bot_token, chat_id, description, active } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'O nome é obrigatório.' });
    }
    const info = db
      .prepare(
        `INSERT INTO experts (name, avatar_url, bot_token, chat_id, description, active)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        name.trim(),
        avatar_url || null,
        bot_token || null,
        chat_id || null,
        description || null,
        active === undefined ? 1 : active ? 1 : 0
      );
    const expert = db.prepare('SELECT * FROM experts WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: expert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/experts/:id — edita
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM experts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expert não encontrado.' });
    }
    const { name, avatar_url, bot_token, chat_id, description, active } = req.body;
    db.prepare(
      `UPDATE experts
       SET name = ?, avatar_url = ?, bot_token = ?, chat_id = ?, description = ?, active = ?
       WHERE id = ?`
    ).run(
      name !== undefined ? name : existing.name,
      avatar_url !== undefined ? avatar_url : existing.avatar_url,
      bot_token !== undefined ? bot_token : existing.bot_token,
      chat_id !== undefined ? chat_id : existing.chat_id,
      description !== undefined ? description : existing.description,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      req.params.id
    );
    const expert = db.prepare('SELECT * FROM experts WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: expert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/experts/:id — remove
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM experts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expert não encontrado.' });
    }
    db.prepare('DELETE FROM experts WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/experts/:id/test — envia uma mensagem de teste imediata
router.post('/:id/test', async (req, res) => {
  try {
    const expert = db.prepare('SELECT * FROM experts WHERE id = ?').get(req.params.id);
    if (!expert) {
      return res.status(404).json({ success: false, error: 'Expert não encontrado.' });
    }
    if (!expert.bot_token) {
      return res
        .status(400)
        .json({ success: false, error: 'Este expert não tem um Bot Token configurado.' });
    }
    const chatId = (req.body && req.body.chat_id) || expert.chat_id;
    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, error: 'Nenhum chat informado e o expert não tem Chat ID padrão.' });
    }

    try {
      await telegram.sendText(
        expert.bot_token,
        chatId,
        '✅ <b>Mensagem de teste</b>\nEnvio configurado com sucesso no TelegramManager.'
      );
      return res.json({ success: true, data: { chat_id: chatId } });
    } catch (sendErr) {
      // Extrai a descrição amigável do erro do Telegram, quando disponível
      const tgDesc =
        sendErr && sendErr.response && sendErr.response.body && sendErr.response.body.description;
      return res.status(502).json({ success: false, error: tgDesc || sendErr.message });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/experts/:id/chats — lista chats do expert
router.get('/:id/chats', (req, res) => {
  try {
    const chats = db
      .prepare('SELECT * FROM expert_chats WHERE expert_id = ? ORDER BY id ASC')
      .all(req.params.id);
    res.json({ success: true, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/experts/:id/chats — adiciona chat ao expert
router.post('/:id/chats', (req, res) => {
  try {
    const expert = db.prepare('SELECT * FROM experts WHERE id = ?').get(req.params.id);
    if (!expert) {
      return res.status(404).json({ success: false, error: 'Expert não encontrado.' });
    }
    const { chat_id, chat_name, chat_type, active } = req.body;
    if (!chat_id || !String(chat_id).trim()) {
      return res.status(400).json({ success: false, error: 'O chat_id é obrigatório.' });
    }
    const info = db
      .prepare(
        `INSERT INTO expert_chats (expert_id, chat_id, chat_name, chat_type, active)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        req.params.id,
        String(chat_id).trim(),
        chat_name || null,
        chat_type || 'group',
        active === undefined ? 1 : active ? 1 : 0
      );
    const chat = db.prepare('SELECT * FROM expert_chats WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: chat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/experts/:id/chats/:chatId — remove chat do expert
router.delete('/:id/chats/:chatId', (req, res) => {
  try {
    db.prepare('DELETE FROM expert_chats WHERE id = ? AND expert_id = ?').run(
      req.params.chatId,
      req.params.id
    );
    res.json({ success: true, data: { id: Number(req.params.chatId) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
