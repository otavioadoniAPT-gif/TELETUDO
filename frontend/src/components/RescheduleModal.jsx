import { useState } from 'react';
import Modal from './Modal.jsx';
import { messages as messagesApi } from '../api.js';
import { useToast } from './Toast.jsx';
import { toLocalInput } from '../utils.js';

// Modal para mudar a data/hora de um agendamento pendente.
export default function RescheduleModal({ message, onClose, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(toLocalInput(message.scheduled_at));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!value) {
      toast.error('Escolha a nova data e hora.');
      return;
    }
    setBusy(true);
    try {
      await messagesApi.update(message.id, { scheduled_at: value });
      toast.success('Agendamento atualizado.');
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Reagendar mensagem" onClose={onClose}>
      <div className="form-group">
        <label>Nova data e hora</label>
        <input
          type="datetime-local"
          className="form-control"
          value={value}
          onChange={(e) => setValue(e.target.value)}
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
