
import { useCallback, useEffect, useRef, useState } from 'react'
import { driverService } from '../services/driverService'

const POLLING_INTERVAL = 10000

function obtenerMensajeError(error, mensajePredeterminado) {
    return error.response?.data?.message
        || error.response?.data?.error
        || mensajePredeterminado
}

function formatearMonto(monto, moneda) {
    if (monto === null || monto === undefined) return 'No disponible'

    const cantidad = Number(monto)

    if (!Number.isFinite(cantidad)) return 'No disponible'

    return new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: moneda || 'GTQ'
    }).format(cantidad)
}

function formatearZona(zona) {
    if (
        !zona ||
        zona.latitude === null ||
        zona.latitude === undefined ||
        zona.longitude === null ||
        zona.longitude === undefined
    ) {
        return 'Zona no disponible'
    }

    return `${zona.latitude}, ${zona.longitude}`
}

function formatearDistancia(metros) {
    if (metros === null || metros === undefined) {
        return 'No disponible'
    }

    const distancia = Number(metros)

    if (!Number.isFinite(distancia)) {
        return 'No disponible'
    }

    return `${(distancia / 1000).toFixed(2)} km`
}

function TarjetaSolicitud({ solicitud, disponible }) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [oferta, setOferta] = useState(null)
    const [tiempoRestante, setTiempoRestante] = useState(30)
    const [errorOferta, setErrorOferta] = useState('')
    const [prevDisponible, setPrevDisponible] = useState(disponible)

    const timerRef = useRef(null)
    const pollingRef = useRef(null)

    if (prevDisponible !== disponible) {
        setPrevDisponible(disponible)
        if (!disponible) {
            setOferta(null)
            setTiempoRestante(null)
            setErrorOferta('')
        }
    }

    const handleOfrecerme = async () => {
        if (isSubmitting || oferta?.status === 'PENDING' || oferta?.status === 'vigente') return

        setIsSubmitting(true)
        setErrorOferta('')

        try {
            const res = await driverService.submitOffer(solicitud.id)
            const ofertaData = res?.oferta || res
            const statusNormalizado = ofertaData?.status || ofertaData?.estado || 'vigente'
            let segundosRestantes = 30
            if (ofertaData?.expiresAt) {
                const diff = Math.floor((new Date(ofertaData.expiresAt).getTime() - Date.now()) / 1000)
                if (diff > 0) segundosRestantes = diff
            }

            setOferta({
                ...ofertaData,
                status: statusNormalizado
            })
            setTiempoRestante(segundosRestantes)
        } catch (err) {
            console.error('Error al hacer oferta:', err)
            setErrorOferta(
                obtenerMensajeError(err, 'La solicitud ya no está disponible.')
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    useEffect(() => {
        const esOfertaActiva = oferta?.status === 'PENDING' || oferta?.status === 'vigente'

        if (esOfertaActiva && tiempoRestante > 0) {
            timerRef.current = setInterval(() => {
                setTiempoRestante((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current)
                        setOferta((prevOferta) => 
                            prevOferta ? { ...prevOferta, status: 'EXPIRED' } : null
                        )
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }

        return () => clearInterval(timerRef.current)
    }, [oferta?.status, tiempoRestante])

    useEffect(() => {
        const esOfertaActiva = oferta?.status === 'PENDING' || oferta?.status === 'vigente'

        if (esOfertaActiva && oferta?.id) {
            pollingRef.current = setInterval(async () => {
                try {
                    const res = await driverService.getOfferStatus(oferta.id)
                    if (res?.status === 'ACCEPTED') {
                        setOferta((prev) => ({ ...prev, status: 'ACCEPTED' }))
                        clearInterval(pollingRef.current)
                    } else if (res?.status === 'REJECTED' || res?.status === 'EXPIRED') {
                        setOferta((prev) => ({ ...prev, status: res.status }))
                        clearInterval(pollingRef.current)
                    }
                } catch{ 
                    clearInterval(pollingRef.current)
                }
            }, 3000)
        }
        return () => clearInterval(pollingRef.current)
    }, [oferta?.id, oferta?.status])

    return (
        <article className="solicitudes-viaje">
            <div className="solicitudes-viaje-titulo">
                <h4>Solicitud #{solicitud.id}</h4>
                <span>Buscando conductor</span>
            </div>

            <div className="solicitudes-viaje-datos">
                <div>
                    <span>Zona de origen aproximada</span>
                    <strong>{formatearZona(solicitud.originZone)}</strong>
                </div>

                <div>
                    <span>Zona de destino aproximada</span>
                    <strong>{formatearZona(solicitud.destinationZone)}</strong>
                </div>

                <div>
                    <span>Distancia estimada</span>
                    <strong>{formatearDistancia(solicitud.distanceMeters)}</strong>
                </div>

                <div>
                    <span>Tarifa</span>
                    <strong>
                        {formatearMonto(solicitud.amount, solicitud.currency)}
                    </strong>
                </div>
            </div>

            {errorOferta && (
                <p className="solicitudes-error" role="alert" style={{ marginTop: '0.5rem' }}>
                    {errorOferta}
                </p>
            )}

            <div style={{ marginTop: '0.5rem' }}>
                {(!oferta || oferta.status === 'EXPIRED' || oferta.status === 'REJECTED') && (
                    <div>
                        {oferta?.status === 'EXPIRED' && (
                            <p style={{ color: '#d97706', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                La oferta ha expirado.
                            </p>
                        )}

                        {oferta?.status === 'REJECTED' && (
                            <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                La oferta fue rechazada.
                            </p>
                        )}

                        <button 
                            type="button" 
                            className="solicitudes-boton-principal" 
                            onClick={handleOfrecerme} 
                            disabled={isSubmitting || !disponible}
                        >   
                            {isSubmitting ? 'Enviando oferta...' : 'Ofrecerme'}
                        </button>
                    </div>
                )}

                {(oferta?.status === 'PENDING' || oferta?.status === 'vigente') && (
                    <div style={{ backgroundColor: '#fef3c7', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                        <strong style={{ color: '#b45309', display: 'block' }}>
                            Estado: Oferta Pendiente
                        </strong>
                        <span style={{ fontSize: '0.85rem', color: '#78350f' }}>
                            Vence aproximadamente en: <strong>{tiempoRestante}s</strong>
                        </span>
                    </div>
                )}

                {oferta?.status === 'ACCEPTED' && (
                    <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center' }}>
                        ¡Oferta Aceptada! Abriendo viaje asignado...
                    </div>
                )}
            </div>
        </article>
    )
}
export function SolicitudesDisponibles() {
    const [disponible, setDisponible] = useState(false)
    const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(true)
    const [cambiandoDisponibilidad, setCambiandoDisponibilidad] = useState(false)
    const [solicitudes, setSolicitudes] = useState([])
    const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false)
    const [errorDisponibilidad, setErrorDisponibilidad] = useState('')
    const [errorSolicitudes, setErrorSolicitudes] = useState('')

    const controladorRef = useRef(null)
    const consultaActivaRef = useRef(false)
    const generacionRef = useRef(0)
    const disponibleRef = useRef(false)
    const montadoRef = useRef(false)

    const consultarSolicitudes = useCallback(async () => {
        if (!disponibleRef.current || consultaActivaRef.current) {
            return
        }

        consultaActivaRef.current = true

        const generacion = generacionRef.current
        const controlador = new AbortController()

        controladorRef.current = controlador
        setCargandoSolicitudes(true)
        setErrorSolicitudes('')

        try {
            const resultado = await driverService.getPendingRequests({
                signal: controlador.signal
            })

            if (
                montadoRef.current &&
                generacion === generacionRef.current &&
                !controlador.signal.aborted
            ) {
                setSolicitudes(Array.isArray(resultado) ? resultado : [])
            }
        } catch (error) {
            if (
                montadoRef.current &&
                generacion === generacionRef.current &&
                !controlador.signal.aborted
            ) {
                setErrorSolicitudes(
                    obtenerMensajeError(
                        error,
                        'No fue posible consultar las solicitudes.'
                    )
                )
            }
        } finally {
            if (controladorRef.current === controlador) {
                controladorRef.current = null
            }

            if (generacion === generacionRef.current) {
                consultaActivaRef.current = false

                if (montadoRef.current) {
                    setCargandoSolicitudes(false)
                }
            }
        }
    }, [])

    useEffect(() => {
        montadoRef.current = true
        const controlador = new AbortController()

        async function cargarDisponibilidad() {
            try {
                const resultado = await driverService.getAvailability({
                    signal: controlador.signal
                })

                if (!controlador.signal.aborted) {
                    const estado = resultado.disponible === true

                    disponibleRef.current = estado
                    setDisponible(estado)
                }
            } catch (error) {
                if (!controlador.signal.aborted) {
                    setErrorDisponibilidad(
                        obtenerMensajeError(
                            error,
                            'No fue posible consultar tu disponibilidad.'
                        )
                    )
                }
            } finally {
                if (!controlador.signal.aborted) {
                    setCargandoDisponibilidad(false)
                }
            }
        }

        cargarDisponibilidad()

        return () => {
            montadoRef.current = false
            generacionRef.current += 1
            controlador.abort()
            controladorRef.current?.abort()
            controladorRef.current = null
            consultaActivaRef.current = false
        }
    }, [])

    useEffect(() => {
        if (!disponible) return

        queueMicrotask(() => {
        consultarSolicitudes()
        })

        const intervalo = window.setInterval(() => {
            consultarSolicitudes()
        }, POLLING_INTERVAL)

        return () => {
            window.clearInterval(intervalo)
            generacionRef.current += 1
            controladorRef.current?.abort()
            controladorRef.current = null
            consultaActivaRef.current = false
        }
    }, [disponible, consultarSolicitudes])

    async function cambiarDisponibilidad() {
        if (cambiandoDisponibilidad || cargandoDisponibilidad) return

        setCambiandoDisponibilidad(true)
        setErrorDisponibilidad('')

        try {
            const resultado = await driverService.updateAvailability(!disponible)

            if (!montadoRef.current) return

            const estadoConfirmado = resultado.disponible === true

            disponibleRef.current = estadoConfirmado
            setDisponible(estadoConfirmado)

            if (!estadoConfirmado) {
                generacionRef.current += 1
                controladorRef.current?.abort()
                controladorRef.current = null
                consultaActivaRef.current = false
                setSolicitudes([])
                setErrorSolicitudes('')
                setCargandoSolicitudes(false)
            }
        } catch (error) {
            if (montadoRef.current) {
                setErrorDisponibilidad(
                    obtenerMensajeError(
                        error,
                        'No fue posible cambiar tu disponibilidad.'
                    )
                )
            }
        } finally {
            if (montadoRef.current) {
                setCambiandoDisponibilidad(false)
            }
        }
    }

    return (
        <section className="solicitudes-conductor">
            <header className="solicitudes-encabezado">
                <div>
                    <h2>Solicitudes disponibles</h2>
                    <p>
                        Consulta los viajes que están buscando conductor.
                    </p>
                </div>

                <button
                    type="button"
                    className="solicitudes-boton-principal"
                    onClick={cambiarDisponibilidad}
                    disabled={cargandoDisponibilidad || cambiandoDisponibilidad}
                >
                    {cargandoDisponibilidad
                        ? 'Consultando disponibilidad...'
                        : cambiandoDisponibilidad
                            ? 'Guardando...'
                            : disponible
                                ? 'Dejar de estar disponible'
                                : 'Estar disponible'}
                </button>
            </header>

            <div className="solicitudes-resumen">
                <div>
                    <span>Mi disponibilidad</span>
                    <strong>
                        {cargandoDisponibilidad
                            ? 'Consultando...'
                            : errorDisponibilidad && !disponible
                                ? 'Sin confirmar'
                                : disponible
                                    ? 'Disponible'
                                    : 'No disponible'}
                    </strong>
                </div>

                <div>
                    <span>Solicitudes encontradas</span>
                    <strong>{solicitudes.length}</strong>
                </div>
            </div>

            {errorDisponibilidad && (
                <p className="solicitudes-error" role="alert">
                    {errorDisponibilidad}
                </p>
            )}

            <div className="solicitudes-listado-encabezado">
                <h3>Viajes pendientes</h3>

                <button
                    type="button"
                    className="solicitudes-boton-secundario"
                    onClick={consultarSolicitudes}
                    disabled={!disponible || cargandoSolicitudes}
                >
                    {cargandoSolicitudes ? 'Actualizando...' : 'Actualizar lista'}
                </button>
            </div>

            {!disponible ? (
                <div className="solicitudes-estado">
                    <h3>No estás disponible</h3>
                    <p>
                        Activa tu disponibilidad para consultar solicitudes de viaje.
                    </p>
                </div>
            ) : errorSolicitudes ? (
                <div className="solicitudes-estado">
                    <h3>No se pudieron cargar las solicitudes</h3>
                    <p role="alert">{errorSolicitudes}</p>
                    <button
                        type="button"
                        className="solicitudes-boton-secundario"
                        onClick={consultarSolicitudes}
                    >
                        Intentar nuevamente
                    </button>
                </div>
            ) : cargandoSolicitudes && solicitudes.length === 0 ? (
                <div className="solicitudes-estado">
                    <p>Buscando solicitudes disponibles...</p>
                </div>
            ) : solicitudes.length === 0 ? (
                <div className="solicitudes-estado">
                    <h3>No hay solicitudes disponibles</h3>
                    <p>
                        Puedes mantenerte disponible mientras llegan nuevas solicitudes.
                    </p>
                    <button
                        type="button"
                        className="solicitudes-boton-secundario"
                        onClick={consultarSolicitudes}
                    >
                        Seguir buscando
                    </button>
                </div>
            ) : (
                <div className="solicitudes-listado">
                    {solicitudes.map((solicitud) => (
                        <TarjetaSolicitud
                            key={solicitud.id}
                            solicitud={solicitud}
                            disponible={disponible}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
