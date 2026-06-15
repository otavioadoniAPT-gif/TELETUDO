require('dotenv').config();
const db = require('./db');

// Popula o banco com 2 experts de exemplo (sem bot_token real)
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM experts').get().count;
  if (count > 0) {
    console.log('[seed] Banco já possui experts. Nada a fazer.');
    return;
  }

  const insertExpert = db.prepare(
    `INSERT INTO experts (name, avatar_url, bot_token, chat_id, description, active)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertChat = db.prepare(
    `INSERT INTO expert_chats (expert_id, chat_id, chat_name, chat_type, active)
     VALUES (?, ?, ?, ?, ?)`
  );

  const trader = insertExpert.run(
    'Carlos Trader',
    null,
    null, // sem bot_token real
    '-1001111111111',
    'Especialista em day trade e análise técnica. Sinais diários.',
    1
  );
  insertChat.run(trader.lastInsertRowid, '-1001111111111', 'Sinais VIP', 'channel', 1);
  insertChat.run(trader.lastInsertRowid, '-1002222222222', 'Grupo de Alunos', 'group', 1);

  const cripto = insertExpert.run(
    'Ana Cripto',
    null,
    null, // sem bot_token real
    '-1003333333333',
    'Análises de criptomoedas, DeFi e novidades do mercado.',
    1
  );
  insertChat.run(cripto.lastInsertRowid, '-1003333333333', 'Cripto News', 'channel', 1);

  console.log('[seed] 2 experts de exemplo criados com sucesso.');
}

try {
  seed();
} catch (err) {
  console.error('[seed] Erro ao popular o banco:', err.message);
  process.exit(1);
}
