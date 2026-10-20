import { useEffect, useRef, useState } from 'react'
import {
    viajeService,
    mensajeViaje,
    resultadoIncierto
} from '../services/viajeService'
import '../css/ConfirmacionViaje.css'
import '../css/BusquedaViaje.css'
import { PerfilConductor } from '../components/PerfilConductor'

export function BusquedaViaje({ solicitud }) {
    const [solicitudActual, setSolicitudActual] = useState(solicitud)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [actualizacion, setActualizacion] = useState(0)
    const [descartando, setDescartando] = useState(null)
    const [aceptando, setAceptando] = useState(null)
    const [aceptacionPendiente, setAceptacionPendiente] = useState(false)
    const [ahora, setAhora] = useState(Date.now())
    const [ofertaSeleccionadaId, setOfertaSeleccionadaId] = useState(null)

    const accionEnCurso = useRef(false)

    // Consulta al abrir la pantalla o al presionar Actualizar.
    useEffect(() => {
        let pantallaActiva = true

        async function consultarOfertas() {
            setCargando(true)
            setError('')

            try {
                const actual = await viajeService.consultarActual()

                if (!pantallaActiva) return

                if (actual && actual.id !== solicitud.id) {
                    throw new Error(
                        'La solicitud activa no coincide con esta búsqueda.'
                    )
                }

                setSolicitudActual(actual)
            } catch (errorConsulta) {
                if (pantallaActiva) {
                    setError(mensajeViaje(errorConsulta))
                }
            } finally {
                if (pantallaActiva) {
                    setCargando(false)
                }
            }
        }

        consultarOfertas()

        return () => {
            pantallaActiva = false
        }
    }, [solicitud.id, actualizacion])

    // Actualiza la hora para comprobar los vencimientos.
    useEffect(() => {
        const reloj = setInterval(() => {
            setAhora(Date.now())
        }, 1000)

        return () => clearInterval(reloj)
    }, [])

    const ofertas = solicitudActual?.offers ?? []

    const plazoCumplido =
        solicitudActual?.status === 'buscando' &&
        ahora >= Date.parse(solicitudActual.expiresAt)

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

    return (
        <main className="app-card confirmacion-viaje">
            <h1 className="brand-title">
                {buscando
                    ? 'Búsqueda de conductor'
                    : 'Estado de tu solicitud'}
            </h1>

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
                        <dt>Vencimiento de búsqueda</dt>
                        <dd>
                            {new Date(solicitudActual.expiresAt)
                                .toLocaleString('es-GT')}
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
                        Actualiza para comprobar el estado de tu solicitud.
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

                {!cargando && !error && !solicitudActual && (
                    <p>No tienes una solicitud activa.</p>
                )}

                {!cargando &&
                    buscando &&
                    ofertasVigentes.length === 0 && (
                        <p>Aún no hay ofertas vigentes de conductores.</p>
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
            </section>
        </main>
    )
}