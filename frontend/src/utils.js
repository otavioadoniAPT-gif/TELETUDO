export const CONTENT_TYPE_LABELS = {
  text: 'Texto',
  photo: 'Foto',
  video: 'Vídeo',
  document: 'Arquivo',
  link: 'Link',
  sticker: 'Figurinha',
};

export const CONTENT_TYPE_ICONS = {
  text: '📝',
  photo: '🖼️',
  video: '🎬',
  document: '📎',
  link: '🔗',
  sticker: '🎟️',
};

export function formatDateTime(value) {
  if (!value) return '—';
  // SQLite datetime vem em UTC ("YYYY-MM-DD HH:MM:SS")
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Converte o valor de um <input type="datetime-local"> (horário LOCAL, sem fuso)
// para o formato UTC que o SQLite usa: "YYYY-MM-DD HH:MM:SS"
export function toUtcSqlite(localValue) {
  if (!localValue) return localValue;
  const d = new Date(localValue); // interpretado como horário local do navegador
  if (isNaN(d.getTime())) return localValue;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Converte um timestamp (ISO ou formato SQLite) para o valor aceito por
// <input type="datetime-local"> ("YYYY-MM-DDTHH:MM"), no horário LOCAL.
export function toLocalInput(value) {
  if (!value) return '';
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function contentPreview(msg) {
  if (!msg) return '';
  if (msg.content_type === 'link') return msg.link_url || msg.link_preview_title || 'Link';
  if (msg.content_type === 'sticker') return msg.sticker_id || 'Figurinha';
  if (msg.content_type === 'text') return msg.text_content || '';
  return msg.file_name || msg.text_content || CONTENT_TYPE_LABELS[msg.content_type] || '';
}

export function truncate(str = '', n = 60) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}
