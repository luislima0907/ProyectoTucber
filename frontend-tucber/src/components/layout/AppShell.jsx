import { Icon } from '../ui/Icon'

export function Brand() {
    return (
        <div className="brand">
            <span className="brand-mark">t</span>
            <span>
                tucber<span className="brand-period">.</span>
            </span>
        </div>
    )
}

export function AppShell({ user, view, onNavigate, onLogout, connected, children }) {
    const navigation = [
        {
            id: 'home',
            icon: 'ride',
            label: user.rol === 'conductor' ? 'Recibir viajes' : 'Pedir un viaje',
        },
        { id: 'history', icon: 'history', label: 'Mis viajes' },
        { id: 'account', icon: 'account', label: 'Mi cuenta' },
    ]
    return (
        <div className="app-shell">
            <aside className="sidebar">
                <Brand />
                <nav aria-label="Navegación principal">
                    {navigation.map((item) => (
                        <button
                            key={item.id}
                            className={view === item.id ? 'nav-item active' : 'nav-item'}
                            aria-current={view === item.id ? 'page' : undefined}
                            onClick={() => onNavigate(item.id)}
                        >
                            <Icon name={item.icon} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <div className="guatemala-sign">
                        <svg viewBox="0 0 90 18" aria-hidden="true">
                            <path
                                d="M0 9 9 0l9 9-9 9ZM18 9l9-9 9 9-9 9ZM36 9l9-9 9 9-9 9ZM54 9l9-9 9 9-9 9ZM72 9l9-9 9 9-9 9Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            />
                        </svg>
                        <p>
                            Hecho para movernos.
                            <br />
                            <strong>Hecho en Guatemala.</strong>
                        </p>
                    </div>
                    <button className="nav-item" onClick={onLogout}>
                        <Icon name="logout" />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>
            <div className="workspace">
                <header className="topbar">
                    <span className="local-label">Jalapa, Guatemala</span>
                    <div className="user-menu">
                        <span className="connection-label">
                            <i className={connected ? 'status-dot online' : 'status-dot'} />
                            {connected ? 'En línea' : 'Reconectando…'}
                        </span>
                        <span className="avatar">{user.nombre.slice(0, 1)}</span>
                        <span>{user.nombre.split(' ')[0]}</span>
                        <button
                            className="mobile-logout"
                            aria-label="Cerrar sesión"
                            onClick={onLogout}
                        >
                            <Icon name="logout" />
                        </button>
                    </div>
                </header>
                {children}
            </div>
        </div>
    )
}
