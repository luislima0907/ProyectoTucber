import crypto from 'crypto'
import TarifaService from '../tarifas/tarifa_service.js'

const REQUEST_TTL_SECONDS = 90

function generatePin4(){
    return String(crypto.randomInt(0, 10000)).padStart(4, '0')
}

export default class SolicitudService{
    constructor(repository, tarifaService = new TarifaService(process.env.GOOGLE_MAPS_API_KEY)){
        this.repository = repository
        this.tarifaService = tarifaService
    }

    async create(idUsuario, request){
        const existing = await this.repository.findByAttempt(idUsuario, request.idempotencyKey)
        if (existing){
            return existing
        }

        const quote = await this.tarifaService.calculateQuote(request.origin, request.destination)
        return this.repository.createWithProtection({
            idUsuario,
            idIntento: request.idempotencyKey,
            origen: request.origin,
            destino: request.destination,
            referencia: request.reference ?? null,
            distanceMeters: quote.distanceMeters,
            amount: quote.amount,
            currency: quote.currency,
            ttlSeconds: REQUEST_TTL_SECONDS
        })
    }

    async getCurrent(idUsuario){
        const row = await this.repository.findCurrentForClient(idUsuario)
        if (!row) return null
        return this.repository.toSolicitud(row, [])
    }

    async marcarLlegada(idConductor, idSolicitud){
        const client = await this.repository.db.connect()
        try{
            await client.query('BEGIN')
            const row = await this.repository.findByIdForUpdate(idSolicitud, client)
            if (!row){
                const error = new Error('La solicitud no existe')
                error.code = 'NOT_FOUND'
                throw error
            }
            if (Number(row.idconductor) !== Number(idConductor)){
                const error = new Error('No autorizado para marcar llegada en este viaje')
                error.code = 'FORBIDDEN'
                throw error
            }
            if (row.estado === 'en_recogida' || row.llegadaat){
                await client.query('COMMIT')
                return this.repository.toSolicitud(row, [])
            }
            if (row.estado === 'aceptada'){
                const pin = generatePin4()
                const result = await client.query(
                    `UPDATE solicitudes
                        SET estado = 'en_recogida',
                            llegadaAt = COALESCE(llegadaAt, now()),
                            pin = COALESCE(pin, $3),
                            "pinIntentosFallidos" = 0,
                            "pinBloqueadoHasta" = NULL,
                            "pinConsumido" = false
                      WHERE idSolicitud = $1
                        AND idConductor = $2
                        AND estado = 'aceptada'
                    RETURNING *`,
                    [idSolicitud, idConductor, pin]
                )
                await client.query('COMMIT')
                if (result.rows[0]){
                    return this.repository.toSolicitud(result.rows[0], [])
                }
                const refreshed = await this.repository.findById(idSolicitud)
                return refreshed ? this.repository.toSolicitud(refreshed, []) : null
            }
            if (row.estado === 'en_curso'){
                await client.query('COMMIT')
                return this.repository.toSolicitud(row, [])
            }
            if (row.estado === 'cancelada' || row.estado === 'completada' || row.estado === 'vencida'){
                const error = new Error('No se puede marcar llegada: el viaje ya no está asignado')
                error.code = 'CONFLICT'
                throw error
            }
            const error = new Error('No se puede marcar llegada en el estado actual')
            error.code = 'CONFLICT'
            throw error
        }catch(error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    }

    async obtenerPin(idUsuario, idSolicitud){
        const row = await this.repository.findById(idSolicitud)
        if (!row){
            const error = new Error('La solicitud no existe')
            error.code = 'NOT_FOUND'
            throw error
        }
        if (Number(row.idusuario) !== Number(idUsuario)){
            const error = new Error('No autorizado para consultar el PIN de este viaje')
            error.code = 'FORBIDDEN'
            throw error
        }
        if (!row.llegadaat){
            const error = new Error('El conductor aún no ha marcado su llegada')
            error.code = 'CONFLICT'
            throw error
        }
        if (row.estado === 'cancelada' || row.estado === 'completada' || row.estado === 'vencida'){
            const error = new Error('El PIN no está disponible para este viaje')
            error.code = 'CONFLICT'
            throw error
        }
        return { pin: row.pin }
    }

    async validarPin(idConductor, idSolicitud, pin){
        if (!/^\d{4}$/.test(pin)){
            const error = new Error('El PIN debe tener 4 dígitos')
            error.code = 'BAD_REQUEST'
            throw error
        }
        const client = await this.repository.db.connect()
        try{
            await client.query('BEGIN')
            const row = await this.repository.findByIdForUpdate(idSolicitud, client)
            if (!row){
                const error = new Error('La solicitud no existe')
                error.code = 'NOT_FOUND'
                throw error
            }
            if (Number(row.idconductor) !== Number(idConductor)){
                const error = new Error('No autorizado para validar el PIN de este viaje')
                error.code = 'FORBIDDEN'
                throw error
            }
            if (row.estado !== 'en_recogida' || !row.llegadaat){
                const error = new Error('El viaje no está en estado de recogida')
                error.code = 'CONFLICT'
                throw error
            }
            if (row.pinconsumido){
                const error = new Error('El PIN ya fue utilizado')
                error.code = 'CONFLICT'
                throw error
            }
            if (row.pinbloqueadohasta && new Date(row.pinbloqueadohasta) > new Date()){
                const error = new Error('El PIN está bloqueado temporalmente')
                error.code = 'CONFLICT'
                throw error
            }
            if (row.pin !== pin){
                const nuevosIntentos = (row.pinintentosfallidos || 0) + 1
                let bloqueoHasta = null
                if (nuevosIntentos >= 5){
                    bloqueoHasta = new Date(Date.now() + 5 * 60 * 1000)
                }
                await client.query(
                    `UPDATE solicitudes
                       SET "pinIntentosFallidos" = $1,
                           "pinBloqueadoHasta" = $2
                     WHERE idSolicitud = $3`,
                    [nuevosIntentos, bloqueoHasta, idSolicitud]
                )
                await client.query('COMMIT')
                const error = new Error('PIN incorrecto')
                error.code = 'CONFLICT'
                throw error
            }
            const result = await client.query(
                `UPDATE solicitudes
                   SET estado = 'en_curso',
                       "iniciadoAt" = now(),
                       "pinConsumido" = true,
                       "pinIntentosFallidos" = 0,
                       "pinBloqueadoHasta" = NULL
                 WHERE idSolicitud = $1
                 RETURNING *`,
                [idSolicitud]
            )
            await client.query('COMMIT')
            if (result.rows[0]){
                return this.repository.toSolicitud(result.rows[0], [])
            }
            const refreshed = await this.repository.findById(idSolicitud)
            return refreshed ? this.repository.toSolicitud(refreshed, []) : null
        }catch(error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    }
}
