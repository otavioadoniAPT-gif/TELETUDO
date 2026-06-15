const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

// Cache de instâncias de bot por token, evita recriar a cada envio
const botCache = new Map();

function getBot(botToken) {
  if (!botToken) {
    throw new Error('Expert sem bot_token configurado.');
  }
  if (botCache.has(botToken)) {
    return botCache.get(botToken);
  }
  // polling:false — usamos o bot apenas para enviar mensagens
  const bot = new TelegramBot(botToken, { polling: false });
  botCache.set(botToken, bot);
  return bot;
}

// Converte o modo de formatação escolhido pelo usuário nas opções do Telegram.
// 'none' (padrão) NÃO define parse_mode -> envia o texto literalmente,
// permitindo qualquer caractere especial sem quebrar a mensagem.
function parseModeOptions(parseMode) {
  if (parseMode === 'Markdown') return { parse_mode: 'Markdown' };
  if (parseMode === 'HTML') return { parse_mode: 'HTML' };
  return {};
}

async function sendText(botToken, chatId, text, parseMode = 'none', options = {}) {
  const bot = getBot(botToken);
  return bot.sendMessage(chatId, text, { ...parseModeOptions(parseMode), ...options });
}

async function sendPhoto(botToken, chatId, filePath, caption = '', parseMode = 'none') {
  const bot = getBot(botToken);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  return bot.sendPhoto(chatId, fs.createReadStream(filePath), {
    caption: caption || undefined,
    ...parseModeOptions(parseMode),
  });
}

async function sendVideo(botToken, chatId, filePath, caption = '', parseMode = 'none') {
  const bot = getBot(botToken);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  return bot.sendVideo(chatId, fs.createReadStream(filePath), {
    caption: caption || undefined,
    ...parseModeOptions(parseMode),
  });
}

async function sendDocument(botToken, chatId, filePath, caption = '', parseMode = 'none') {
  const bot = getBot(botToken);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  return bot.sendDocument(chatId, fs.createReadStream(filePath), {
    caption: caption || undefined,
    ...parseModeOptions(parseMode),
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Envia um link como mensagem de texto formatada com título e descrição
async function sendLink(botToken, chatId, { url, title, description, extraText }) {
  const bot = getBot(botToken);
  const parts = [];
  if (title) parts.push(`<b>${escapeHtml(title)}</b>`);
  if (description) parts.push(escapeHtml(description));
  if (extraText) parts.push(escapeHtml(extraText));
  parts.push(`<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
  const message = parts.join('\n\n');
  return bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

// Envia uma figurinha (sticker) pelo seu file_id. Funciona com figurinhas
// animadas (.tgs/.webm) e estáticas (.webp).
async function sendSticker(botToken, chatId, fileId) {
  const bot = getBot(botToken);
  if (!fileId) throw new Error('file_id da figurinha não informado.');
  return bot.sendSticker(chatId, fileId);
}

// Dispara uma mensagem agendada para um chat específico
async function dispatchMessage(expert, message, chatId) {
  const { bot_token } = expert;
  const parseMode = message.parse_mode || 'none';
  switch (message.content_type) {
    case 'text':
      return sendText(bot_token, chatId, message.text_content || '', parseMode);
    case 'sticker':
      return sendSticker(bot_token, chatId, message.sticker_id);
    case 'photo':
      return sendPhoto(bot_token, chatId, message.file_path, message.text_content || '', parseMode);
    case 'video':
      return sendVideo(bot_token, chatId, message.file_path, message.text_content || '', parseMode);
    case 'document':
      return sendDocument(bot_token, chatId, message.file_path, message.text_content || '', parseMode);
    case 'link':
      return sendLink(bot_token, chatId, {
        url: message.link_url,
        title: message.link_preview_title,
        description: message.link_preview_description,
        extraText: message.text_content,
      });
    default:
      throw new Error(`Tipo de conteúdo desconhecido: ${message.content_type}`);
  }
}

module.exports = {
  getBot,
  sendText,
  sendPhoto,
  sendVideo,
  sendDocument,
  sendLink,
  sendSticker,
  dispatchMessage,
};
