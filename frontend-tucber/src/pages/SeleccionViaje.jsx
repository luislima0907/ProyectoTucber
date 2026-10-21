import { useCallback, useEffect, useRef, useState } from 'react'
import { MapaSeleccion } from '../components/MapaSeleccion'
import { tarifaService } from '../services/tarifaService'
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
    const [cotizacion, setCotizacion] = useState(null)
    const [errorRuta, setErrorRuta] = useState('')
    const [numeroIntento, setNumeroIntento] = useState(0)

    const solicitudUbicacion = useRef(0)
    const solicitudCotizacion = useRef(0)

    const invalidarResultado = useCallback(() => {
        setResumen(null)
        setCotizacion(null)
        setErrorRuta('')

        onCambioSeleccion?.()
    }, [onCambioSeleccion])

    const pedirCotizacion = useCallback((puntoOrigen, puntoDestino) => {
        const solicitudActual = ++solicitudCotizacion.current

        tarifaService.getQuote(puntoOrigen, puntoDestino)
            .then(data => {
                if (solicitudActual !== solicitudCotizacion.current) return
                setErrorRuta('')
                setCotizacion(data)
            })
            .catch(error => {
                if (solicitudActual !== solicitudCotizacion.current) return
                setCotizacion(null)
                setErrorRuta(
                    error.response?.data?.message ||
                    'No se pudo calcular el recorrido. Intenta de nuevo.'
                )
            })
    }, [])

    useEffect(() => {
        if (!coordenadasValidas(origen) || !coordenadasValidas(destino)) {
            solicitudCotizacion.current += 1
            return
        }

        pedirCotizacion(origen, destino)
    }, [origen, destino, pedirCotizacion])

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

    const puntosListos =
        coordenadasValidas(origen) && coordenadasValidas(destino)

    const calculandoRuta = puntosListos && !cotizacion && !errorRuta

    const puedeContinuar =
        coordenadasValidas(origen) &&
        coordenadasValidas(destino) &&
        descripcionOrigen.trim().length > 0 &&
        descripcionDestino.trim().length > 0 &&
        Boolean(cotizacion)

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
            referenciaRecogida: referencia.trim(),
            cotizacion
        }

        setResumen(seleccion)
        onContinuar?.(seleccion)
    }

    if (resumen) {
        return (
            <ConfirmacionViaje
                key={numeroIntento}
                seleccion={resumen}
                onVolver={() => setResumen(null)}
                onReintentar={() => {
                    setNumeroIntento(valor => valor + 1)
                }}
                onBloqueoCambio={onBloqueoCambio}
            />
        )
    }

    return (
        <main className="app-card seleccion-viaje">
            <h1 className="brand-title">Prepara tu viaje</h1>

            <p>
                Cobertura: departamento de Jalapa, Guatemala.
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
                ruta={cotizacion?.polyline}
                onSeleccionar={seleccionarPunto}
            />

            <p role="status">{mensaje}</p>

            {calculandoRuta && <p role="status">Calculando recorrido…</p>}

            {errorRuta && (
                <div className="error-cotizacion" role="alert">
                    <p>{errorRuta}</p>
                    <button
                        type="button"
                        className="btn-reintentar"
                        onClick={() => {
                            setErrorRuta('')
                            pedirCotizacion(origen, destino)
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {cotizacion && (
                <p className="resumen-recorrido" role="status">
                    Distancia aproximada: {cotizacion.distanceKm} km ·
                    {' '}Tarifa: {cotizacion.currencySymbol}
                    {cotizacion.amount}
                </p>
            )}

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