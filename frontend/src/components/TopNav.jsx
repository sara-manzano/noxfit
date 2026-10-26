import './TopNav.css';

const navItems = [
  { key: 'panel', label: 'Perfil' },
  { key: 'members', label: 'Socios', adminOnly: true },
  { key: 'trainers', label: 'Entrenadores', hideForTrainers: true },
  { key: 'services', label: 'Servicios', memberOnly: true },
  { key: 'calendar', label: 'Calendario de reservas' },
];

export const TopNav = ({ activeView, onChange, showMembers, showTrainers, showServices, userName, roleLabel, onLogout }) => (
  <header className="top-nav">
    <div className="top-nav-inner">
      <button className="top-nav-brand" type="button" onClick={() => onChange('panel')}>
        <span>NOXFIT</span>
      </button>

      <nav className="top-nav-links" aria-label="Navegación principal">
        {navItems
          .filter((item) => (showMembers || !item.adminOnly)
            && (showTrainers || !item.hideForTrainers)
            && (showServices || !item.memberOnly))
          .map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === activeView ? 'top-nav-link top-nav-link-active' : 'top-nav-link'}
              aria-current={item.key === activeView ? 'page' : undefined}
              onClick={() => onChange(item.key)}
            >
              {item.label}
            </button>
          ))}
      </nav>

      <div className="top-nav-user">
        <div>
          <strong>{userName}</strong>
          <span>{roleLabel}</span>
        </div>
        <button className="button button-primary top-nav-cta" type="button" onClick={onLogout}>
          Salir
        </button>
      </div>
    </div>
  </header>
);
