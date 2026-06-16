import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Resumo', icon: '▦', end: true },
  { to: '/experts', label: 'Experts', icon: '👥' },
  { to: '/schedule/new', label: 'Novo Agendamento', icon: '✉️' },
  { to: '/templates', label: 'Templates', icon: '🎬' },
  { to: '/history', label: 'Histórico', icon: '🕑' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
