import { Outlet, NavLink } from 'react-router-dom';
import './Layout.css';

const navItems = [
  { to: '/', label: 'Início', icon: '🏠', end: true },
  { to: '/clients', label: 'Clientes', icon: '👥' },
  { to: '/history', label: 'Avaliações', icon: '📋' },
  { to: '/reports', label: 'Relatórios', icon: '📊' },
  { to: '/more', label: 'Mais', icon: '⋯' },
];

export default function Layout() {
  return (
    <div className="layout">
      <header className="mobile-topbar">
        <div className="mobile-topbar-brand">
          <span className="brand-icon">💪</span>
          <span className="brand-name">BodyTrack</span>
        </div>
        <NavLink to="/scan" className="mobile-qr-btn">
          Ler QR
        </NavLink>
      </header>

      <aside className="sidebar sidebar-desktop">
        <div className="sidebar-brand">
          <span className="brand-icon">💪</span>
          <span className="brand-name">BodyTrack</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/scan" className="btn-primary sidebar-qr-btn">
            Ler QR Code
          </NavLink>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
