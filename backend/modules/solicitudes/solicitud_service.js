import TarifaService from '../tarifas/tarifa_service.js'

const REQUEST_TTL_SECONDS = 90

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
                const result = await client.query(
                    `UPDATE solicitudes
                        SET estado = 'en_recogida',
                            llegadaAt = COALESCE(llegadaAt, now()),
                            pin = COALESCE(pin, LPAD(floor(random()*1000000)::text, 6, '0'))
                      WHERE idSolicitud = $1
                        AND idConductor = $2
                        AND estado = 'aceptada'
                    RETURNING *`,
                    [idSolicitud, idConductor]
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
}
