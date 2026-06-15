import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { experts as expertsApi } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';

export default function ExpertsList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    expertsApi
      .list()
      .then(setList)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Experts</h1>
          <p className="page-subtitle">{list.length} expert(s) cadastrado(s)</p>
        </div>
        <Link to="/experts/new" className="btn btn-primary">
          + Adicionar expert
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          Nenhum expert cadastrado. <Link to="/experts/new">Adicionar o primeiro</Link>.
        </div>
      ) : (
        <div className="grid experts-grid">
          {list.map((e) => (
            <div key={e.id} className="expert-card">
              <div className="expert-top">
                <Avatar name={e.name} src={e.avatar_url} size={48} />
                <div>
                  <div className="expert-name">{e.name}</div>
                  <Badge status={e.active ? 'active' : 'inactive'} />
                </div>
              </div>
              <div className="expert-desc">{e.description || 'Sem descrição.'}</div>
              <div className="expert-actions">
                <Link to={`/experts/${e.id}`} className="btn btn-sm">
                  Ver detalhes
                </Link>
                <button
                  className="btn btn-sm"
                  onClick={() => navigate(`/experts/${e.id}?edit=1`)}
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
