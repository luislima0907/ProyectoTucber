import { useEffect, useRef, useState } from 'react'
import {
    viajeService,
    mensajeViaje,
    resultadoIncierto
} from '../services/viajeService'
import '../css/ConfirmacionViaje.css'
import '../css/BusquedaViaje.css'
import { PerfilConductor } from '../components/PerfilConductor'
import { MapaSeleccion } from '../components/MapaSeleccion'

const INTERVALO_CONSULTA = 4000

export function BusquedaViaje({ solicitud, seleccion, onReintentar,
    onCambiarRecogida }) {
    const [solicitudActual, setSolicitudActual] = useState(solicitud)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [pinRecogida, setPinRecogida] = useState(null)
    const [errorPin, setErrorPin] = useState('')
    const [consultandoPin, setConsultandoPin] = useState(false)
    const [reintentoPin, setReintentoPin] = useState(0)
    const [actualizacion, setActualizacion] = useState(0)
    const [descartando, setDescartando] = useState(null)
    const [aceptando, setAceptando] = useState(null)
    const [aceptacionPendiente, setAceptacionPendiente] = useState(false)
    const [ahora, setAhora] = useState(Date.now())
    const [ofertaSeleccionadaId, setOfertaSeleccionadaId] = useState(null)
    const [mostrarCancelacion, setMostrarCancelacion] = useState(false)

    const accionEnCurso = useRef(false)

    // Consulta al abrir la pantalla o al presionar Actualizar.
    useEffect(() => {
        let pantallaActiva = true
        let temporizador
        const control = new AbortController()

        // No consultar mientras se está decidiendo sobre una oferta.
        if (
            aceptando !== null ||
            descartando !== null ||
            aceptacionPendiente
        ) {
            return
        }

        if (
            !['buscando', 'aceptada', 'en_recogida'].includes(
                solicitudActual?.status
            )
        ){
            setCargando(false)
            return
        }

        async function consultarOfertas() {
            setCargando(true)
            let continuar = true

            try {
                const actual = await viajeService.consultarActual(
                    control.signal
                )

                if (!pantallaActiva) return

                if (actual && actual.id !== solicitud.id) {
                    throw new Error(
                        'La solicitud activa no coincide con esta búsqueda.'
                    )
                }

                setSolicitudActual(actual)
                setError('')

                continuar = ['buscando', 'aceptada', 'en_recogida'].includes(
                    actual?.status
                )
            } catch (errorConsulta) {
                if (!pantallaActiva) return

                setError(
                    'No podemos confirmar el estado de tu solicitud. ' +
                    mensajeViaje(errorConsulta)
                )
            } finally {
                if (pantallaActiva) {
                    setCargando(false)

                    if (continuar) {
                        temporizador = setTimeout(
                            consultarOfertas,
                            INTERVALO_CONSULTA
                        )
                    }
                }
            }
        }

        consultarOfertas()

        return () => {
            pantallaActiva = false
            clearTimeout(temporizador)
            control.abort()
        }
    }, [
        solicitud.id,
        solicitudActual?.status,
        actualizacion,
        aceptando,
        descartando,
        aceptacionPendiente
    ])

    useEffect(() => {
        if (solicitudActual?.status !== 'en_recogida' || error) {
            setPinRecogida(null)
            setErrorPin('')
            setConsultandoPin(false)
            return
        }

        const control = new AbortController()
        let activo = true

        async function obtenerPin() {
            setConsultandoPin(true)
            setErrorPin('')

            try {
                const pin = await viajeService.consultarPin(
                    solicitudActual.id,
                    control.signal
                )

                if (activo) {
                    setPinRecogida(pin)
                }
            } catch (errorConsulta) {
                if (activo) {
                    setPinRecogida(null)
                    setErrorPin(
                        'No se pudo consultar el PIN. ' +
                        mensajeViaje(errorConsulta)
                    )
                }
            } finally {
                if (activo) {
                    setConsultandoPin(false)
                }
            }
        }

        obtenerPin()

        return () => {
            activo = false
            control.abort()
        }
    }, [solicitudActual?.id, solicitudActual?.status, error, reintentoPin])


    // Actualiza la hora para comprobar los vencimientos.
    useEffect(() => {
        const reloj = setInterval(() => {
            setAhora(Date.now())
        }, 1000)

        return () => clearInterval(reloj)
    }, [])

    const ofertas = solicitudActual?.offers ?? []

    const vencimiento = Date.parse(solicitudActual?.expiresAt)

    const segundosRestantes = Number.isFinite(vencimiento)
        ? Math.max(0, Math.ceil((vencimiento - ahora) / 1000))
        : null

    const plazoCumplido =
        solicitudActual?.status === 'buscando' &&
        segundosRestantes === 0
    const buscando =
        solicitudActual?.status === 'buscando' &&
        !plazoCumplido

    const ofertasVigentes = ofertas.filter(oferta =>
        oferta.status === 'vigente' &&
        Date.parse(oferta.expiresAt) > ahora
    )

    const ofertaSeleccionada = ofertasVigentes.find(
        oferta => oferta.id === ofertaSeleccionadaId
    )

    const hayOfertasVencidas = ofertas.some(oferta =>
        Date.parse(oferta.expiresAt) <= ahora
    )

    const accionesBloqueadas =
        cargando ||
        descartando !== null ||
        aceptando !== null ||
        aceptacionPendiente

    const nombreEstado = {
        buscando: 'Buscando conductor...',
        aceptada: 'Conductor asignado',
        en_recogida: 'Tu conductor ha llegado al punto de recogida',
        en_curso: 'Viaje en curso...',
        completada: 'Viaje finalizado',
        cancelada: 'Solicitud cancelada',
        vencida: 'Búsqueda finalizada'
    }

    // Comprueba el resultado cuando se pierde la respuesta de aceptación.
    async function comprobarAceptacion() {
        try {
            const actual = await viajeService.consultarActual()

            if (!actual || actual.id !== solicitud.id) {
                setError(
                    'No se pudo recuperar esta solicitud. ' +
                    'No aceptes otra oferta hasta comprobar su estado.'
                )
                return
            }

            setSolicitudActual(actual)

            if (
                actual.status === 'aceptada' ||
                actual.status === 'en_recogida' ||
                actual.status === 'en_curso'
            ) {
                setAceptacionPendiente(false)
                setError('')
            } else {
                setError(
                    'La aceptación aún no está confirmada. ' +
                    'Consulta nuevamente antes de tomar otra decisión.'
                )
            }
        } catch {
            setError(
                'No pudimos comprobar la aceptación. ' +
                'Intenta consultar el estado nuevamente.'
            )
        }
    }

    async function consultarAceptacionPendiente() {
        if (accionEnCurso.current) return

        accionEnCurso.current = true
        setCargando(true)

        try {
            await comprobarAceptacion()
        } finally {
            accionEnCurso.current = false
            setCargando(false)
        }
    }

    async function aceptarOferta(oferta) {
        if (accionEnCurso.current || accionesBloqueadas) return

        if (
            !buscando ||
            Date.parse(oferta.expiresAt) <= Date.now()
        ) {
            setError(
                'La oferta o el plazo de búsqueda venció. ' +
                'Actualiza para consultar el estado.'
            )
            return
        }

        accionEnCurso.current = true
        setAceptando(oferta.id)
        setError('')

        try {
            const actual = await viajeService.aceptarOferta(oferta.id)

            if (
                actual.id !== solicitud.id ||
                actual.status !== 'aceptada' ||
                !Number.isInteger(actual.assignedDriverId) ||
                actual.assignedDriverId !== oferta.driverId
            ) {
                const errorRespuesta = new Error(
                    'No se pudo comprobar el conductor asignado.'
                )

                errorRespuesta.resultadoIncierto = true
                throw errorRespuesta
            }

            setSolicitudActual(actual)
        } catch (errorAceptacion) {
            if (resultadoIncierto(errorAceptacion)) {
                setAceptacionPendiente(true)
                await comprobarAceptacion()
            } else {
                setError(mensajeViaje(errorAceptacion))

                // Recupera las ofertas vigentes conservando el error.
                try {
                    const actual = await viajeService.consultarActual()

                    if (!actual || actual.id === solicitud.id) {
                        setSolicitudActual(actual)
                    }
                } catch {
                    // Conserva el mensaje de la aceptación rechazada.
                }
            }
        } finally {
            accionEnCurso.current = false
            setAceptando(null)
        }
    }

    async function descartarOferta(idOferta) {
        if (accionEnCurso.current || accionesBloqueadas) return

        accionEnCurso.current = true
        setDescartando(idOferta)
        setError('')

        try {
            await viajeService.descartarOferta(idOferta)

            setSolicitudActual(actual => {
                if (!actual) return actual

                return {
                    ...actual,
                    offers: (actual.offers ?? []).filter(
                        oferta => oferta.id !== idOferta
                    )
                }
            })

            setActualizacion(valor => valor + 1)
        } catch (errorConsulta) {
            setError(mensajeViaje(errorConsulta))

            // Si la oferta ya no está disponible, recupera la lista.
            if (errorConsulta.response?.status === 409) {
                try {
                    const actual = await viajeService.consultarActual()

                    if (!actual || actual.id === solicitud.id) {
                        setSolicitudActual(actual)
                    }
                } catch {
                    // Conserva el mensaje del descarte rechazado.
                }
            }
        } finally {
            accionEnCurso.current = false
            setDescartando(null)
        }
    }

    const puedePrepararOtro =
        !cargando &&
        !error &&
        !aceptacionPendiente &&
        (
            solicitudActual === null ||
            solicitudActual?.status === 'vencida' ||
            solicitudActual?.status === 'cancelada'
        )

    return (
        <main className="app-card confirmacion-viaje">
            <h1 className="brand-title">
                {buscando
                    ? 'Búsqueda de conductor'
                    : 'Estado de tu solicitud'}
            </h1>
            <div className='busqueda-viaje-mapa'>
                <MapaSeleccion
                    origen={seleccion?.origen ?? solicitudActual?.origin}
                    destino={seleccion?.destino ?? solicitudActual?.destination}
                    ruta={seleccion?.cotizacion?.polyline}
                    soloLectura
                />
            </div>

            <p>Tu solicitud fue registrada correctamente.</p>

            <dl className="datos-confirmacion">
                <div>
                    <dt>Número de solicitud</dt>
                    <dd>{solicitud.id}</dd>
                </div>

                <div>
                    <dt>Estado de la solicitud</dt>
                    <dd>
                        {solicitudActual
                            ? plazoCumplido
                                ? 'Plazo cumplido; pendiente de actualizar'
                                : nombreEstado[solicitudActual.status] ||
                                  'Estado no disponible'
                            : 'Sin solicitud activa'}
                    </dd>
                </div>

                {solicitudActual?.status === 'buscando' && (
                    <div>
                        <dt>Tiempo restante de búsqueda</dt>
                        <dd>
                            {segundosRestantes === null
                                ? 'Tiempo no disponible'
                                : segundosRestantes > 0
                                    ? `${segundosRestantes} segundos`
                                    : 'Comprobando el estado de la búsqueda'}
                        </dd>
                    </div>
                )}
            </dl>

            <section>
                <h2>
                    {solicitudActual?.status === 'buscando'
                        ? 'Ofertas de conductores'
                        : 'Estado del viaje'}
                </h2>
                {buscando && !cargando && !error && (
                    <p role="status">
                        {ofertasVigentes.length === 0
                            ? 'Estamos buscando un conductor disponible.'
                            : 'Tienes ofertas disponibles para revisar.'}
                    </p>
                )}

                {cargando && (
                    <p role="status">Consultando solicitud...</p>
                )}

                {error && (
                    <p className="error-msg" role="alert">
                        {error}
                    </p>
                )}

                {plazoCumplido && (
                    <p role="status">
                        Se alcanzó el plazo de búsqueda.
                        Estamos consultando su estado con el servidor.
                    </p>
                )}

                {buscando && hayOfertasVencidas && (
                    <p role="status">
                        Una oferta venció. Puedes revisar las demás
                        o actualizar para consultar nuevas ofertas.
                    </p>
                )}

                {aceptacionPendiente && (
                    <button
                        type="button"
                        className="btn-oferta btn-actualizar"
                        disabled={aceptando !== null || cargando}
                        onClick={consultarAceptacionPendiente}
                    >
                        {cargando || aceptando !== null
                            ? 'Consultando...'
                            : 'Consultar estado de aceptación'}
                    </button>
                )}

                {solicitudActual?.status === 'aceptada' && (
                    <p role="status">
                        Tu viaje tiene un conductor asignado.
                    </p>
                )}

                {solicitudActual?.status === 'en_recogida' && !error &&(
                    <section className='aviso-llegada' aria-labelledby='titulo-llegada'>
                        <h3 id="titulo-llegada">¡Tu conductor ha llegado!</h3>

                        <p>
                            Tu conductor se encuentra en el punto de recogida.
                        </p>

                        <p>
                            Antes de subir, verifica que la placa y el vehiculo
                            coincidan con los datos del conductor asignado
                        </p>

                        <p>
                            Comprate tu PIN únicamente después de confirmar
                            que es el vehículo correcto.
                        </p>

                        {consultandoPin && (
                            <p role="status">Consultando PIN de recogida...</p>
                        )}


                        {errorPin && (
                            <div>
                                <p className="error-msg" role="alert">
                                    {errorPin}
                                </p>

                                <button
                                    type="button"
                                    className="btn-oferta btn-actualizar"
                                    disabled={consultandoPin}
                                    onClick={() => setReintentoPin(valor => valor + 1)}
                                >
                                    Reintentar consulta del PIN
                                </button>
                            </div>
                        )}

                        {pinRecogida && !error && (
                            <div className="pin-recogida">
                                <h4>PIN de recogida</h4>
                                <p className="pin-recogida-codigo">{pinRecogida}</p>
                                <p>
                                    Comparte este código únicamente con el conductor
                                    asignado, después de verificar su vehículo.
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {!cargando && !error && !solicitudActual && (
                    <p>No tienes una solicitud activa.</p>
                )}

                {!cargando &&
                    buscando &&
                    ofertasVigentes.length === 0 && (
                        <p>Las ofertas aparecerán aquí cuando estén disponibles</p>
                    )}

                {!cargando && buscando && !ofertaSeleccionada && (
                    ofertasVigentes.map(oferta => (
                        <article key={oferta.id} className="oferta-viaje">
                            <h3>Oferta #{oferta.id}</h3>

                            <p>
                                Tarifa: Q{Number(oferta.amount).toFixed(2)}
                            </p>

                            <p>
                                Disponible hasta:{' '}
                                {new Date(oferta.expiresAt)
                                    .toLocaleTimeString('es-GT')}
                            </p>

                            <button
                                type="button"
                                className="btn-oferta btn-actualizar"
                                disabled={accionesBloqueadas}
                                onClick={() => setOfertaSeleccionadaId(oferta.id)}
                            >
                                Revisar conductor
                            </button>
                        </article>
                    ))
                )}

                {!cargando && buscando && ofertaSeleccionada && (
                    <PerfilConductor
                        oferta={ofertaSeleccionada}
                        perfil={null}
                        bloqueado={accionesBloqueadas}
                        aceptando={aceptando === ofertaSeleccionada.id}
                        descartando={descartando === ofertaSeleccionada.id}
                        onAceptar={() => aceptarOferta(ofertaSeleccionada)}
                        onDescartar={() => descartarOferta(ofertaSeleccionada.id)}
                        onVolver={() => setOfertaSeleccionadaId(null)}
                    />
                )}

                {solicitudActual?.status === 'buscando' && (
                    <button
                        type="button"
                        className="btn-oferta btn-actualizar"
                        disabled={accionesBloqueadas}
                        onClick={() => {
                            setActualizacion(valor => valor + 1)
                        }}
                    >
                        {cargando ? 'Consultando...' : 'Actualizar ofertas'}
                    </button>
                )}

                {puedePrepararOtro && (
                    <div className="acciones-oferta">
                        <button
                            type="button"
                            className="btn-oferta btn-aceptar"
                            disabled={!onReintentar}
                            onClick={onReintentar}
                        >
                            Volver a cotizar
                        </button>

                        <button
                            type="button"
                            className="btn-oferta btn-actualizar"
                            disabled={!onCambiarRecogida}
                            onClick={onCambiarRecogida}
                        >
                            Cambiar recogida
                        </button>
                    </div>
                )}

                {buscando && (
                    <div className="cancelacion-viaje">
                        {!mostrarCancelacion ? (
                            <button
                                type="button"
                                className="btn-oferta btn-descartar"
                                disabled={accionesBloqueadas}
                                onClick={() => setMostrarCancelacion(true)}
                            >
                                Cancelar búsqueda
                            </button>
                        ) : (
                            <div
                                className="confirmar-cancelacion"
                                role="region"
                                aria-labelledby="titulo-cancelacion"
                            >
                                <h3 id="titulo-cancelacion">
                                    ¿Quieres cancelar la búsqueda?
                                </h3>

                                <p>
                                    Al confirmar la cancelación, dejarías de buscar
                                    conductor para esta solicitud.
                                </p>

                                <p className="aviso-cancelacion">
                                    La cancelación todavía no está disponible.
                                    Tu búsqueda continúa activa hasta que termine
                                    su plazo o aceptes una oferta.
                                </p>

                                <div className="acciones-oferta">
                                    <button
                                        type="button"
                                        className="btn-oferta btn-actualizar"
                                        onClick={() => setMostrarCancelacion(false)}
                                    >
                                        Seguir buscando
                                    </button>

                                    <button
                                        type="button"
                                        className="btn-oferta btn-descartar"
                                        disabled
                                    >
                                        Confirmar cancelación
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </main>
    )
}