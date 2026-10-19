const OFFER_TTL_SECONDS = 60

export default class OfertaRepository{
    constructor(db){
        this.db = db
    }

    async createWithProtection({ idConductor, idSolicitud }){
        const client = await this.db.connect()
        try{
            await client.query('BEGIN')
            await client.query('SELECT pg_advisory_xact_lock($1)', [idConductor])

            const disponible = await client.query(
                `SELECT 1
                 FROM conductores
                 WHERE idUsuario = $1 AND disponible = TRUE
                 LIMIT 1`,
                [idConductor]
            )
            if (disponible.rowCount !== 1){
                const error = new Error('El conductor no está disponible para ofertar')
                error.code = 'DRIVER_UNAVAILABLE'
                throw error
            }

            const activeTrip = await client.query(
                `SELECT 1
                 FROM solicitudes
                 WHERE idConductor = $1
                   AND estado IN ('aceptada', 'en_curso')
                 LIMIT 1`,
                [idConductor]
            )
            if (activeTrip.rowCount === 1){
                const error = new Error('El conductor ya tiene un viaje activo')
                error.code = 'ACTIVE_TRIP'
                throw error
            }

            const solicitud = await client.query(
                `SELECT *
                 FROM solicitudes
                 WHERE idSolicitud = $1`,
                [idSolicitud]
            )
            if (solicitud.rowCount !== 1){
                const error = new Error('La solicitud no existe')
                error.code = 'REQUEST_NOT_FOUND'
                throw error
            }
            const row = solicitud.rows[0]
            if (row.estado !== 'buscando' || row.idconductor !== null || new Date(row.expiresat) <= new Date()){
                const error = new Error('La solicitud ya no está disponible para recibir ofertas')
                error.code = 'REQUEST_NOT_AVAILABLE'
                throw error
            }

            const activeOffer = await client.query(
                `SELECT *
                 FROM ofertas
                 WHERE idConductor = $1
                   AND estado = 'vigente'
                   AND expiresAt > now()
                 LIMIT 1`,
                [idConductor]
            )
            if (activeOffer.rowCount === 1){
                if (activeOffer.rows[0].idsolicitud === idSolicitud){
                    await client.query('COMMIT')
                    return { oferta: this.toOferta(activeOffer.rows[0]), created: false }
                }
                const error = new Error('El conductor ya tiene una oferta activa')
                error.code = 'ACTIVE_OFFER'
                throw error
            }

            const result = await client.query(
                `INSERT INTO ofertas (idSolicitud, idConductor, tarifa, estado, expiresAt)
                 SELECT s.idSolicitud, $1, s.tarifaAcordada, 'vigente',
                        LEAST(now() + make_interval(secs => $2), s.expiresAt)
                 FROM solicitudes s
                 WHERE s.idSolicitud = $3
                 RETURNING *`,
                [idConductor, OFFER_TTL_SECONDS, idSolicitud]
            )
            await client.query('COMMIT')
            return { oferta: this.toOferta(result.rows[0]), created: true }
        }catch(error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    }

    toOferta(row){
        return {
            id: row.idoferta,
            status: row.estado,
            expiresAt: row.expiresat
        }
    }
}
