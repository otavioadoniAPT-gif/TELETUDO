import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../auth.jsx';
import { useToast } from './Toast.jsx';

export default function Topbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const displayName = user?.user_metadata?.full_name || user?.email || 'Usuário';

  async function handleLogout() {
    try {
      await signOut();
      toast.info('Você saiu da conta.');
      navigate('/');
    } catch {
      toast.error('Não foi possível sair.');
    }
  }

  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        <Logo size={38} />
        <span className="topbar-brand-name">
          Tele<span className="accent-text">Tudo</span>
        </span>
      </Link>

      <nav className="topbar-nav">
        <Link to="/perfil" className="topbar-link">
          Meu Perfil
        </Link>
        <Link to="/" className="topbar-link">
          Configurações
        </Link>
      </nav>

      <div className="topbar-right">
        <span className="role-badge">GERENTE</span>
        <span className="user-name">{displayName}</span>
        <button className="btn-logout" type="button" onClick={handleLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}
