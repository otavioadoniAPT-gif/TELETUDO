// ============================================================
// TeleTudo — Edge Function "telegram"
// Substitui o backend Node (scheduler.js + telegram.js).
//
// Ações (campo "action" no corpo JSON):
//   - "cron"      : processa todas as mensagens pendentes vencidas
//                   (chamada pelo pg_cron; exige header x-cron-secret)
//   - "send-now"  : envia uma mensagem já existente { id }
//   - "test"      : envia mensagem de teste { expert_id, chat_id? }
//
// "send-now" e "test" exigem um usuário autenticado (Bearer JWT).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TG = (token: string, method: string) =>
  `https://api.telegram.org/bot${token}/${method}`;

// Pausa entre envios para suavizar rajadas (anti-flood preventivo).
const PACE_MS = 350;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseModeOptions(mode?: string) {
  if (mode === "Markdown") return { parse_mode: "Markdown" };
  if (mode === "HTML") return { parse_mode: "HTML" };
  return {};
}

function publicUrl(filePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/media/${filePath}`;
}

function escapeHtml(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function callTelegram(
  token: string,
  method: string,
  payload: Record<string, unknown>,
  attempt = 0,
): Promise<any> {
  const res = await fetch(TG(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));

  // Telegram pediu para esperar (flood control): respeita retry_after e tenta de novo.
  const retryAfter = body?.parameters?.retry_after;
  if ((res.status === 429 || retryAfter) && attempt < 3) {
    await sleep(((retryAfter ?? 1) * 1000) + 250);
    return callTelegram(token, method, payload, attempt + 1);
  }

  if (!res.ok || body.ok === false) {
    throw new Error(body.description || `Telegram respondeu ${res.status}`);
  }
  return body;
}

// Resolve os chats de destino: target_chats (jsonb) ou o chat_id padrão do expert.
function resolveTargetChats(message: any, expert: any): string[] {
  let chats: string[] = [];
  if (Array.isArray(message.target_chats)) {
    chats = message.target_chats.map(String).filter(Boolean);
  }
  if (chats.length === 0 && expert.chat_id) chats = [expert.chat_id];
  return chats;
}

// Envio a partir de um Template: preserva custom emojis animados via
// entities / caption_entities. NUNCA usa parse_mode junto.
async function dispatchTemplate(token: string, chatId: string, tpl: any) {
  const entities = Array.isArray(tpl.entities_json) ? tpl.entities_json : [];
  const caption = tpl.text_content || "";
  const hasCaption = caption.length > 0;
  switch (tpl.content_type) {
    case "text":
      return callTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: caption,
        entities,
        disable_web_page_preview: true,
      });
    case "photo":
      return callTelegram(token, "sendPhoto", {
        chat_id: chatId, photo: publicUrl(tpl.file_path),
        ...(hasCaption ? { caption, caption_entities: entities } : {}),
      });
    case "video":
      return callTelegram(token, "sendVideo", {
        chat_id: chatId, video: publicUrl(tpl.file_path),
        ...(hasCaption ? { caption, caption_entities: entities } : {}),
      });
    case "document":
      return callTelegram(token, "sendDocument", {
        chat_id: chatId, document: publicUrl(tpl.file_path),
        ...(hasCaption ? { caption, caption_entities: entities } : {}),
      });
    default:
      throw new Error(`Tipo de template desconhecido: ${tpl.content_type}`);
  }
}

async function dispatchToChat(expert: any, message: any, chatId: string, tpl?: any) {
  if (tpl) return dispatchTemplate(expert.bot_token, chatId, tpl);
  const token = expert.bot_token;
  const mode = message.parse_mode || "none";
  const caption = message.text_content || "";
  switch (message.content_type) {
    case "text":
      return callTelegram(token, "sendMessage", {
        chat_id: chatId,
        text: message.text_content || "",
        disable_web_page_preview: true,
        ...parseModeOptions(mode),
      });
    case "sticker":
      return callTelegram(token, "sendSticker", { chat_id: chatId, sticker: message.sticker_id });
    case "photo":
      return callTelegram(token, "sendPhoto", {
        chat_id: chatId, photo: publicUrl(message.file_path),
        caption: caption || undefined, ...parseModeOptions(mode),
      });
    case "video":
      return callTelegram(token, "sendVideo", {
        chat_id: chatId, video: publicUrl(message.file_path),
        caption: caption || undefined, ...parseModeOptions(mode),
      });
    case "document":
      return callTelegram(token, "sendDocument", {
        chat_id: chatId, document: publicUrl(message.file_path),
        caption: caption || undefined, ...parseModeOptions(mode),
      });
    case "link": {
      const parts: string[] = [];
      if (message.link_preview_title) parts.push(`<b>${escapeHtml(message.link_preview_title)}</b>`);
      if (message.link_preview_description) parts.push(escapeHtml(message.link_preview_description));
      if (message.text_content) parts.push(escapeHtml(message.text_content));
      parts.push(`<a href="${escapeHtml(message.link_url)}">${escapeHtml(message.link_url)}</a>`);
      return callTelegram(token, "sendMessage", {
        chat_id: chatId, text: parts.join("\n\n"), parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    }
    default:
      throw new Error(`Tipo de conteúdo desconhecido: ${message.content_type}`);
  }
}

async function processMessage(message: any) {
  const { data: expert } = await admin
    .from("experts").select("*").eq("id", message.expert_id).single();
  if (!expert) throw new Error("Expert não encontrado para a mensagem.");
  if (!expert.bot_token) throw new Error("Expert sem bot_token configurado.");

  // Se a mensagem usa um template, carrega-o (fonte única do conteúdo).
  let tpl: any = null;
  if (message.template_id) {
    const { data } = await admin
      .from("message_templates").select("*").eq("id", message.template_id).single();
    if (!data) throw new Error("Template não encontrado.");
    tpl = data;
  }

  const chats = resolveTargetChats(message, expert);
  if (chats.length === 0) throw new Error("Nenhum chat de destino definido para a mensagem.");

  const errors: string[] = [];
  for (let i = 0; i < chats.length; i++) {
    const chatId = chats[i];
    try {
      await dispatchToChat(expert, message, chatId, tpl);
    } catch (err) {
      errors.push(`Chat ${chatId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (i < chats.length - 1) await sleep(PACE_MS); // suaviza envios ao mesmo expert
  }
  if (errors.length > 0) throw new Error(errors.join(" | "));
}

// Cria a próxima ocorrência diária de uma mensagem recorrente.
async function scheduleNextOccurrence(message: any) {
  if (message.recurrence !== "daily" || !message.scheduled_at) return;
  const next = new Date(new Date(message.scheduled_at).getTime() + 24 * 60 * 60 * 1000);
  await admin.from("scheduled_messages").insert({
    expert_id: message.expert_id,
    content_type: message.content_type,
    text_content: message.text_content,
    file_path: message.file_path,
    file_name: message.file_name,
    link_url: message.link_url,
    link_preview_title: message.link_preview_title,
    link_preview_description: message.link_preview_description,
    scheduled_at: next.toISOString(),
    status: "pending",
    target_chats: message.target_chats,
    recurrence: "daily",
    parent_id: message.parent_id || message.id,
    parse_mode: message.parse_mode || "none",
    sticker_id: message.sticker_id || null,
  });
}

async function sendOne(message: any) {
  try {
    await processMessage(message);
    await admin.from("scheduled_messages")
      .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
      .eq("id", message.id);
    await scheduleNextOccurrence(message);
    return { id: message.id, status: "sent" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("scheduled_messages")
      .update({ status: "failed", error_message: msg })
      .eq("id", message.id);
    await scheduleNextOccurrence(message);
    return { id: message.id, status: "failed", error: msg };
  }
}

async function processDueMessages() {
  const { data: due } = await admin
    .from("scheduled_messages")
    .select("*")
    .eq("status", "pending")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });
  const results = [];
  const list = due ?? [];
  for (let i = 0; i < list.length; i++) {
    results.push(await sendOne(list[i]));
    if (i < list.length - 1) await sleep(PACE_MS); // suaviza entre mensagens diferentes
  }
  return results;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);
  try {
    const payload = await req.json().catch(() => ({}));
    const action = payload.action;

    if (action === "cron") {
      if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
        return json({ success: false, error: "Não autorizado." }, 401);
      }
      const results = await processDueMessages();
      return json({ success: true, processed: results.length, results });
    }

    // send-now / test exigem usuário autenticado
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData?.user) return json({ success: false, error: "Não autenticado." }, 401);

    if (action === "send-now") {
      const { data: message } = await admin
        .from("scheduled_messages").select("*").eq("id", payload.id).single();
      if (!message) return json({ success: false, error: "Mensagem não encontrada." }, 404);
      const result = await sendOne(message);
      return json({ success: result.status === "sent", data: result }, result.status === "sent" ? 200 : 502);
    }

    if (action === "test") {
      const { data: expert } = await admin
        .from("experts").select("*").eq("id", payload.expert_id).single();
      if (!expert) return json({ success: false, error: "Expert não encontrado." }, 404);
      if (!expert.bot_token) return json({ success: false, error: "Expert sem Bot Token configurado." }, 400);
      const chatId = payload.chat_id || expert.chat_id;
      if (!chatId) return json({ success: false, error: "Nenhum chat informado e o expert não tem Chat ID padrão." }, 400);
      try {
        await callTelegram(expert.bot_token, "sendMessage", {
          chat_id: chatId,
          text: "✅ <b>Mensagem de teste</b>\nEnvio configurado com sucesso no TeleTudo.",
          parse_mode: "HTML",
        });
        return json({ success: true, data: { chat_id: chatId } });
      } catch (err) {
        return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 502);
      }
    }

    return json({ success: false, error: "Ação inválida." }, 400);
  } catch (err) {
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
