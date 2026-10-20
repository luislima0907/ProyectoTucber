import { useEffect, useRef, useState } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

const clave = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

if (clave) {
    setOptions({
        key: clave,
        v: 'weekly',
        language: 'es',
        region: 'GT'
    })
}

export function MapaSeleccion({
    origen,
    destino,
    centro,
    ruta,
    onSeleccionar
}) {
    const contenedor = useRef(null)
    const mapa = useRef(null)
    const claseMarcador = useRef(null)
    const clasePolyline = useRef(null)
    const decodificarRuta = useRef(null)
    const trazado = useRef(null)
    const marcadores = useRef({ origen: null, destino: null })
    const puntoActivo = useRef('origen')

    const [listo, setListo] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelado = false

        async function iniciar() {
            try {
                if (!clave) {
                    throw new Error('Falta la clave en .env.local')
                }

                const [
                    { Map, Polyline },
                    { AdvancedMarkerElement },
                    { encoding }
                ] = await Promise.all([
                    importLibrary('maps'),
                    importLibrary('marker'),
                    importLibrary('geometry')
                ])

                if (cancelado || !contenedor.current) return

                claseMarcador.current = AdvancedMarkerElement
                clasePolyline.current = Polyline
                decodificarRuta.current = encoding.decodePath

                mapa.current = new Map(contenedor.current, {
                    center: { lat: 14.6347, lng: -89.9889 },
                    zoom: 14,
                    mapId: 'DEMO_MAP_ID',
                    clickableIcons: false,
                    streetViewControl: false,
                    mapTypeControl: false
                })

                setListo(true)
            } catch (error) {
                if (!cancelado) setError(error.message)
            }
        }

        iniciar()

        const marcadoresActuales = marcadores.current

        return () => {
            cancelado = true

            Object.values(marcadoresActuales).forEach(marcador => {
                if (marcador) marcador.map = null
            })

            if (trazado.current) trazado.current.setMap(null)

            marcadoresActuales.origen = null
            marcadoresActuales.destino = null
            trazado.current = null
            mapa.current = null
        }
    }, [])

    useEffect(() => {
        if (!listo || !mapa.current) return

        const evento = mapa.current.addListener('click', event => {
            if (!event.latLng) return

            onSeleccionar(puntoActivo.current, {
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
            })
        })

        return () => evento.remove()
    }, [listo, onSeleccionar])

    useEffect(() => {
        if (!listo || !mapa.current) return

        const puntos = { origen, destino }

        Object.entries(puntos).forEach(([tipo, punto]) => {
            const existente = marcadores.current[tipo]

            if (!punto) {
                if (existente) existente.map = null
                marcadores.current[tipo] = null
                return
            }

            if (existente) {
                existente.position = punto
                return
            }

            const etiqueta = document.createElement('span')
            etiqueta.textContent = tipo === 'origen' ? 'O' : 'D'

            Object.assign(etiqueta.style, {
                backgroundColor: tipo === 'origen' ? '#006852' : '#2563eb',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '50%',
                fontWeight: 'bold',
                border: '2px solid white'
            })

            marcadores.current[tipo] = new claseMarcador.current({
                map: mapa.current,
                position: punto,
                title: tipo === 'origen' ? 'Origen' : 'Destino',
                content: etiqueta
            })
        })
    }, [listo, origen, destino])

    useEffect(() => {
        if (!listo || !mapa.current) return

        if (trazado.current) {
            trazado.current.setMap(null)
            trazado.current = null
        }

        if (!ruta || !decodificarRuta.current) return

        trazado.current = new clasePolyline.current({
            map: mapa.current,
            path: decodificarRuta.current(ruta),
            strokeColor: '#006852',
            strokeOpacity: 0.9,
            strokeWeight: 5
        })
    }, [listo, ruta])

    useEffect(() => {
        if (!listo || !mapa.current) return

        if (origen && destino) {
            mapa.current.fitBounds({
                north: Math.max(origen.lat, destino.lat),
                south: Math.min(origen.lat, destino.lat),
                east: Math.max(origen.lng, destino.lng),
                west: Math.min(origen.lng, destino.lng)
            }, 48)
        } else if (centro) {
            mapa.current.panTo(centro)
        }
    }, [listo, centro, origen, destino])

    return (
        <section>
            <label htmlFor="punto-activo">
                ¿Qué punto quieres marcar o corregir?
            </label>

            <select
                id="punto-activo"
                className="form-input"
                defaultValue="origen"
                onChange={event => {
                    puntoActivo.current = event.target.value
                }}
            >
                <option value="origen">Origen — O verde</option>
                <option value="destino">Destino — D azul</option>
            </select>

            <p>
                Elige el punto y pulsa sobre el mapa para ubicarlo.
                Puedes repetirlo para corregirlo.
            </p>

            {!listo && !error && <p>Cargando mapa…</p>}

            {error && (
                <p role="alert">
                    No se pudo cargar el mapa: {error}
                </p>
            )}

            <div
                ref={contenedor}
                className="mapa-seleccion"
                aria-label="Mapa de selección de origen y destino"
            />
        </section>
    )
}