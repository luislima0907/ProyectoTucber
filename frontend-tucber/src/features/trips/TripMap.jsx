import { useEffect, useRef, useState } from 'react'
import { loadMapsLibrary } from '../../config/maps'

export function TripMap({ origin, destination, route, onSelect, driverLocation }) {
    const container = useRef(null)
    const map = useRef(null)
    const select = useRef(onSelect)
    const driverMarker = useRef(null)
    const viewport = useRef(null)
    const stopsKey = [
        origin?.latitude,
        origin?.longitude,
        destination?.latitude,
        destination?.longitude,
    ].join(':')
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
            driverMarker.current?.setMap(null)
        }
    }, [])

    useEffect(() => {
        if (!ready) return
        let active = true
        const markers = []
        let polyline
        let accuracyCircle
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
            if (viewport.current !== stopsKey) {
                if (origin && destination) map.current.fitBounds(bounds, 64)
                else if (origin || destination) map.current.panTo(bounds.getCenter())
                viewport.current = stopsKey
            }
            if (origin?.accuracy) {
                const { Circle } = await loadMapsLibrary('maps')
                if (!active) return
                accuracyCircle = new Circle({
                    map: map.current,
                    center: { lat: origin.latitude, lng: origin.longitude },
                    radius: origin.accuracy,
                    strokeColor: '#087cbe',
                    strokeWeight: 1,
                    fillColor: '#087cbe',
                    fillOpacity: 0.12,
                    clickable: false,
                })
            }
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
            accuracyCircle?.setMap(null)
        }
    }, [ready, origin, destination, route, stopsKey])

    useEffect(() => {
        if (!ready) return
        let active = true
        async function updateDriver() {
            if (!driverLocation) {
                driverMarker.current?.setVisible(false)
                return
            }
            const { Marker } = await loadMapsLibrary('marker')
            const { Size, LatLngBounds } = await loadMapsLibrary('core')
            if (!active) return
            const position = { lat: driverLocation.latitude, lng: driverLocation.longitude }
            if (!driverMarker.current) {
                driverMarker.current = new Marker({
                    map: map.current,
                    position,
                    title: 'Tuc tuc del viaje',
                    icon: { url: '/favicon.svg', scaledSize: new Size(36, 36) },
                    zIndex: 10,
                })
                const bounds = new LatLngBounds()
                bounds.extend(position)
                for (const point of [origin, destination]) {
                    if (point) bounds.extend({ lat: point.latitude, lng: point.longitude })
                }
                map.current.fitBounds(bounds, 64)
            }
            driverMarker.current.setPosition(position)
            driverMarker.current.setVisible(true)
        }
        updateDriver().catch(() => setError('No se pudo mostrar el tuc tuc en el mapa.'))
        return () => {
            active = false
        }
    }, [ready, driverLocation, origin, destination])

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
            {driverLocation && (
                <button
                    className="map-follow secondary-button"
                    onClick={() => {
                        const position = driverMarker.current?.getPosition()
                        if (position) map.current?.panTo(position)
                    }}
                    type="button"
                >
                    Ver tuc tuc
                </button>
            )}
        </div>
    )
}
