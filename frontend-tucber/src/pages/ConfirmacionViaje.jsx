import { useEffect, useRef, useState } from 'react'
import {
    crearIntento,
    mensajeViaje,
    resultadoIncierto,
    viajeService
} from '../services/viajeService'
import { BusquedaViaje } from './BusquedaViaje'
import '../css/ConfirmacionViaje.css'

export function ConfirmacionViaje({
    seleccion,
    onVolver,
    onBloqueoCambio
}) {
    const [cotizacion, setCotizacion] = useState(null)
    const [errorCotizacion, setErrorCotizacion] = useState(null)
    const [recarga, setRecarga] = useState(0)

    const [estadoEnvio, setEstadoEnvio] = useState('listo')
    const [errorEnvio, setErrorEnvio] = useState('')
    const [solicitud, setSolicitud] = useState(null)

    const intento = useRef(null)
    const enviando = useRef(false)

    const claveSeleccion = JSON.stringify(seleccion)

    const bloqueado =
        estadoEnvio === 'procesando' ||
        estadoEnvio === 'incierto'

    // Avisa al inicio para que no permita salir durante el envío.
    useEffect(() => {
        onBloqueoCambio?.(bloqueado)

        return () => onBloqueoCambio?.(false)
    }, [bloqueado, onBloqueoCambio])

    // Consulta la tarifa de los puntos actuales.
    useEffect(() => {
        const control = new AbortController()
        let vigente = true

        viajeService
            .cotizar(
                JSON.parse(claveSeleccion),
                control.signal
            )
            .then(data => {
                if (vigente) {
                    setCotizacion({
                        clave: claveSeleccion,
                        recarga,
                        data
                    })
                }
            })
            .catch(error => {
                if (vigente) {
                    setErrorCotizacion({
                        clave: claveSeleccion,
                        recarga,
                        mensaje: mensajeViaje(error)
                    })
                }
            })

        return () => {
            vigente = false
            control.abort()
        }
    }, [claveSeleccion, recarga])

    const tarifaActual =
        cotizacion?.clave === claveSeleccion &&
        cotizacion?.recarga === recarga
            ? cotizacion.data
            : null

    const errorActual =
        errorCotizacion?.clave === claveSeleccion &&
        errorCotizacion?.recarga === recarga
            ? errorCotizacion.mensaje
            : ''

    async function confirmar() {
        if (enviando.current || solicitud) return

        if (!tarifaActual && estadoEnvio !== 'incierto') {
            return
        }

        enviando.current = true
        setEstadoEnvio('procesando')
        setErrorEnvio('')

        try {
            if (!intento.current) {
                intento.current = crearIntento(seleccion)
            }

            const creada = await intento.current.enviar()

            setSolicitud(creada)
            setEstadoEnvio('enviado')
        } catch (error) {
            if (resultadoIncierto(error)) {
                setEstadoEnvio('incierto')
                setErrorEnvio(
                    'No recibimos confirmación del servidor. ' +
                    'La solicitud podría haberse creado. ' +
                    'Reintenta el mismo envío para recuperar su resultado.'
                )
            } else {
                setEstadoEnvio('rechazado')
                setErrorEnvio(mensajeViaje(error))
            }
        } finally {
            enviando.current = false
        }
    }

    if (solicitud) {
        return <BusquedaViaje solicitud={solicitud} />
    }

    return (
        <main
            className="app-card confirmacion-viaje"
            aria-busy={estadoEnvio === 'procesando'}
        >
            <h1 className="brand-title">Revisa tu viaje</h1>

            <p className="subtitle">
                Comprueba los puntos y la tarifa antes de solicitar.
            </p>

            <dl className="datos-confirmacion">
                <div>
                    <dt>Origen</dt>
                    <dd>{seleccion.origen.descripcion}</dd>
                </div>

                <div>
                    <dt>Destino</dt>
                    <dd>{seleccion.destino.descripcion}</dd>
                </div>

                <div>
                    <dt>Referencia de recogida</dt>
                    <dd>
                        {seleccion.referenciaRecogida ||
                            'Sin referencia'}
                    </dd>
                </div>

                <div>
                    <dt>Distancia</dt>
                    <dd>
                        {tarifaActual
                            ? `${tarifaActual.distanceKm.toFixed(2)} km`
                            : 'No disponible'}
                    </dd>
                </div>

                <div>
                    <dt>Tarifa en quetzales</dt>
                    <dd>
                        {tarifaActual
                            ? `Q${tarifaActual.amount.toFixed(2)}`
                            : 'No disponible'}
                    </dd>
                </div>
            </dl>

            {!tarifaActual && !errorActual && (
                <p role="status">Calculando tarifa…</p>
            )}

            {errorActual && (
                <p className="error-msg" role="alert">
                    {errorActual}
                </p>
            )}

            {errorEnvio && (
                <p className="error-msg" role="alert">
                    {errorEnvio}
                </p>
            )}

            {estadoEnvio === 'procesando' && (
                <p role="status">Procesando tu solicitud…</p>
            )}

            <div className="acciones-confirmacion">
                {errorActual && (
                    <button
                        type="button"
                        className="btn-corregir"
                        disabled={bloqueado}
                        onClick={() =>
                            setRecarga(valor => valor + 1)
                        }
                    >
                        Reintentar cotización
                    </button>
                )}

                <button
                    type="button"
                    className="btn-corregir"
                    disabled={bloqueado}
                    onClick={() => {
                        if (!bloqueado) onVolver()
                    }}
                >
                    Volver a corregir
                </button>

                <button
                    type="button"
                    className="btn-submit"
                    onClick={confirmar}
                    disabled={
                        estadoEnvio === 'procesando' ||
                        (!tarifaActual &&
                            estadoEnvio !== 'incierto')
                    }
                >
                    {estadoEnvio === 'procesando'
                        ? 'Procesando…'
                        : estadoEnvio === 'incierto' ||
                            estadoEnvio === 'rechazado'
                            ? 'Reintentar envío'
                            : 'Confirmar y buscar conductor'}
                </button>
            </div>

            {bloqueado && (
                <small>
                    Espera a resolver este envío antes de
                    cambiar los puntos.
                </small>
            )}
        </main>
    )
}