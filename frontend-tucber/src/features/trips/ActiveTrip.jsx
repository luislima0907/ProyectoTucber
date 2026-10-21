import { useEffect, useRef, useState } from 'react'
import { TripMap } from './TripMap'
import { ReportForm } from './ReportForm'
import { tripService, getErrorMessage, formatMoney } from '../../services/tripService'

const statusTitles = {
    buscando: 'Buscando tu conductor.',
    aceptada: 'Tu conductor va en camino.',
    en_recogida: 'Nos vemos en la recogida.',
    en_curso: '¡Buen viaje!',
    completada: 'Llegaste a tu destino.',
    cancelada: 'Viaje cancelado.',
    vencida: 'Esta vez no encontramos conductor.',
}

export function ActiveTrip({ trip, user, onChange, onClose, connected }) {
    const [pin, setPin] = useState('')
    const [customerPin, setCustomerPin] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [confirming, setConfirming] = useState('')
    const [seconds, setSeconds] = useState(60)
    const pending = useRef(false)
    const isDriver = user.rol === 'conductor'
    const closed = ['completada', 'cancelada', 'vencida'].includes(trip.status)

    useEffect(() => {
        if (trip.status !== 'buscando') return
        const update = () =>
            setSeconds(Math.max(0, Math.ceil((new Date(trip.expiresAt) - Date.now()) / 1000)))
        update()
        const timer = setInterval(update, 1000)
        return () => clearInterval(timer)
    }, [trip.status, trip.expiresAt])

    useEffect(() => {
        if (!isDriver && trip.status === 'en_recogida') {
            let active = true
            tripService
                .pin(trip.id)
                .then((value) => {
                    if (active) setCustomerPin(value)
                })
                .catch((failure) => {
                    if (active) setError(getErrorMessage(failure))
                })
            return () => {
                active = false
            }
        }
    }, [trip.id, trip.status, isDriver])

    async function act(action, body) {
        if (pending.current) return
        pending.current = true
        setBusy(true)
        setError('')
        try {
            onChange(await tripService.action(trip.id, action, body))
            setConfirming('')
        } catch (failure) {
            setError(getErrorMessage(failure))
            tripService
                .current()
                .then((value) => {
                    if (value) onChange(value)
                })
                .catch(() => {})
        } finally {
            pending.current = false
            setBusy(false)
        }
    }

    return (
        <div className="ride-layout">
            <section className="ride-panel">
                <span className="trip-number">Viaje #{trip.id}</span>
                <h1>{statusTitles[trip.status]}</h1>
                {trip.status === 'buscando' && (
                    <p className="search-countdown" role="status">
                        {seconds}
                        <span>segundos de búsqueda</span>
                    </p>
                )}
                <div className="trip-stops">
                    <p>
                        <span>A</span>
                        {trip.origin.description || 'Punto de recogida seleccionado'}
                    </p>
                    <p>
                        <span>B</span>
                        {trip.destination.description || 'Destino seleccionado'}
                    </p>
                </div>
                {trip.driverName && (
                    <p>
                        <strong>{trip.driverName}</strong> ·{' '}
                        {trip.vehiclePlate || 'Conductor asignado'}
                    </p>
                )}
                <div className="quote-summary">
                    <div>
                        <span>Tarifa acordada</span>
                        <strong>{formatMoney(trip.amount)}</strong>
                    </div>
                    <p>{(trip.distanceMeters / 1000).toFixed(1)} km · Pago en efectivo</p>
                </div>
                {!isDriver && trip.status === 'en_recogida' && (
                    <div className="pin-display">
                        <span>Tu PIN de recogida</span>
                        <strong>{customerPin || '••••'}</strong>
                        <p>Verifica el vehículo antes de compartirlo.</p>
                    </div>
                )}
                {isDriver && trip.status === 'aceptada' && (
                    <button
                        className="primary-button"
                        disabled={busy || !connected}
                        onClick={() => act('llegada')}
                    >
                        Ya llegué a la recogida
                    </button>
                )}
                {isDriver && trip.status === 'en_recogida' && (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault()
                            act('iniciar', { pin })
                        }}
                    >
                        <label className="form-group">
                            PIN del cliente
                            <input
                                value={pin}
                                onChange={(event) => setPin(event.target.value)}
                                inputMode="numeric"
                                pattern="[0-9]{4}"
                                maxLength={4}
                                required
                            />
                        </label>
                        <button className="primary-button" disabled={busy || !connected}>
                            Iniciar viaje
                        </button>
                    </form>
                )}
                {isDriver && trip.status === 'en_curso' && (
                    <button
                        className="primary-button"
                        disabled={busy || !connected}
                        onClick={() => setConfirming('finalizar')}
                    >
                        Llegué al destino
                    </button>
                )}
                {trip.status === 'completada' && (
                    <>
                        <p className="payment-state">
                            {trip.paymentConfirmed
                                ? 'Efectivo recibido. ¡Gracias por viajar con TUCBER!'
                                : 'Pago en efectivo pendiente de confirmar.'}
                        </p>
                        {isDriver && !trip.paymentConfirmed && (
                            <button
                                className="primary-button"
                                disabled={busy || !connected}
                                onClick={() => setConfirming('pago')}
                            >
                                Confirmar efectivo recibido
                            </button>
                        )}
                        {!isDriver && !trip.rating && (
                            <fieldset className="rating">
                                <legend>¿Cómo estuvo tu viaje? (opcional)</legend>
                                {[1, 2, 3, 4, 5].map((stars) => (
                                    <button
                                        key={stars}
                                        disabled={busy}
                                        onClick={() => act('calificar', { stars })}
                                        aria-label={`${stars} estrellas`}
                                    >
                                        {stars}
                                    </button>
                                ))}
                            </fieldset>
                        )}
                        {trip.rating && <p>Calificación registrada: {trip.rating}/5</p>}
                    </>
                )}
                {!closed && trip.status !== 'en_curso' && (
                    <button
                        className="text-button danger"
                        disabled={busy || !connected}
                        onClick={() => setConfirming('cancelar')}
                    >
                        Cancelar viaje
                    </button>
                )}
                {confirming && (
                    <div className="confirmation" role="group" aria-label="Confirmar acción">
                        <p>
                            {confirming === 'pago'
                                ? '¿Recibiste el efectivo del cliente?'
                                : confirming === 'finalizar'
                                  ? '¿Confirmas que llegaste al destino?'
                                  : '¿Quieres cancelar este viaje?'}
                        </p>
                        <div className="button-row">
                            <button className="secondary-button" onClick={() => setConfirming('')}>
                                Volver
                            </button>
                            <button
                                className="primary-button"
                                disabled={busy}
                                onClick={() => act(confirming)}
                            >
                                Sí, confirmar
                            </button>
                        </div>
                    </div>
                )}
                {error && (
                    <p role="alert" className="error-msg">
                        {error}
                    </p>
                )}
                {closed && (
                    <button className="secondary-button" onClick={onClose}>
                        Volver al inicio
                    </button>
                )}
                {trip.status !== 'buscando' && <ReportForm tripId={trip.id} />}
            </section>
            <TripMap origin={trip.origin} destination={trip.destination} route={trip.route} />
        </div>
    )
}
