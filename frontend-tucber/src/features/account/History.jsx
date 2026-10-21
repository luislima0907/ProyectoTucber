import { useEffect, useState } from 'react'
import { tripService, formatMoney, getErrorMessage } from '../../services/tripService'
import { ReportForm } from '../trips/ReportForm'

export function History({ isDriver, onSelect }) {
    const [trips, setTrips] = useState(null)
    const [earnings, setEarnings] = useState(null)
    const [error, setError] = useState('')
    const [expanded, setExpanded] = useState(null)
    function load() {
        setError('')
        tripService
            .history()
            .then(setTrips)
            .catch((failure) => setError(getErrorMessage(failure)))
        if (isDriver)
            tripService
                .earnings()
                .then(setEarnings)
                .catch((failure) => setError(getErrorMessage(failure)))
    }
    useEffect(() => {
        let active = true
        tripService
            .history()
            .then((data) => {
                if (active) setTrips(data)
            })
            .catch((failure) => {
                if (active) setError(getErrorMessage(failure))
            })
        if (isDriver)
            tripService
                .earnings()
                .then((data) => {
                    if (active) setEarnings(data)
                })
                .catch((failure) => {
                    if (active) setError(getErrorMessage(failure))
                })
        return () => {
            active = false
        }
    }, [isDriver])
    return (
        <section className="page-content">
            <h1>Los caminos recorridos.</h1>
            <p className="muted">Tu historial de viajes con TUCBER.</p>
            {earnings && (
                <div className="earnings-summary">
                    <div>
                        <span>Efectivo recibido</span>
                        <strong>{formatMoney(earnings.received)}</strong>
                    </div>
                    <div>
                        <span>Por cobrar</span>
                        <strong>{formatMoney(earnings.pending)}</strong>
                    </div>
                </div>
            )}
            {error && (
                <div role="alert">
                    <p className="error-msg">{error}</p>
                    <button className="secondary-button" onClick={load}>
                        Reintentar
                    </button>
                </div>
            )}
            {!trips && !error && <p role="status">Cargando viajes…</p>}
            {trips?.length === 0 && (
                <div className="empty-state">
                    <h2>Tu primer viaje está por llegar.</h2>
                    <p>Cuando completes un viaje, podrás consultarlo aquí.</p>
                </div>
            )}
            {trips?.map((trip) => (
                <article className="history-row" key={trip.id}>
                    <button
                        className="history-toggle"
                        onClick={() => setExpanded(expanded === trip.id ? null : trip.id)}
                        aria-expanded={expanded === trip.id}
                    >
                        <div>
                            <strong>{trip.destination.description || `Viaje #${trip.id}`}</strong>
                            <span>
                                {new Date(trip.createdAt).toLocaleDateString('es-GT')} ·{' '}
                                {trip.status === 'cancelada'
                                    ? 'Cancelado'
                                    : trip.paymentConfirmed
                                      ? 'Pagado'
                                      : 'Efectivo pendiente'}
                            </span>
                        </div>
                        <strong>{formatMoney(trip.amount)}</strong>
                    </button>
                    {expanded === trip.id && (
                        <div className="history-detail">
                            <p>Desde {trip.origin.description || 'Recogida seleccionada'}</p>
                            <p>
                                {(trip.distanceMeters / 1000).toFixed(1)} km · Viaje #{trip.id}
                            </p>
                            {trip.status === 'completada' && (
                                <button className="text-button" onClick={() => onSelect(trip)}>
                                    Ver cierre del viaje
                                </button>
                            )}
                            <ReportForm tripId={trip.id} />
                        </div>
                    )}
                </article>
            ))}
        </section>
    )
}
