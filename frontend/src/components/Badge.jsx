const LABELS = {
  pending: 'Pendente',
  sent: 'Enviado',
  failed: 'Falhou',
  active: 'Ativo',
  inactive: 'Inativo',
};

export default function Badge({ status }) {
  return <span className={`badge ${status}`}>{LABELS[status] || status}</span>;
}
