import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { experts as expertsApi } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import Modal from '../components/Modal.jsx';
import ExpertFields, { validateExpert } from '../components/ExpertFields.jsx';

const EMPTY_CHAT = { chat_id: '', chat_name: '', chat_type: 'group', active: true };

export default function ExpertDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [expert, setExpert] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [chatForm, setChatForm] = useState(EMPTY_CHAT);
  const [chatError, setChatError] = useState('');
  const [savingChat, setSavingChat] = useState(false);
  const [testing, setTesting] = useState(null); // chat_id em teste

  async function testSend(chatId) {
    setTesting(chatId || 'default');
    try {
      await expertsApi.test(id, chatId);
      toast.success('Mensagem de teste enviada com sucesso! ✅');
    } catch (err) {
      toast.error(`Falha no teste: ${err.message}`);
    } finally {
      setTesting(null);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [e, c] = await Promise.all([expertsApi.get(id), expertsApi.chats(id)]);
      setExpert(e);
      setChats(c);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line

  // Abre modal de edição quando ?edit=1
  useEffect(() => {
    if (expert && searchParams.get('edit') === '1') openEdit();
  }, [expert]); // eslint-disable-line

  function openEdit() {
    setEditForm({
      name: expert.name || '',
      description: expert.description || '',
      bot_token: expert.bot_token || '',
      chat_id: expert.chat_id || '',
      active: !!expert.active,
    });
    setEditErrors({});
    setEditing(true);
  }

  function closeEdit() {
    setEditing(false);
    if (searchParams.get('edit')) {
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    const v = validateExpert(editForm);
    setEditErrors(v);
    if (Object.keys(v).length) return;
    setSavingEdit(true);
    try {
      await expertsApi.update(id, editForm);
      toast.success('Expert atualizado!');
      closeEdit();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function addChat(e) {
    e.preventDefault();
    if (!chatForm.chat_id.trim()) {
      setChatError('O chat_id é obrigatório.');
      return;
    }
    setChatError('');
    setSavingChat(true);
    try {
      await expertsApi.addChat(id, chatForm);
      toast.success('Chat adicionado!');
      setChatForm(EMPTY_CHAT);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingChat(false);
    }
  }

  async function removeChat(chatId) {
    if (!confirm('Remover este chat?')) return;
    try {
      await expertsApi.removeChat(id, chatId);
      toast.success('Chat removido.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function removeExpert() {
    if (!confirm('Remover este expert e todos os seus dados?')) return;
    try {
      await expertsApi.remove(id);
      toast.success('Expert removido.');
      navigate('/experts');
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <Spinner />;
  if (!expert) return <div className="empty-state">Expert não encontrado.</div>;

  return (
    <div>
      <div className="page-header">
        <div className="cell-expert">
          <Avatar name={expert.name} src={expert.avatar_url} size={56} />
          <div>
            <h1 style={{ margin: 0 }}>{expert.name}</h1>
            <div style={{ marginTop: 6 }}>
              <Badge status={expert.active ? 'active' : 'inactive'} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={openEdit}>
            Editar
          </button>
          <button className="btn btn-danger" onClick={removeExpert}>
            Remover
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="muted">{expert.description || 'Sem descrição.'}</p>
        <p>
          <strong>Chat ID padrão:</strong>{' '}
          <span className="muted">{expert.chat_id || '—'}</span>
        </p>
        <p>
          <strong>Bot Token:</strong>{' '}
          <span className="muted">{expert.bot_token ? '•••••••• (configurado)' : '— não configurado'}</span>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`/schedule/new?expertId=${expert.id}`} className="btn btn-primary">
            ✉️ Agendar mensagem para este expert
          </Link>
          {expert.chat_id && (
            <button
              className="btn"
              disabled={testing !== null}
              onClick={() => testSend(expert.chat_id)}
            >
              {testing === expert.chat_id ? 'Enviando...' : '🧪 Testar envio (chat padrão)'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Chats vinculados</h3>
        {chats.length === 0 ? (
          <p className="muted">Nenhum chat vinculado ainda.</p>
        ) : (
          <div className="list-chats" style={{ marginBottom: 20 }}>
            {chats.map((c) => (
              <div key={c.id} className="chat-item">
                <div className="chat-info">
                  <div>
                    <strong>{c.chat_name || 'Sem nome'}</strong>{' '}
                    <Badge status={c.active ? 'active' : 'inactive'} />
                  </div>
                  <div className="chat-id">
                    {c.chat_type} · {c.chat_id}
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  disabled={testing !== null}
                  onClick={() => testSend(c.chat_id)}
                >
                  {testing === c.chat_id ? 'Enviando...' : '🧪 Testar'}
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => removeChat(c.id)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={addChat}>
          <div className="step-title">Adicionar novo chat</div>
          <div className="form-row">
            <div className="form-group">
              <label>Chat ID *</label>
              <input
                className="form-control"
                value={chatForm.chat_id}
                onChange={(e) => setChatForm({ ...chatForm, chat_id: e.target.value })}
                placeholder="-1001234567890"
              />
            </div>
            <div className="form-group">
              <label>Nome do chat</label>
              <input
                className="form-control"
                value={chatForm.chat_name}
                onChange={(e) => setChatForm({ ...chatForm, chat_name: e.target.value })}
                placeholder="Ex.: Grupo VIP"
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select
                className="form-control"
                value={chatForm.chat_type}
                onChange={(e) => setChatForm({ ...chatForm, chat_type: e.target.value })}
              >
                <option value="group">Grupo</option>
                <option value="channel">Canal</option>
              </select>
            </div>
          </div>
          {chatError && <div className="field-error">{chatError}</div>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={savingChat}>
            {savingChat ? 'Adicionando...' : '+ Adicionar chat'}
          </button>
        </form>
      </div>

      {editing && editForm && (
        <Modal title="Editar Expert" onClose={closeEdit}>
          <form onSubmit={saveEdit}>
            <ExpertFields form={editForm} setForm={setEditForm} errors={editErrors} />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                {savingEdit ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button type="button" className="btn" onClick={closeEdit}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
