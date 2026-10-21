import { useEffect, useState } from 'react'
import { driverService } from '../../services/driverService'
import { formatMoney, getErrorMessage } from '../../services/tripService'
import { TripMap } from './TripMap'

export function DriverRequests({ search }) {
    const [available, setAvailable] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    useEffect(() => {
        driverService
            .getAvailability()
            .then((data) => setAvailable(data.disponible))
            .catch((failure) => setError(getErrorMessage(failure)))
    }, [])

    async function toggleAvailability() {
        setBusy(true)
        setError('')
        try {
            const data = await driverService.updateAvailability(!available)
            setAvailable(data.disponible)
            if (data.disponible)
                navigator.geolocation?.getCurrentPosition((position) => {
                    search.send('location', {
                        location: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        },
                    })
                })
        } catch (failure) {
            setError(getErrorMessage(failure))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="ride-layout">
            <section className="ride-panel">
                <h1>Tu próxima ruta.</h1>
                <p className="muted">Conecta con quienes se mueven por Jalapa.</p>
                <button
                    className={available ? 'secondary-button' : 'primary-button'}
                    onClick={toggleAvailability}
                    disabled={busy || !search.connected}
                >
                    {busy
                        ? 'Actualizando…'
                        : available
                          ? 'Dejar de recibir viajes'
                          : 'Estoy disponible'}
                </button>
                <p className="availability">
                    <span className={available ? 'status-dot online' : 'status-dot'} />
                    {available
                        ? 'Disponible para recibir solicitudes'
                        : 'No estás recibiendo solicitudes'}
                </p>
                {error && (
                    <p role="alert" className="error-msg">
                        {error}
                    </p>
                )}
                {available && search.requests.length === 0 && (
                    <div className="empty-state">
                        <h2>Todo listo para salir.</h2>
                        <p>Las nuevas solicitudes aparecerán aquí en tiempo real.</p>
                    </div>
                )}
                {search.requests.map((request) => (
                    <article className="request-row" key={request.id}>
                        <div className="request-heading">
                            <h2>Solicitud de viaje</h2>
                            <strong>{formatMoney(request.amount)}</strong>
                        </div>
                        <p>
                            {request.origin.description || 'Recogida en Jalapa'} →{' '}
                            {request.destination.description || 'Destino en Jalapa'}
                        </p>
                        <p className="muted">
                            {(request.distanceMeters / 1000).toFixed(1)} km · Efectivo
                        </p>
                        <button
                            className="primary-button"
                            onClick={() => search.send('accept', { id: request.id })}
                            disabled={!search.connected}
                        >
                            Aceptar viaje
                        </button>
                    </article>
                ))}
            </section>
            <TripMap
                origin={search.requests[0]?.origin}
                destination={search.requests[0]?.destination}
            />
        </div>
    )
}
