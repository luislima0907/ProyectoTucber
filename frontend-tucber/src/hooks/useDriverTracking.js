import { useEffect, useState } from 'react'

export function useDriverTracking(tripId, enabled, send) {
    const [error, setError] = useState('')

    useEffect(() => {
        if (!enabled) return
        let active = true
        let timer

        function shareLocation() {
            if (!navigator.geolocation) {
                setError('Este navegador no permite compartir tu ubicación.')
                return
            }
            navigator.geolocation.getCurrentPosition(
                ({ coords }) => {
                    if (!active) return
                    setError('')
                    send('trip-location', {
                        tripId,
                        location: {
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                            accuracy: coords.accuracy,
                        },
                    })
                    timer = setTimeout(shareLocation, 5000)
                },
                (failure) => {
                    if (active) {
                        setError(
                            failure.code === 1
                                ? 'Permite la ubicación para que tu pasajero vea por dónde vienes.'
                                : 'No se pudo actualizar tu ubicación. Volveremos a intentarlo.',
                        )
                        timer = setTimeout(shareLocation, 5000)
                    }
                },
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
            )
        }

        shareLocation()
        return () => {
            active = false
            clearTimeout(timer)
        }
    }, [tripId, enabled, send])

    return enabled ? error : ''
}
