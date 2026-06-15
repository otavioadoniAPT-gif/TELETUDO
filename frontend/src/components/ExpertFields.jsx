import { useState } from 'react';

// Campos compartilhados entre criação e edição de expert
export default function ExpertFields({ form, setForm, errors }) {
  const [showToken, setShowToken] = useState(false);
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <div className="form-group">
        <label>Nome *</label>
        <input
          className="form-control"
          value={form.name}
          onChange={update('name')}
          placeholder="Ex.: Carlos Trader"
        />
        {errors.name && <div className="field-error">{errors.name}</div>}
      </div>

      <div className="form-group">
        <label>Descrição</label>
        <textarea
          className="form-control"
          value={form.description}
          onChange={update('description')}
          placeholder="Breve descrição do expert"
        />
      </div>

      <div className="form-group">
        <label>Bot Token</label>
        <div className="input-group">
          <input
            className="form-control"
            type={showToken ? 'text' : 'password'}
            value={form.bot_token}
            onChange={update('bot_token')}
            placeholder="123456:ABC-DEF..."
          />
          <button type="button" className="toggle-pass" onClick={() => setShowToken((v) => !v)}>
            {showToken ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Chat ID padrão</label>
        <input
          className="form-control"
          value={form.chat_id}
          onChange={update('chat_id')}
          placeholder="-1001234567890"
        />
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={!!form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
        />
        Expert ativo
      </label>
    </div>
  );
}

export function validateExpert(form) {
  const errors = {};
  if (!form.name || !form.name.trim()) errors.name = 'O nome é obrigatório.';
  return errors;
}
