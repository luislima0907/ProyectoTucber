
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

        consultarSolicitudes()

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
                        <article
                            className="solicitudes-viaje"
                            key={solicitud.id}
                        >
                            <div className="solicitudes-viaje-titulo">
                                <h4>Solicitud #{solicitud.id}</h4>
                                <span>Buscando conductor</span>
                            </div>

                            <div className="solicitudes-viaje-datos">
                                <div>
                                    <span>Zona de origen aproximada</span>
                                    <strong>
                                        {formatearZona(solicitud.originZone)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Zona de destino aproximada</span>
                                    <strong>
                                        {formatearZona(solicitud.destinationZone)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Distancia estimada</span>
                                    <strong>
                                        {formatearDistancia(solicitud.distanceMeters)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Tarifa</span>
                                    <strong>
                                        {formatearMonto(
                                            solicitud.amount,
                                            solicitud.currency
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    )
}
