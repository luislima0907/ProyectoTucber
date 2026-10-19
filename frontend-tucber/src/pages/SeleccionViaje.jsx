import { useCallback, useRef, useState } from 'react'
import { MapaSeleccion } from '../components/MapaSeleccion'
import '../css/SeleccionViaje.css'
import { ConfirmacionViaje } from './ConfirmacionViaje'

function coordenadasValidas(punto) {
    return Boolean(
        punto &&
        Number.isFinite(punto.lat) &&
        Number.isFinite(punto.lng) &&
        punto.lat >= -90 &&
        punto.lat <= 90 &&
        punto.lng >= -180 &&
        punto.lng <= 180
    )
}

export function SeleccionViaje({ onContinuar, onCambioSeleccion,  onBloqueoCambio }) {
    const [origen, setOrigen] = useState(null)
    const [destino, setDestino] = useState(null)
    const [descripcionOrigen, setDescripcionOrigen] = useState('')
    const [descripcionDestino, setDescripcionDestino] = useState('')
    const [referencia, setReferencia] = useState('')
    const [centro, setCentro] = useState(null)
    const [mensaje, setMensaje] = useState('')
    const [localizando, setLocalizando] = useState(false)
    const [resumen, setResumen] = useState(null)

    const solicitudUbicacion = useRef(0)

    const invalidarResultado = useCallback(() => {
        setResumen(null)

        onCambioSeleccion?.()
    }, [onCambioSeleccion])

    const seleccionarPunto = useCallback((tipo, punto) => {
        if (!coordenadasValidas(punto)) return

        const coordenadas =
            `${punto.lat.toFixed(6)}, ${punto.lng.toFixed(6)}`

        if (tipo === 'origen') {
            solicitudUbicacion.current += 1
            setLocalizando(false)
            setOrigen(punto)
            setDescripcionOrigen(
                `Recogida seleccionada en el mapa (${coordenadas})`
            )
        } else {
            setDestino(punto)
            setDescripcionDestino(
                `Destino seleccionado en el mapa (${coordenadas})`
            )
        }

        setCentro(punto)
        setMensaje('')
        invalidarResultado()
    }, [invalidarResultado])

    function editarDescripcion(tipo, texto) {
        if (tipo === 'origen') {
            solicitudUbicacion.current += 1
            setLocalizando(false)
            setDescripcionOrigen(texto)
            setOrigen(null)
        } else {
            setDescripcionDestino(texto)
            setDestino(null)
        }

        setMensaje('')
        invalidarResultado()
    }

    function usarMiUbicacion() {
        if (!navigator.geolocation) {
            setMensaje('Puedes seleccionar tu ubicación manualmente en el mapa.')
            return
        }

        const solicitudActual = ++solicitudUbicacion.current

        setLocalizando(true)
        setMensaje('')

        navigator.geolocation.getCurrentPosition(
            posicion => {
                if (solicitudActual !== solicitudUbicacion.current) return

                seleccionarPunto('origen', {
                    lat: posicion.coords.latitude,
                    lng: posicion.coords.longitude
                })

                setDescripcionOrigen('Mi ubicación actual')
            },
            () => {
                if (solicitudActual !== solicitudUbicacion.current) return

                setLocalizando(false)
                setMensaje(
                    'No se pudo obtener tu ubicación. ' +
                    'Puedes elegir tu ubicación manualmente en el mapa.'
                )
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        )
    }

    const puedeContinuar =
        coordenadasValidas(origen) &&
        coordenadasValidas(destino) &&
        descripcionOrigen.trim().length > 0 &&
        descripcionDestino.trim().length > 0

    function continuar() {
        if (!puedeContinuar) return

        solicitudUbicacion.current += 1
        setLocalizando(false)

        const seleccion = {
            origen: {
                ...origen,
                descripcion: descripcionOrigen.trim()
            },
            destino: {
                ...destino,
                descripcion: descripcionDestino.trim()
            },
            referenciaRecogida: referencia.trim()
        }

        setResumen(seleccion)
        onContinuar?.(seleccion)
    }

    if (resumen) {
        return (
            <ConfirmacionViaje
                seleccion={resumen}
                onVolver={() => setResumen(null)}
                onBloqueoCambio={onBloqueoCambio}
            />
        )
    }

    return (
        <main className="app-card seleccion-viaje">
            <h1 className="brand-title">Prepara tu viaje</h1>

            <p>
                Cobertura: municipio de Jalapa, Guatemala.
            </p>

            <div className="form-group">
                <label htmlFor="origen">Punto de recogida</label>
                <input
                    id="origen"
                    className="form-input"
                    value={descripcionOrigen}
                    placeholder="Describe dónde te recogerán"
                    onChange={event =>
                        editarDescripcion('origen', event.target.value)
                    }
                />
                <small>
                    {origen
                        ? 'Ubicación marcada. Puedes corregirla en el mapa.'
                        : 'Escribe una descripción y marca el origen en el mapa.'}
                </small>
            </div>

            <div className="opcion-ubicacion">
                <button
                    type="button"
                    className="btn-ubicacion"
                    disabled={localizando}
                    onClick={usarMiUbicacion}
                >
                    {localizando
                        ? 'Buscando tu ubicación…'
                        : 'Usar mi ubicación actual'}
                </button>

                <small>
                    Haz click para tomar tu ubicación actual como punto de origen.
                    También puedes seleccionarlo manualmente en el mapa.
                </small>
            </div>

            <div className="form-group">
                <label htmlFor="referencia">
                    Referencia de ubicación (opcional)
                </label>
                <input
                    id="referencia"
                    className="form-input"
                    value={referencia}
                    placeholder="Ejemplo: frente a la farmacia"
                    onChange={event => {
                        setReferencia(event.target.value)
                        invalidarResultado()
                    }}
                />
            </div>

            <div className="form-group">
                <label htmlFor="destino">Destino</label>
                <input
                    id="destino"
                    className="form-input"
                    value={descripcionDestino}
                    placeholder="Describe hacia dónde vas"
                    onChange={event =>
                        editarDescripcion('destino', event.target.value)
                    }
                />
                <small>
                    {destino
                        ? 'Ubicación marcada. Puedes corregirla en el mapa.'
                        : 'Escribe una descripcióno o marca el destino en el mapa.'}
                </small>
            </div>

            <MapaSeleccion
                origen={origen}
                destino={destino}
                centro={centro}
                onSeleccionar={seleccionarPunto}
            />

            <p role="status">{mensaje}</p>

            {!puedeContinuar && (
                <p>
                    Para continuar, completa ambas descripciones
                    y selecciona los dos puntos.
                </p>
            )}

            <button
                type="button"
                className="btn-submit"
                disabled={!puedeContinuar}
                onClick={continuar}
            >
                Continuar
            </button>
        </main>
    )
}