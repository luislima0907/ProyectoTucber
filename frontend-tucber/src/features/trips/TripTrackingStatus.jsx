import { useEffect, useState } from 'react'

export function TripTrackingStatus({ location, connected, error }) {
    const [now, setNow] = useState(Date.now)

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 5000)
        return () => clearInterval(timer)
    }, [])

    const stale = location && now - location.updatedAt > 20000
    let message = 'Esperando ubicación del tuc tuc…'
    if (location) {
        message = stale
            ? 'Última ubicación recibida. Esperando señal…'
            : 'Ubicación del tuc tuc en vivo'
    }
    if (!connected) message = 'Sin conexión. La ubicación puede estar desactualizada.'
    if (error) message = error

    return (
        <div className="tracking-status">
            <p role="status">{message}</p>
            {location && (
                <small>
                    Última señal: {new Date(location.updatedAt).toLocaleTimeString('es-GT')}
                    {location.accuracy ? ` · Precisión ±${Math.round(location.accuracy)} m` : ''}
                </small>
            )}
        </div>
    )
}
