import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { experts as expertsApi, messages as messagesApi } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Spinner from '../components/Spinner.jsx';
import { CONTENT_TYPE_LABELS } from '../utils.js';

const TYPES = ['text', 'photo', 'video', 'document', 'link', 'sticker'];
const FILE_TYPES = { photo: 'image/*', video: 'video/*', document: '*' };

export default function ScheduleNew() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [expertsList, setExpertsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expertId, setExpertId] = useState(searchParams.get('expertId') || '');
  const [chats, setChats] = useState([]);
  const [selectedChats, setSelectedChats] = useState([]);

  const [contentType, setContentType] = useState('text');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [stickerId, setStickerId] = useState('');
  const [parseMode, setParseMode] = useState('none');

  const [scheduledAt, setScheduledAt] = useState('');
  const [sendNow, setSendNow] = useState(false);
  const [recurrence, setRecurrence] = useState('none');

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    expertsApi
      .list()
      .then(setExpertsList)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  // Carrega chats ao trocar de expert
  useEffect(() => {
    if (!expertId) {
      setChats([]);
      setSelectedChats([]);
      return;
    }
    expertsApi
      .chats(expertId)
      .then((c) => {
        const expert = expertsList.find((e) => String(e.id) === String(expertId));
        const merged = [...c];
        // Inclui o "Chat ID padrão" do expert como opção, se não estiver na lista
        if (expert && expert.chat_id && !c.some((x) => x.chat_id === expert.chat_id)) {
          merged.unshift({
            id: 'default',
            chat_id: expert.chat_id,
            chat_name: 'Chat padrão do expert',
            chat_type: 'group',
            active: 1,
          });
        }
        setChats(merged);
        // pré-seleciona chats ativos
        setSelectedChats(merged.filter((x) => x.active).map((x) => x.chat_id));
      })
      .catch((err) => toast.error(err.message));
  }, [expertId, expertsList]); // eslint-disable-line

  function toggleChat(chatId) {
    setSelectedChats((prev) =>
      prev.includes(chatId) ? prev.filter((c) => c !== chatId) : [...prev, chatId]
    );
  }

  function onFileChange(e) {
    const f = e.target.files[0];
    setFile(f || null);
    if (f && contentType === 'photo') {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  }

  function changeType(t) {
    setContentType(t);
    setFile(null);
    setFilePreview(null);
    setErrors({});
  }

  const showFormatting = ['text', 'photo', 'video', 'document'].includes(contentType);

  async function submit(now) {
    const willSendNow = now === true;
    // valida considerando o modo de envio
    const e = {};
    if (!expertId) e.expert = 'Selecione um expert.';
    if (selectedChats.length === 0) e.chats = 'Selecione ao menos um chat.';
    if (contentType === 'text' && !textContent.trim()) e.text = 'Digite o texto da mensagem.';
    if (['photo', 'video', 'document'].includes(contentType) && !file)
      e.file = 'Selecione um arquivo.';
    if (contentType === 'link' && !linkUrl.trim()) e.link = 'Informe a URL do link.';
    if (contentType === 'sticker' && !stickerId.trim())
      e.sticker = 'Informe o file_id da figurinha.';
    if (recurrence === 'daily' && !scheduledAt)
      e.scheduled = 'Para repetir diariamente, defina a data/hora do primeiro envio.';
    else if (!willSendNow && !sendNow && !scheduledAt)
      e.scheduled = 'Defina a data/hora ou marque "Enviar agora".';
    setErrors(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    fd.append('expert_id', expertId);
    fd.append('content_type', contentType);
    fd.append('target_chats', JSON.stringify(selectedChats));
    if (textContent) fd.append('text_content', textContent);
    if (file) fd.append('file', file);
    if (contentType === 'link') {
      fd.append('link_url', linkUrl);
      fd.append('link_preview_title', linkTitle);
      fd.append('link_preview_description', linkDesc);
    }
    if (contentType === 'sticker') fd.append('sticker_id', stickerId.trim());
    // Formatação só se aplica a texto e legendas
    if (['text', 'photo', 'video', 'document'].includes(contentType)) {
      fd.append('parse_mode', parseMode);
    }
    // Em recorrência diária sempre usamos a data base (não envia "agora")
    const isNow = recurrence !== 'daily' && (willSendNow || sendNow);
    fd.append('send_now', isNow ? 'true' : 'false');
    fd.append('recurrence', recurrence);
    if (recurrence === 'daily' || !isNow) {
      // Envia o valor cru do datetime-local (horário local); a conversão
      // para UTC é feita uma única vez no api.js (toIso).
      fd.append('scheduled_at', scheduledAt);
    }

    setSubmitting(true);
    try {
      await messagesApi.create(fd);
      toast.success(
        recurrence === 'daily'
          ? 'Agendamento diário criado!'
          : isNow
          ? 'Mensagem enviada!'
          : 'Agendamento criado!'
      );
      navigate('/history');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  const selectedExpert = expertsList.find((e) => String(e.id) === String(expertId));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Novo Agendamento</h1>
          <p className="page-subtitle">Crie e agende uma mensagem para os chats de um expert</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        {/* Passo 1 — Expert */}
        <div className="step">
          <div className="step-title">1 · Selecione o expert</div>
          <select
            className="form-control"
            value={expertId}
            onChange={(e) => setExpertId(e.target.value)}
          >
            <option value="">— Selecione —</option>
            {expertsList.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} {e.active ? '' : '(inativo)'}
              </option>
            ))}
          </select>
          {selectedExpert && (
            <div className="cell-expert" style={{ marginTop: 10 }}>
              <Avatar name={selectedExpert.name} src={selectedExpert.avatar_url} size={32} />
              <span>{selectedExpert.name}</span>
            </div>
          )}
          {errors.expert && <div className="field-error">{errors.expert}</div>}
        </div>

        {/* Passo 2 — Chats */}
        {expertId && (
          <div className="step">
            <div className="step-title">2 · Selecione os chats</div>
            {chats.length === 0 ? (
              <p className="muted">
                Este expert não tem chats vinculados. Adicione chats na página do expert.
              </p>
            ) : (
              chats.map((c) => (
                <label key={c.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selectedChats.includes(c.chat_id)}
                    onChange={() => toggleChat(c.chat_id)}
                  />
                  <span>
                    {c.chat_name || c.chat_id}{' '}
                    <span className="chat-id">
                      ({c.chat_type} · {c.chat_id})
                    </span>
                  </span>
                </label>
              ))
            )}
            {errors.chats && <div className="field-error">{errors.chats}</div>}
          </div>
        )}

        {/* Passo 3 — Conteúdo */}
        <div className="step">
          <div className="step-title">3 · Conteúdo</div>
          <div className="tabs">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`tab ${contentType === t ? 'active' : ''}`}
                onClick={() => changeType(t)}
              >
                {CONTENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {contentType === 'text' && (
            <div className="form-group">
              <label>Texto da mensagem</label>
              <textarea
                className="form-control"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Digite a mensagem..."
              />
              {errors.text && <div className="field-error">{errors.text}</div>}
            </div>
          )}

          {['photo', 'video', 'document'].includes(contentType) && (
            <div className="form-group">
              <label>Arquivo</label>
              <input
                type="file"
                className="form-control"
                accept={FILE_TYPES[contentType]}
                onChange={onFileChange}
              />
              {file && (
                <div className="file-preview">
                  {contentType === 'photo' && filePreview ? (
                    <img src={filePreview} alt="preview" />
                  ) : (
                    <span className="file-icon">
                      {contentType === 'video' ? '🎬' : '📎'}
                    </span>
                  )}
                  <div>
                    <div>{file.name}</div>
                    <div className="muted">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
              )}
              {errors.file && <div className="field-error">{errors.file}</div>}
              <div className="form-group" style={{ marginTop: 14 }}>
                <label>Legenda (opcional)</label>
                <textarea
                  className="form-control"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Legenda do arquivo..."
                />
              </div>
            </div>
          )}

          {contentType === 'link' && (
            <div>
              <div className="form-group">
                <label>URL *</label>
                <input
                  className="form-control"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://exemplo.com"
                />
                {errors.link && <div className="field-error">{errors.link}</div>}
              </div>
              <div className="form-group">
                <label>Título (opcional)</label>
                <input
                  className="form-control"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Descrição (opcional)</label>
                <input
                  className="form-control"
                  value={linkDesc}
                  onChange={(e) => setLinkDesc(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Texto adicional (opcional)</label>
                <textarea
                  className="form-control"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
              </div>
            </div>
          )}

          {contentType === 'sticker' && (
            <div className="form-group">
              <label>file_id da figurinha *</label>
              <input
                className="form-control"
                value={stickerId}
                onChange={(e) => setStickerId(e.target.value)}
                placeholder="CAACAgEAAxkBAAE..."
              />
              {errors.sticker && <div className="field-error">{errors.sticker}</div>}
              <div className="muted" style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
                <strong>Como descobrir o file_id:</strong>
                <br />
                1. No Telegram, envie a figurinha desejada para o bot{' '}
                <a href="https://t.me/RawDataBot" target="_blank" rel="noreferrer">
                  @RawDataBot
                </a>{' '}
                (ou <code>@idstickerbot</code>).
                <br />
                2. Ele responde com o campo <code>file_id</code> — copie e cole aqui.
                <br />
                Funciona com figurinhas animadas e estáticas. (Se der erro de
                "file_id inválido", envie a figurinha para o <em>seu próprio bot</em> e pegue o
                file_id pelo <code>getUpdates</code>.)
              </div>
            </div>
          )}

        </div>

        {/* Passo 4 — Quando */}
        <div className="step">
          <div className="step-title">4 · Quando enviar</div>

          <div className="form-group">
            <label>Repetição</label>
            <select
              className="form-control"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
            >
              <option value="none">Envio único</option>
              <option value="daily">Todos os dias (no horário definido)</option>
            </select>
          </div>

          {recurrence === 'none' && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={sendNow}
                onChange={(e) => setSendNow(e.target.checked)}
              />
              Enviar agora
            </label>
          )}
          {(recurrence === 'daily' || !sendNow) && (
            <div className="form-group">
              <label>
                {recurrence === 'daily' ? 'Primeiro envio (e horário diário)' : 'Data e hora do envio'}
              </label>
              <input
                type="datetime-local"
                className="form-control"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              {recurrence === 'daily' && (
                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                  A mensagem será reenviada automaticamente todos os dias neste horário.
                </div>
              )}
              {errors.scheduled && <div className="field-error">{errors.scheduled}</div>}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            className="btn btn-primary"
            disabled={submitting}
            onClick={() => submit(false)}
          >
            {submitting
              ? 'Salvando...'
              : recurrence === 'daily'
              ? 'Salvar agendamento diário'
              : 'Salvar agendamento'}
          </button>
          {recurrence === 'none' && (
            <button className="btn" disabled={submitting} onClick={() => submit(true)}>
              Enviar agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
