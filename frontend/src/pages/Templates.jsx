import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { templates as templatesApi } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Spinner from '../components/Spinner.jsx';
import EntityPreview from '../components/EntityPreview.jsx';
import { CONTENT_TYPE_LABELS, truncate } from '../utils.js';

const CAPTURE_BOT = import.meta.env.VITE_CAPTURE_BOT_USERNAME || 'seu bot de captura';

export default function Templates() {
  const toast = useToast();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draftNames, setDraftNames] = useState({});
  const pollRef = useRef(null);

  async function loadAll() {
    try {
      const [d, s] = await Promise.all([templatesApi.drafts(), templatesApi.list()]);
      setDrafts(d);
      setSaved(s);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshDrafts() {
    try {
      setDrafts(await templatesApi.drafts());
    } catch (_) {
      /* silencioso no polling */
    }
  }

  useEffect(() => {
    loadAll();
    pollRef.current = setInterval(refreshDrafts, 5000);
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line

  async function saveDraft(t) {
    const name = (draftNames[t.id] || '').trim();
    if (!name) {
      toast.error('Dê um nome ao template.');
      return;
    }
    try {
      await templatesApi.rename(t.id, name);
      toast.success('Template salvo!');
      setDraftNames((p) => {
        const n = { ...p };
        delete n[t.id];
        return n;
      });
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function rename(t) {
    const name = prompt('Novo nome do template:', t.name || '');
    if (name === null) return;
    try {
      await templatesApi.rename(t.id, name);
      toast.success('Renomeado.');
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(t) {
    if (!confirm(`Excluir o template "${t.name || 'rascunho'}"?`)) return;
    try {
      await templatesApi.remove(t.id);
      toast.success('Template excluído.');
      loadAll();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function useTemplate(t) {
    navigate(`/schedule/new?templateId=${t.id}`);
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Biblioteca de Mensagens</h1>
          <p className="page-subtitle">Capture mensagens prontas (com emojis animados) e reutilize</p>
        </div>
        <button className="btn" onClick={loadAll}>
          Atualizar
        </button>
      </div>

      <div className="card info-banner">
        <strong>Como capturar uma mensagem:</strong>
        <ol style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
          <li>
            No Telegram, <b>encaminhe</b> a mensagem pronta (com emojis animados, formatação ou mídia)
            para <code>{CAPTURE_BOT}</code>.
          </li>
          <li>Volte aqui — ela aparece em <b>Rascunhos</b> abaixo.</li>
          <li>Dê um nome e salve. Pronto para usar no agendamento.</li>
        </ol>
      </div>

      {/* Rascunhos */}
      <div className="section-head">
        <span className="section-num">1</span>
        <div>
          <h2>Rascunhos recém-capturados</h2>
          <div className="section-sub">Mensagens capturadas aguardando um nome (atualiza sozinho)</div>
        </div>
      </div>

      <div className="card">
        {drafts.length === 0 ? (
          <p className="muted">Nenhum rascunho. Encaminhe uma mensagem para {CAPTURE_BOT} e ela aparece aqui.</p>
        ) : (
          <div className="template-grid">
            {drafts.map((t) => (
              <div key={t.id} className="template-card">
                <TemplateBody t={t} />
                <div className="form-group" style={{ marginTop: 10 }}>
                  <input
                    className="form-control"
                    placeholder="Nome do template"
                    value={draftNames[t.id] || ''}
                    onChange={(e) => setDraftNames((p) => ({ ...p, [t.id]: e.target.value }))}
                  />
                </div>
                <div className="row-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => saveDraft(t)}>
                    Salvar
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(t)}>
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Salvos */}
      <div className="section-head">
        <span className="section-num">2</span>
        <div>
          <h2>Templates salvos</h2>
          <div className="section-sub">Prontos para reutilizar no agendamento</div>
        </div>
      </div>

      <div className="card">
        {saved.length === 0 ? (
          <p className="muted">Nenhum template salvo ainda.</p>
        ) : (
          <div className="template-grid">
            {saved.map((t) => (
              <div key={t.id} className="template-card">
                <div className="template-name">{t.name}</div>
                <TemplateBody t={t} />
                <div className="row-actions" style={{ marginTop: 10 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => useTemplate(t)}>
                    Usar
                  </button>
                  <button className="btn btn-sm" onClick={() => rename(t)}>
                    Renomear
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(t)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateBody({ t }) {
  return (
    <div>
      <div className="template-meta">
        <span className="badge-type">{CONTENT_TYPE_LABELS[t.content_type] || t.content_type}</span>
        {t.has_custom_emoji && (
          <span className="badge-emoji" title="Contém emojis animados">
            🎬 {t.custom_emoji_count} animado(s)
          </span>
        )}
      </div>
      {t.content_type === 'photo' && t.media_url && (
        <img src={t.media_url} alt="" className="template-thumb" />
      )}
      {['video', 'document'].includes(t.content_type) && (
        <div className="muted" style={{ fontSize: 13 }}>
          {t.content_type === 'video' ? '🎬' : '📎'} {t.file_name || 'arquivo'}
        </div>
      )}
      <div className="template-text">
        <EntityPreview text={truncate(t.text_content || '', 160)} entities={t.entities_json} />
      </div>
    </div>
  );
}
