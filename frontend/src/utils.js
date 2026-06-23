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

// Quebra um texto em segmentos marcando os custom emojis (que o painel web
// não renderiza). Offsets vêm em UTF-16, que é exatamente como o JS indexa
// strings — então slice() funciona direto. Retorna [{type:'text'|'emoji', value}].
export function previewSegments(text = '', entities = []) {
  const ce = (entities || [])
    .filter((e) => e.type === 'custom_emoji')
    .sort((a, b) => a.offset - b.offset);
  if (!text) return [];
  if (!ce.length) return [{ type: 'text', value: text }];
  const segs = [];
  let cur = 0;
  for (const e of ce) {
    if (e.offset > cur) segs.push({ type: 'text', value: text.slice(cur, e.offset) });
    segs.push({ type: 'emoji', value: text.slice(e.offset, e.offset + e.length) });
    cur = e.offset + e.length;
  }
  if (cur < text.length) segs.push({ type: 'text', value: text.slice(cur) });
  return segs;
}

// Dada uma lista de dias do mês e um horário "HH:MM", retorna a próxima
// ocorrência futura no formato do datetime-local ("YYYY-MM-DDTHH:MM"), local.
export function firstMonthdayOccurrence(days, time) {
  if (!days || !days.length || !time) return '';
  const [h, m] = time.split(':').map(Number);
  const sorted = [...new Set(days)].filter((d) => d >= 1 && d <= 31).sort((a, b) => a - b);
  const now = new Date();
  let y = now.getFullYear();
  let mo = now.getMonth();
  const pad = (n) => String(n).padStart(2, '0');
  for (let i = 0; i < 14; i++) {
    const dim = new Date(y, mo + 1, 0).getDate();
    for (const d of sorted) {
      if (d > dim) continue;
      const cand = new Date(y, mo, d, h, m, 0, 0);
      if (cand.getTime() > now.getTime()) {
        return `${cand.getFullYear()}-${pad(cand.getMonth() + 1)}-${pad(cand.getDate())}T${pad(h)}:${pad(m)}`;
      }
    }
    mo++;
    if (mo > 11) { mo = 0; y++; }
  }
  return '';
}

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Próxima ocorrência futura dado um conjunto de dias da semana (0=Dom..6=Sáb)
// e um horário "HH:MM". Retorna no formato datetime-local local.
export function firstWeekdayOccurrence(weekdays, time) {
  if (!weekdays || !weekdays.length || !time) return '';
  const [h, m] = time.split(':').map(Number);
  const set = [...new Set(weekdays)];
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m, 0, 0);
    if (d.getTime() > now.getTime() && set.includes(d.getDay())) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`;
    }
  }
  return '';
}

export function truncate(str = '', n = 60) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}
