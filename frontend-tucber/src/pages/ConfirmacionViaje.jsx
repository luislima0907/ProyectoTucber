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
    onReintentar,
    onBloqueoCambio
}) {
    const [cotizacion, setCotizacion] = useState(null)
    const [errorCotizacion, setErrorCotizacion] = useState(null)
    const [recarga, setRecarga] = useState(0)

    const [estadoEnvio, setEstadoEnvio] = useState('listo')
    const [errorEnvio, setErrorEnvio] = useState('')
    const [solicitud, setSolicitud] = useState(null)
    const [consultandoViaje, setConsultandoViaje] = useState(false)

    const intento = useRef(null)
    const enviando = useRef(false)

    const claveSeleccion = JSON.stringify(seleccion)

    const bloqueado =
        estadoEnvio === 'procesando' ||
        estadoEnvio === 'incierto' ||
        consultandoViaje

    // Bloquea la navegación mientras se resuelve una operación.
    useEffect(() => {
        onBloqueoCambio?.(bloqueado)

        return () => onBloqueoCambio?.(false)
    }, [bloqueado, onBloqueoCambio])

    // Consulta la tarifa e ignora respuestas de selecciones anteriores.
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

    // Recupera el viaje que ya existe, sin crear otro.
    async function verViajeActivo() {
        if (consultandoViaje || enviando.current) return

        enviando.current = true
        setConsultandoViaje(true)
        setErrorEnvio('')

        try {
            const actual = await viajeService.consultarActual()

            if (!actual) {
                setErrorEnvio(
                    'No tienes un viaje activo en este momento.'
                )
                return
            }

            setSolicitud(actual)
            setEstadoEnvio('enviado')
        } catch (errorConsulta) {
            setErrorEnvio(mensajeViaje(errorConsulta))
        } finally {
            enviando.current = false
            setConsultandoViaje(false)
        }
    }

    // Envía la solicitud y conserva el mismo intento al reintentar.
    async function confirmar() {
        if (
            enviando.current ||
            consultandoViaje ||
            solicitud
        ) {
            return
        }

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
        return (
            <BusquedaViaje
                solicitud={solicitud}
                onReintentar={onReintentar}
                onCambiarRecogida={onVolver}
            />
        )
    }

    return (
        <main
            className="app-card confirmacion-viaje"
            aria-busy={
                estadoEnvio === 'procesando' || consultandoViaje
            }
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

            {estadoEnvio === 'rechazado' && (
                <button
                    type="button"
                    className="btn-submit"
                    disabled={consultandoViaje}
                    onClick={verViajeActivo}
                >
                    {consultandoViaje
                        ? 'Consultando...'
                        : 'Ver mi viaje activo'}
                </button>
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
                        onClick={() => {
                            setRecarga(valor => valor + 1)
                        }}
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
                        consultandoViaje ||
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
                    {consultandoViaje
                        ? 'Espera mientras consultamos tu viaje activo.'
                        : 'Espera a resolver este envío antes de cambiar los puntos.'}
                </small>
            )}
        </main>
    )
}