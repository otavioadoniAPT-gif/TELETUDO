const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || './data/db.sqlite';
const absoluteDbPath = path.resolve(process.cwd(), DB_PATH);

// Garante que o diretório do banco existe
const dbDir = path.dirname(absoluteDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(absoluteDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS experts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar_url TEXT,
      bot_token TEXT,
      chat_id TEXT,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expert_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expert_id INTEGER NOT NULL,
      chat_id TEXT NOT NULL,
      chat_name TEXT,
      chat_type TEXT NOT NULL DEFAULT 'group',
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expert_id INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      text_content TEXT,
      file_path TEXT,
      file_name TEXT,
      link_url TEXT,
      link_preview_title TEXT,
      link_preview_description TEXT,
      scheduled_at TEXT,
      sent_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      target_chats TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (expert_id) REFERENCES experts(id) ON DELETE CASCADE
    );
  `);
}

// Migrações leves: adiciona colunas novas se ainda não existirem
function runMigrations() {
  const cols = db.prepare("PRAGMA table_info(scheduled_messages)").all().map((c) => c.name);
  if (!cols.includes('recurrence')) {
    db.exec("ALTER TABLE scheduled_messages ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none'");
  }
  if (!cols.includes('parent_id')) {
    db.exec('ALTER TABLE scheduled_messages ADD COLUMN parent_id INTEGER');
  }
  if (!cols.includes('parse_mode')) {
    db.exec("ALTER TABLE scheduled_messages ADD COLUMN parse_mode TEXT NOT NULL DEFAULT 'none'");
  }
  if (!cols.includes('sticker_id')) {
    db.exec('ALTER TABLE scheduled_messages ADD COLUMN sticker_id TEXT');
  }
}

initSchema();
runMigrations();

module.exports = db;
