import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboard } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import { CONTENT_TYPE_LABELS, formatDateTime } from '../utils.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    dashboard
      .stats()
      .then(setStats)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <Spinner />;
  if (!stats) return <div className="empty-state">Não foi possível carregar os dados.</div>;

  const cards = [
    { label: 'Experts ativos', value: stats.totalExperts, cls: 'purple', icon: '👥', foot: 'Registros ativos' },
    { label: 'Enviadas hoje', value: stats.sentToday, cls: 'blue', icon: '✅', foot: 'Mensagens entregues' },
    { label: 'Pendentes', value: stats.pending, cls: 'yellow', icon: '⏳', foot: 'Aguardando envio' },
    { label: 'Falhas', value: stats.failed, cls: 'red', icon: '⚠️', foot: 'Envios com erro' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Painel completo — visão geral dos envios</p>
        </div>
        <Link to="/schedule/new" className="btn btn-primary">
          + Novo agendamento
        </Link>
      </div>

      <div className="section-head">
        <span className="section-num">1</span>
        <div>
          <h2>Resumo Executivo</h2>
          <div className="section-sub">Métricas consolidadas da operação</div>
        </div>
      </div>

      <div className="grid stats-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <div className="stat-top">
              <div className="stat-label">{c.label}</div>
              <div className="stat-icon">{c.icon}</div>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-foot">{c.foot}</div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <span className="section-num">2</span>
        <div>
          <h2>Próximos agendamentos</h2>
          <div className="section-sub">As próximas mensagens na fila de envio</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, display: 'none' }}>Próximos agendamentos</h3>
        {stats.upcoming.length === 0 ? (
          <p className="muted">Nenhum agendamento pendente.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Expert</th>
                <th>Tipo</th>
                <th>Data/Hora</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.upcoming.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="cell-expert">
                      <Avatar name={m.expert_name} src={m.expert_avatar} size={30} />
                      {m.expert_name}
                    </div>
                  </td>
                  <td>{CONTENT_TYPE_LABELS[m.content_type] || m.content_type}</td>
                  <td>{formatDateTime(m.scheduled_at)}</td>
                  <td>
                    <Badge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
