import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { experts as expertsApi } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import ExpertFields, { validateExpert } from '../components/ExpertFields.jsx';

const EMPTY = { name: '', description: '', bot_token: '', chat_id: '', active: true };

export default function ExpertForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const v = validateExpert(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    try {
      const created = await expertsApi.create(form);
      toast.success('Expert criado com sucesso!');
      // redireciona para detalhe para adicionar chats
      navigate(`/experts/${created.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Novo Expert</h1>
          <p className="page-subtitle">Cadastre um novo expert e seu bot do Telegram</p>
        </div>
      </div>

      <form className="card" style={{ maxWidth: 600 }} onSubmit={handleSubmit}>
        <ExpertFields form={form} setForm={setForm} errors={errors} />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar expert'}
          </button>
          <button type="button" className="btn" onClick={() => navigate('/experts')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
