import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useSearchEngine } from '../hooks/useSearchEngine'
import { AppShell } from '../components/layout/AppShell'
import { BookingPanel } from '../features/trips/BookingPanel'
import { DriverRequests } from '../features/trips/DriverRequests'
import { ActiveTrip } from '../features/trips/ActiveTrip'
import { History } from '../features/account/History'
import { ConductorProfileForm } from '../components/ConductorProfileForm'

export function Dashboard() {
    const { user, logout } = useAuth()
    const [view, setView] = useState('home')
    const search = useSearchEngine()
    const isDriver = user.rol === 'conductor'
    return <AppShell user={user} view={view} onNavigate={setView} onLogout={logout} connected={search.connected}>
        {search.error && <div className="connection-error" role="alert">{search.error}<button className="text-button" onClick={() => search.setError('')}>Cerrar</button></div>}
        {view === 'account' ? <section className="page-content"><h1>Tu cuenta.</h1><p className="muted">{user.nombre} · {user.correo}</p>{isDriver ? <ConductorProfileForm /> : <p>Viajas como cliente de TUCBER.</p>}</section>
            : view === 'history' ? <History isDriver={isDriver} onSelect={trip => { search.setTrip(trip); setView('home') }} />
                : search.restoring ? <div className="page-content" role="status">Recuperando tu viaje…</div>
                    : search.trip ? <ActiveTrip key={search.trip.id} trip={search.trip} user={user} onChange={search.setTrip} onClose={() => search.setTrip(null)} connected={search.connected} />
                        : isDriver ? <DriverRequests search={search} /> : <BookingPanel onCreated={search.setTrip} />}
    </AppShell>
}
