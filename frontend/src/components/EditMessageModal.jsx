import { useState } from 'react';
import Modal from './Modal.jsx';
import { messages as messagesApi } from '../api.js';
import { useToast } from './Toast.jsx';
import { toLocalInput } from '../utils.js';

// Edita uma mensagem agendada pendente: texto/legenda/link/figurinha + data/hora.
// Mensagens baseadas em template só permitem ajustar a data/hora.
export default function EditMessageModal({ message, onClose, onSaved }) {
  const toast = useToast();
  const isTemplate = !!message.template_id;
  const ct = message.content_type;

  const [text, setText] = useState(message.text_content || '');
  const [linkUrl, setLinkUrl] = useState(message.link_url || '');
  const [linkTitle, setLinkTitle] = useState(message.link_preview_title || '');
  const [linkDesc, setLinkDesc] = useState(message.link_preview_description || '');
  const [stickerId, setStickerId] = useState(message.sticker_id || '');
  const [when, setWhen] = useState(toLocalInput(message.scheduled_at));
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const isMedia = ['photo', 'video', 'document'].includes(ct);
  const textLabel = isMedia ? 'Legenda' : 'Texto';
  const fileAccept = { photo: 'image/*', video: 'video/*', document: '*' }[ct] || '*';

  async function save() {
    if (!isTemplate && ct === 'link' && !linkUrl.trim()) {
      toast.error('A URL do link é obrigatória.');
      return;
    }
    setBusy(true);
    try {
      const patch = {};
      if (when) patch.scheduled_at = when;
      if (!isTemplate) {
        if (ct === 'link') {
          patch.link_url = linkUrl.trim();
          patch.link_preview_title = linkTitle || null;
          patch.link_preview_description = linkDesc || null;
          patch.text_content = text || null;
        } else if (ct === 'sticker') {
          patch.sticker_id = stickerId.trim();
        } else {
          patch.text_content = text || null;
          if (isMedia && file) patch.file = file;
        }
      }
      await messagesApi.update(message.id, patch);
      toast.success('Mensagem atualizada.');
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Editar mensagem agendada" onClose={onClose}>
      {isTemplate && (
        <p className="muted" style={{ marginTop: 0 }}>
          Mensagem baseada em template — o conteúdo vem do template (recapture no Telegram para mudar).
          Aqui você ajusta apenas a data/hora.
        </p>
      )}

      {!isTemplate && ct === 'link' && (
        <>
          <div className="form-group">
            <label>URL *</label>
            <input className="form-control" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Título</label>
            <input className="form-control" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <input className="form-control" value={linkDesc} onChange={(e) => setLinkDesc(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Texto adicional</label>
            <textarea className="form-control" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        </>
      )}

      {!isTemplate && ct === 'sticker' && (
        <div className="form-group">
          <label>file_id da figurinha</label>
          <input className="form-control" value={stickerId} onChange={(e) => setStickerId(e.target.value)} />
        </div>
      )}

      {!isTemplate && !['link', 'sticker'].includes(ct) && (
        <div className="form-group">
          <label>{textLabel}</label>
          <textarea className="form-control" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      )}

      {!isTemplate && isMedia && (
        <div className="form-group">
          <label>Substituir arquivo (opcional)</label>
          <input
            type="file"
            className="form-control"
            accept={fileAccept}
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {file ? `Novo: ${file.name}` : `Atual: ${message.file_name || '—'} (deixe vazio para manter)`}
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Data e hora</label>
        <input
          type="datetime-local"
          className="form-control"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
      </div>

      <div className="form-actions">
        <button className="btn" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
}
