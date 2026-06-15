import { useEffect, useState } from 'react';
import { experts as expertsApi, messages as messagesApi } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import Modal from '../components/Modal.jsx';
import { CONTENT_TYPE_LABELS, formatDateTime, contentPreview, truncate } from '../utils.js';

export default function History() {
  const toast = useToast();
  const [expertsList, setExpertsList] = useState([]);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState(null);

  const [filters, setFilters] = useState({
    expert_id: '',
    status: '',
    start_date: '',
    end_date: '',
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    expertsApi.list().then(setExpertsList).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    const params = { page, perPage: 20 };
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    messagesApi
      .history(params)
      .then((res) => {
        setItems(res.items);
        setPagination(res.pagination);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [page]); // eslint-disable-line

  function applyFilters() {
    if (page === 1) load();
    else setPage(1);
  }

  function clearFilters() {
    setFilters({ expert_id: '', status: '', start_date: '', end_date: '' });
    setPage(1);
    setTimeout(load, 0);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Histórico de Envios</h1>
          <p className="page-subtitle">{pagination.total} registro(s)</p>
        </div>
      </div>

      <div className="filters card">
        <div className="form-group">
          <label>Expert</label>
          <select
            className="form-control"
            value={filters.expert_id}
            onChange={(e) => setFilters({ ...filters, expert_id: e.target.value })}
          >
            <option value="">Todos</option>
            {expertsList.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select
            className="form-control"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="pending">Pendente</option>
            <option value="sent">Enviado</option>
            <option value="failed">Falhou</option>
          </select>
        </div>
        <div className="form-group">
          <label>Data início</label>
          <input
            type="date"
            className="form-control"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Data fim</label>
          <input
            type="date"
            className="form-control"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          />
        </div>
        <button className="btn btn-primary" onClick={applyFilters}>
          Filtrar
        </button>
        <button className="btn" onClick={clearFilters}>
          Limpar
        </button>
      </div>

      <div className="card">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <div className="empty-state">Nenhum registro encontrado.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Expert</th>
                <th>Tipo</th>
                <th>Conteúdo</th>
                <th>Agendada</th>
                <th>Enviada</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr
                  key={m.id}
                  className={m.status === 'failed' ? 'clickable' : ''}
                  onClick={() => m.status === 'failed' && setErrorModal(m)}
                >
                  <td>
                    <div className="cell-expert">
                      <Avatar
                        name={m.expert?.name}
                        src={m.expert?.avatar_url}
                        size={28}
                      />
                      {m.expert?.name || '—'}
                    </div>
                  </td>
                  <td>
                    {CONTENT_TYPE_LABELS[m.content_type] || m.content_type}
                    {m.recurrence === 'daily' && (
                      <span title="Repete todos os dias" style={{ marginLeft: 6 }}>
                        🔁
                      </span>
                    )}
                  </td>
                  <td className="muted">{truncate(contentPreview(m), 50)}</td>
                  <td>{formatDateTime(m.scheduled_at)}</td>
                  <td>{formatDateTime(m.sent_at)}</td>
                  <td>
                    <Badge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Anterior
          </button>
          <span className="muted">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima →
          </button>
        </div>
      )}

      {errorModal && (
        <Modal title="Detalhe do erro" onClose={() => setErrorModal(null)}>
          <p>
            <strong>Expert:</strong> {errorModal.expert?.name || '—'}
          </p>
          <p>
            <strong>Tipo:</strong> {CONTENT_TYPE_LABELS[errorModal.content_type]}
          </p>
          <p>
            <strong>Agendada:</strong> {formatDateTime(errorModal.scheduled_at)}
          </p>
          <p>
            <strong>Mensagem de erro:</strong>
          </p>
          <div className="error-box">{errorModal.error_message || 'Erro não registrado.'}</div>
        </Modal>
      )}
    </div>
  );
}
