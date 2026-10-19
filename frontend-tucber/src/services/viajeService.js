import { api } from '../config/api'

export function prepararPuntos(seleccion) {
    const convertirPunto = ({ lat, lng }) => {
        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        ) {
            throw new Error('Selecciona dos ubicaciones válidas.')
        }

        return {
            latitude: lat,
            longitude: lng
        }
    }

    return {
        origin: convertirPunto(seleccion.origen),
        destination: convertirPunto(seleccion.destino)
    }
}

export const viajeService = {
    async cotizar(seleccion, signal) {
        const puntos = prepararPuntos(seleccion)

        const { data } = await api.post(
            '/tarifas/cotizacion',
            puntos,
            {
                signal,
                timeout: 30000
            }
        )

        const coincide = (recibido, enviado) =>
            recibido?.latitude === enviado.latitude &&
            recibido?.longitude === enviado.longitude

        if (
            !Number.isFinite(data.amount) ||
            data.amount < 3 ||
            data.amount > 20 ||
            !Number.isFinite(data.distanceKm) ||
            data.distanceKm < 0 ||
            data.currency !== 'GTQ' ||
            !coincide(data.origin, puntos.origin) ||
            !coincide(data.destination, puntos.destination)
        ) {
            throw new Error(
                'El servidor no devolvió una cotización válida para estos puntos.'
            )
        }

        return data
    },

    async crearSolicitud(cuerpo) {
        const { data } = await api.post(
            '/solicitudes',
            cuerpo,
            { timeout: 30000 }
        )

        const solicitud = data?.solicitud

        const estadosValidos = [
            'buscando',
            'aceptada',
            'en_curso',
            'completada',
            'cancelada',
            'vencida'
        ]

        if (
            !Number.isInteger(solicitud?.id) ||
            solicitud.id <= 0 ||
            !estadosValidos.includes(solicitud.status) ||
            !Number.isFinite(Date.parse(solicitud.expiresAt))
        ) {
            const error = new Error(
                'La respuesta no incluye los datos necesarios de la solicitud.'
            )

            error.resultadoIncierto = true
            throw error
        }

        return solicitud
    }
}

export function crearIntento(
    seleccion,
    enviar = viajeService.crearSolicitud
) {
    const cuerpo = {
        ...prepararPuntos(seleccion),
        reference: seleccion.referenciaRecogida?.trim() || '',
        idempotencyKey: crypto.randomUUID()
    }

    let pendiente = null
    let resultado = null

    return {
        enviar() {
            if (resultado) {
                return Promise.resolve(resultado)
            }

            if (pendiente) {
                return pendiente
            }

            pendiente = Promise.resolve()
                .then(() => enviar(structuredClone(cuerpo)))
                .then(solicitud => {
                    resultado = solicitud
                    return solicitud
                })
                .finally(() => {
                    pendiente = null
                })

            return pendiente
        }
    }
}

export function resultadoIncierto(error) {
    return Boolean(
        error.resultadoIncierto ||
        !error.response ||
        error.response.status >= 500 ||
        error.response.status === 408
    )
}

export function mensajeViaje(error) {
    if ([401, 403].includes(error.response?.status)) {
        return 'Tu sesión no permite esta acción. Inicia sesión como cliente.'
    }

    return (
        error.response?.data?.message ||
        error.message ||
        'No se pudo completar la operación.'
    )
}