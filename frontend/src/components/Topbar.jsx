import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Topbar() {
  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        <Logo size={38} />
        <span className="topbar-brand-name">
          Tele<span className="accent-text">Tudo</span>
        </span>
      </Link>

      <nav className="topbar-nav">
        <Link to="/experts" className="topbar-link">
          Meu Perfil
        </Link>
        <Link to="/" className="topbar-link">
          Configurações
        </Link>
      </nav>

      <div className="topbar-right">
        <span className="role-badge">GERENTE</span>
        <span className="user-name">Otavio Adoni</span>
        <button className="btn-logout" type="button">
          Sair
        </button>
      </div>
    </header>
  );
}
