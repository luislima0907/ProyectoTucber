import { useEffect, useRef, useState } from 'react'
import { loadMapsLibrary } from '../../config/maps'

export function TripMap({ origin, destination, route, onSelect }) {
    const container = useRef(null)
    const map = useRef(null)
    const select = useRef(onSelect)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState('')
    useEffect(() => {
        select.current = onSelect
    }, [onSelect])

    useEffect(() => {
        let active = true
        let listener
        async function initialize() {
            try {
                const { Map } = await loadMapsLibrary('maps')
                if (!active) return
                map.current = new Map(container.current, {
                    center: { lat: 14.6347, lng: -89.9889 },
                    zoom: 14,
                    disableDefaultUI: true,
                    zoomControl: true,
                    clickableIcons: false,
                    styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
                })
                listener = map.current.addListener('click', (event) => {
                    if (event.latLng)
                        select.current?.({
                            latitude: event.latLng.lat(),
                            longitude: event.latLng.lng(),
                            description: `${event.latLng.lat().toFixed(4)}, ${event.latLng.lng().toFixed(4)}`,
                        })
                })
                setReady(true)
            } catch (failure) {
                if (active) setError(failure.message)
            }
        }
        initialize()
        return () => {
            active = false
            listener?.remove()
        }
    }, [])

    useEffect(() => {
        if (!ready) return
        let active = true
        const markers = []
        let polyline
        async function draw() {
            const { Marker } = await loadMapsLibrary('marker')
            const { LatLngBounds } = await loadMapsLibrary('core')
            if (!active) return
            const bounds = new LatLngBounds()
            for (const [index, point] of [origin, destination].entries()) {
                if (!point) continue
                const position = { lat: point.latitude, lng: point.longitude }
                bounds.extend(position)
                markers.push(
                    new Marker({ map: map.current, position, label: index === 0 ? 'A' : 'B' }),
                )
            }
            if (origin && destination) map.current.fitBounds(bounds, 64)
            else if (origin || destination) map.current.panTo(bounds.getCenter())
            if (route) {
                const { encoding } = await loadMapsLibrary('geometry')
                const { Polyline } = await loadMapsLibrary('maps')
                if (active)
                    polyline = new Polyline({
                        map: map.current,
                        path: encoding.decodePath(route),
                        strokeColor: '#087cbe',
                        strokeWeight: 5,
                    })
            }
        }
        draw().catch(() =>
            setError('No se pudo mostrar el recorrido. Las direcciones siguen disponibles.'),
        )
        return () => {
            active = false
            markers.forEach((marker) => marker.setMap(null))
            polyline?.setMap(null)
        }
    }, [ready, origin, destination, route])

    return (
        <div className="map-surface">
            <div className="trip-map" ref={container} aria-label="Mapa de Jalapa" />
            {!ready && (
                <div className="map-status" role="status">
                    {error || 'Cargando mapa de Jalapa…'}
                </div>
            )}
            {ready && error && (
                <p className="map-warning" role="status">
                    {error}
                </p>
            )}
            <span className="map-location">Jalapa, Guatemala</span>
        </div>
    )
}
