const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/dashboard/stats — total de experts, mensagens hoje, pendentes, falhas
router.get('/stats', (req, res) => {
  try {
    const totalExperts = db
      .prepare('SELECT COUNT(*) AS count FROM experts WHERE active = 1')
      .get().count;

    const sentToday = db
      .prepare(
        `SELECT COUNT(*) AS count FROM scheduled_messages
         WHERE status = 'sent' AND date(sent_at) = date('now')`
      )
      .get().count;

    const pending = db
      .prepare("SELECT COUNT(*) AS count FROM scheduled_messages WHERE status = 'pending'")
      .get().count;

    const failed = db
      .prepare("SELECT COUNT(*) AS count FROM scheduled_messages WHERE status = 'failed'")
      .get().count;

    // Próximos 10 agendamentos
    const upcoming = db
      .prepare(
        `SELECT m.*, e.name AS expert_name, e.avatar_url AS expert_avatar
         FROM scheduled_messages m
         JOIN experts e ON e.id = m.expert_id
         WHERE m.status = 'pending'
         ORDER BY m.scheduled_at ASC
         LIMIT 10`
      )
      .all();

    res.json({
      success: true,
      data: {
        totalExperts,
        sentToday,
        pending,
        failed,
        upcoming,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
