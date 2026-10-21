import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useSearchEngine } from '../hooks/useSearchEngine'
import { useDriverTracking } from '../hooks/useDriverTracking'
import { AppShell } from '../components/layout/AppShell'
import { BookingPanel } from '../features/trips/BookingPanel'
import { DriverRequests } from '../features/trips/DriverRequests'
import { ActiveTrip } from '../features/trips/ActiveTrip'
import { History } from '../features/account/History'
import { ConductorProfileForm } from '../components/ConductorProfileForm'

export function Dashboard() {
    const { user, logout } = useAuth()
    const [view, setView] = useState('home')
    const [selectedTrip, setSelectedTrip] = useState(null)
    const search = useSearchEngine()
    const isDriver = user.rol === 'conductor'
    const tracking = ['aceptada', 'en_recogida', 'en_curso'].includes(search.trip?.status)
    const trackingError = useDriverTracking(
        search.trip?.id,
        isDriver && tracking && search.connected,
        search.send,
    )
    const displayedTrip = selectedTrip || search.trip
    return (
        <AppShell
            user={user}
            view={view}
            onNavigate={(nextView) => {
                setView(nextView)
                setSelectedTrip(null)
            }}
            onLogout={logout}
            connected={search.connected}
        >
            {search.error && (
                <div className="connection-error" role="alert">
                    {search.error}
                    <button className="text-button" onClick={() => search.setError('')}>
                        Cerrar
                    </button>
                </div>
            )}
            {view === 'account' ? (
                <section className="page-content">
                    <h1>Tu cuenta.</h1>
                    <p className="muted">
                        {user.nombre} · {user.correo}
                    </p>
                    {isDriver ? <ConductorProfileForm /> : <p>Viajas como cliente de TUCBER.</p>}
                </section>
            ) : view === 'history' ? (
                <History
                    isDriver={isDriver}
                    onSelect={(trip) => {
                        setSelectedTrip(trip)
                        setView('home')
                    }}
                />
            ) : search.restoring ? (
                <div className="page-content" role="status">
                    Recuperando tu viaje…
                </div>
            ) : displayedTrip ? (
                <ActiveTrip
                    key={displayedTrip.id}
                    trip={displayedTrip}
                    user={user}
                    onChange={selectedTrip ? setSelectedTrip : search.setTrip}
                    onClose={() => (selectedTrip ? setSelectedTrip(null) : search.setTrip(null))}
                    connected={search.connected}
                    driverLocation={search.driverLocation}
                    trackingError={trackingError}
                />
            ) : isDriver ? (
                <DriverRequests search={search} />
            ) : (
                <BookingPanel onCreated={search.setTrip} />
            )}
        </AppShell>
    )
}
