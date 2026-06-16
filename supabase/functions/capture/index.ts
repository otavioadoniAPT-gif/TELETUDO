// ============================================================
// TeleTudo — Edge Function "capture" (webhook do bot de captura)
//
// O dono (conta Premium) ENCAMINHA uma mensagem pronta (com custom
// emojis animados, formatação e/ou mídia) para o bot de captura.
// O Telegram entrega o update aqui (webhook). Esta função:
//   - lê text/caption + entities/caption_entities (offsets UTF-16, sem reprocessar)
//   - se houver mídia, baixa o arquivo e guarda no Storage (bucket "media")
//   - cria um template em status 'rascunho' (sem nome)
//   - responde no chat confirmando e dizendo quantos emojis animados detectou
//
// Segurança: valida o header secreto do webhook (X-Telegram-Bot-Api-Secret-Token).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("CAPTURE_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET = Deno.env.get("CAPTURE_WEBHOOK_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const api = (method: string) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

async function tg(method: string, payload: Record<string, unknown>) {
  const res = await fetch(api(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => ({}));
}

// Baixa um file_id do Telegram e guarda no bucket "media" em templates/.
async function downloadToStorage(fileId: string, suggestedName?: string) {
  const info = await tg("getFile", { file_id: fileId });
  const tgPath = info?.result?.file_path;
  if (!tgPath) throw new Error("Não foi possível obter o arquivo (getFile).");

  const fileRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${tgPath}`);
  if (!fileRes.ok) throw new Error("Falha ao baixar o arquivo do Telegram.");
  const bytes = new Uint8Array(await fileRes.arrayBuffer());

  const ext = (tgPath.split(".").pop() || "bin").toLowerCase();
  const base = (suggestedName || `arquivo.${ext}`).replace(/[^\w.\-]+/g, "_");
  const path = `templates/${crypto.randomUUID()}-${base}`;
  const contentType = fileRes.headers.get("content-type") || "application/octet-stream";

  const { error } = await admin.storage.from("media").upload(path, bytes, { contentType });
  if (error) throw new Error(`Falha ao salvar no Storage: ${error.message}`);
  return { path, contentType, fileName: suggestedName || base };
}

Deno.serve(async (req) => {
  // Valida o segredo do webhook
  if (WEBHOOK_SECRET && req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  let update: any = {};
  try {
    update = await req.json();
  } catch (_) {
    return new Response("ok"); // ignora corpo inválido
  }

  const msg = update.message || update.channel_post;
  if (!msg) return new Response("ok");

  const chatId = msg.chat?.id;

  try {
    const text = msg.text ?? msg.caption ?? "";
    const entities = msg.entities ?? msg.caption_entities ?? [];

    let content_type = "text";
    let file_path: string | null = null;
    let file_name: string | null = null;
    let mime_type: string | null = null;

    if (Array.isArray(msg.photo) && msg.photo.length) {
      content_type = "photo";
      const largest = msg.photo[msg.photo.length - 1]; // melhor resolução
      const dl = await downloadToStorage(largest.file_id, "foto.jpg");
      file_path = dl.path; file_name = dl.fileName; mime_type = dl.contentType;
    } else if (msg.video) {
      content_type = "video";
      const dl = await downloadToStorage(msg.video.file_id, msg.video.file_name || "video.mp4");
      file_path = dl.path; file_name = dl.fileName; mime_type = msg.video.mime_type || dl.contentType;
    } else if (msg.document) {
      content_type = "document";
      const dl = await downloadToStorage(msg.document.file_id, msg.document.file_name || "arquivo");
      file_path = dl.path; file_name = dl.fileName; mime_type = msg.document.mime_type || dl.contentType;
    }

    const customEmojis = (entities as any[]).filter((e) => e.type === "custom_emoji").length;

    await admin.from("message_templates").insert({
      name: null,
      content_type,
      text_content: text || null,
      entities_json: entities,
      file_path,
      file_name,
      mime_type,
      status: "rascunho",
    });

    if (chatId) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ Capturado! Detectei ${customEmojis} emoji(s) animado(s). Dê um nome no painel (aba Templates → Rascunhos).`,
      });
    }
  } catch (err) {
    if (chatId) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `⚠️ Não consegui capturar: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Sempre 200 para o Telegram não reenviar o update
  return new Response("ok");
});
