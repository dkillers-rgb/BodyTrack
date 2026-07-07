import { Outlet, NavLink } from 'react-router-dom';
import './Layout.css';

const navItems = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/clients', label: 'Clientes', icon: '👥' },
  { to: '/history', label: 'Avaliações', icon: '📋' },
  { to: '/reports', label: 'Relatórios', icon: '📊' },
  { to: '/more', label: 'Mais', icon: '⋯' },
];

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">💪</span>
          <span className="brand-name">BodyTrack</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/scan" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
            Ler QR Code
          </NavLink>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
