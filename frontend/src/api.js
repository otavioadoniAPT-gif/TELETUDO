// ============================================================
// Camada de dados do TeleTudo — agora 100% Supabase.
// Mantém a MESMA interface usada pelas páginas (experts, messages,
// dashboard), então nada nas telas precisou mudar.
// ============================================================
import { supabase } from './supabase';

const MEDIA_BUCKET = 'media';

// Lança erro do Supabase de forma padronizada
function check(error, msg) {
  if (error) throw new Error(error.message || msg || 'Erro no Supabase.');
}

// Converte "YYYY-MM-DDTHH:MM" (datetime-local, horário local do navegador)
// para ISO com timezone — para comparar corretamente com "agora" no banco.
function toIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Limites ISO de um dia (YYYY-MM-DD) no fuso local
function dayStart(date) {
  return new Date(`${date}T00:00:00`).toISOString();
}
function dayEnd(date) {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

const SELECT_WITH_EXPERT = '*, expert:experts(id, name, avatar_url)';

// ---------------- Experts ----------------
export const experts = {
  async list() {
    const { data, error } = await supabase
      .from('experts').select('*').order('created_at', { ascending: false });
    check(error);
    return data;
  },
  async get(id) {
    const { data, error } = await supabase.from('experts').select('*').eq('id', id).single();
    check(error, 'Expert não encontrado.');
    return data;
  },
  async create(payload) {
    const row = {
      name: (payload.name || '').trim(),
      avatar_url: payload.avatar_url || null,
      bot_token: payload.bot_token || null,
      chat_id: payload.chat_id || null,
      description: payload.description || null,
      active: payload.active === undefined ? true : !!payload.active,
    };
    if (!row.name) throw new Error('O nome é obrigatório.');
    const { data, error } = await supabase.from('experts').insert(row).select('*').single();
    check(error);
    return data;
  },
  async update(id, payload) {
    const row = {};
    ['name', 'avatar_url', 'bot_token', 'chat_id', 'description'].forEach((k) => {
      if (payload[k] !== undefined) row[k] = payload[k] || null;
    });
    if (payload.active !== undefined) row.active = !!payload.active;
    const { data, error } = await supabase
      .from('experts').update(row).eq('id', id).select('*').single();
    check(error);
    return data;
  },
  async remove(id) {
    const { error } = await supabase.from('experts').delete().eq('id', id);
    check(error);
    return { id: Number(id) };
  },
  async chats(id) {
    const { data, error } = await supabase
      .from('expert_chats').select('*').eq('expert_id', id).order('id', { ascending: true });
    check(error);
    return data;
  },
  async addChat(id, payload) {
    const chatId = String(payload.chat_id || '').trim();
    if (!chatId) throw new Error('O chat_id é obrigatório.');
    const { data, error } = await supabase.from('expert_chats').insert({
      expert_id: id,
      chat_id: chatId,
      chat_name: payload.chat_name || null,
      chat_type: payload.chat_type || 'group',
      active: payload.active === undefined ? true : !!payload.active,
    }).select('*').single();
    check(error);
    return data;
  },
  async removeChat(id, chatId) {
    const { error } = await supabase
      .from('expert_chats').delete().eq('id', chatId).eq('expert_id', id);
    check(error);
    return { id: Number(chatId) };
  },
  async test(id, chat_id) {
    const { data, error } = await supabase.functions.invoke('telegram', {
      body: { action: 'test', expert_id: id, ...(chat_id ? { chat_id } : {}) },
    });
    if (error) throw new Error(await readFnError(error));
    if (!data?.success) throw new Error(data?.error || 'Falha no envio de teste.');
    return data.data;
  },
};

// ---------------- Messages ----------------
export const messages = {
  async list(params = {}) {
    let q = supabase.from('scheduled_messages').select(SELECT_WITH_EXPERT)
      .order('scheduled_at', { ascending: false }).order('id', { ascending: false });
    if (params.expert_id) q = q.eq('expert_id', params.expert_id);
    if (params.status) q = q.eq('status', params.status);
    if (params.date) q = q.gte('scheduled_at', dayStart(params.date)).lte('scheduled_at', dayEnd(params.date));
    const { data, error } = await q;
    check(error);
    return data;
  },
  async get(id) {
    const { data, error } = await supabase
      .from('scheduled_messages').select(SELECT_WITH_EXPERT).eq('id', id).single();
    check(error, 'Mensagem não encontrada.');
    return data;
  },
  async history(params = {}) {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(params.perPage, 10) || 20));
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let q = supabase.from('scheduled_messages')
      .select(SELECT_WITH_EXPERT, { count: 'exact' })
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });
    if (params.expert_id) q = q.eq('expert_id', params.expert_id);
    if (params.status) q = q.eq('status', params.status);
    if (params.start_date) q = q.gte('scheduled_at', dayStart(params.start_date));
    if (params.end_date) q = q.lte('scheduled_at', dayEnd(params.end_date));

    const { data, error, count } = await q.range(from, to);
    check(error);
    const total = count || 0;
    return {
      items: data,
      pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    };
  },
  async create(formData) {
    // formData é um FormData (vindo do ScheduleNew). Extraímos os campos.
    const f = (k) => {
      const v = formData.get(k);
      return v === null || v === '' ? null : v;
    };
    const expert_id = f('expert_id');
    const content_type = f('content_type');
    if (!expert_id) throw new Error('expert_id é obrigatório.');

    const recurrence = f('recurrence') === 'daily' ? 'daily' : 'none';
    const parseModeRaw = f('parse_mode');
    const parse_mode = ['Markdown', 'HTML'].includes(parseModeRaw) ? parseModeRaw : 'none';
    const sendNowRaw = formData.get('send_now');
    const isSendNow = sendNowRaw === 'true' || sendNowRaw === true;
    const scheduledRaw = f('scheduled_at');

    // Upload de arquivo (photo/video/document)
    let file_path = null;
    let file_name = null;
    const file = formData.get('file');
    if (file && typeof file === 'object' && file.size) {
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${expert_id}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type || undefined });
      check(upErr, 'Falha ao enviar o arquivo.');
      file_path = path;
      file_name = file.name;
    }

    // target_chats -> array
    let target_chats = null;
    const tcRaw = formData.get('target_chats');
    if (tcRaw) {
      try {
        const parsed = typeof tcRaw === 'string' ? JSON.parse(tcRaw) : tcRaw;
        if (Array.isArray(parsed)) target_chats = parsed.map(String).filter(Boolean);
      } catch (_) {
        target_chats = [String(tcRaw)];
      }
    }

    const row = {
      expert_id,
      content_type,
      text_content: f('text_content'),
      file_path,
      file_name,
      link_url: f('link_url'),
      link_preview_title: f('link_preview_title'),
      link_preview_description: f('link_preview_description'),
      // envio único "agora" zera o horário; recorrência diária mantém
      scheduled_at: isSendNow && recurrence !== 'daily' ? null : toIso(scheduledRaw),
      status: 'pending',
      target_chats,
      recurrence,
      parse_mode,
      sticker_id: content_type === 'sticker' ? (f('sticker_id') || '').trim() : null,
    };

    const { data: created, error } = await supabase
      .from('scheduled_messages').insert(row).select('id').single();
    check(error);

    if (isSendNow) {
      await invokeSend(created.id);
    }
    return this.get(created.id);
  },
  async sendNow(id) {
    await invokeSend(id);
    return this.get(id);
  },
  async remove(id) {
    const { data: message, error: getErr } = await supabase
      .from('scheduled_messages').select('*').eq('id', id).single();
    check(getErr, 'Mensagem não encontrada.');
    if (message.status !== 'pending') {
      throw new Error('Apenas agendamentos pendentes podem ser cancelados.');
    }
    if (message.file_path) {
      const { count } = await supabase
        .from('scheduled_messages')
        .select('id', { count: 'exact', head: true })
        .eq('file_path', message.file_path).neq('id', id);
      if (!count) {
        await supabase.storage.from(MEDIA_BUCKET).remove([message.file_path]);
      }
    }
    const { error } = await supabase.from('scheduled_messages').delete().eq('id', id);
    check(error);
    return { id: Number(id) };
  },
};

// ---------------- Dashboard ----------------
export const dashboard = {
  async stats() {
    const todayStart = dayStart(new Date().toISOString().slice(0, 10));
    const [totalExperts, sentToday, pending, failed, upcoming] = await Promise.all([
      countRows('experts', (q) => q.eq('active', true)),
      countRows('scheduled_messages', (q) => q.eq('status', 'sent').gte('sent_at', todayStart)),
      countRows('scheduled_messages', (q) => q.eq('status', 'pending')),
      countRows('scheduled_messages', (q) => q.eq('status', 'failed')),
      supabase.from('scheduled_messages').select(SELECT_WITH_EXPERT)
        .eq('status', 'pending').order('scheduled_at', { ascending: true }).limit(10),
    ]);
    check(upcoming.error);
    return {
      totalExperts,
      sentToday,
      pending,
      failed,
      upcoming: (upcoming.data || []).map((m) => ({
        ...m,
        expert_name: m.expert?.name || null,
        expert_avatar: m.expert?.avatar_url || null,
      })),
    };
  },
};

// ---------------- helpers ----------------
async function countRows(table, build) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  q = build(q);
  const { count, error } = await q;
  check(error);
  return count || 0;
}

async function invokeSend(id) {
  const { data, error } = await supabase.functions.invoke('telegram', {
    body: { action: 'send-now', id },
  });
  if (error) throw new Error(await readFnError(error));
  if (!data?.success) throw new Error(data?.data?.error || data?.error || 'Falha ao enviar a mensagem.');
  return data;
}

// Extrai a mensagem de erro de uma FunctionsHttpError (corpo JSON do 4xx/5xx)
async function readFnError(error) {
  try {
    const body = await error.context?.json?.();
    return body?.error || body?.data?.error || error.message;
  } catch (_) {
    return error.message || 'Erro ao chamar a função.';
  }
}

export default { experts, messages, dashboard };
