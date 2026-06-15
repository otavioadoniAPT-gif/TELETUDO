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
  const isFailed = message.status === 'failed';

  async function save() {
    if (!value) {
      toast.error('Escolha a nova data e hora.');
      return;
    }
    setBusy(true);
    try {
      const payload = { scheduled_at: value };
      // Reagendar uma falha = reenviar: volta para pendente e limpa o erro.
      if (isFailed) {
        payload.status = 'pending';
        payload.error_message = null;
      }
      await messagesApi.update(message.id, payload);
      toast.success(isFailed ? 'Mensagem reagendada para reenvio.' : 'Agendamento atualizado.');
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={isFailed ? 'Reenviar mensagem' : 'Reagendar mensagem'} onClose={onClose}>
      {isFailed && (
        <p className="muted" style={{ marginTop: 0 }}>
          Esta mensagem falhou. Ao salvar, ela volta para a fila e será reenviada no novo horário.
        </p>
      )}
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
