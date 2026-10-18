export default class SolicitudRepository{
    constructor(db){
        this.db = db
    }

    async findByAttempt(idUsuario, idIntento){
        const result = await this.db.query(
            `SELECT *
             FROM solicitudes
             WHERE idUsuario = $1 AND idIntento = $2`,
            [idUsuario, idIntento]
        )
        return result.rows[0] ? this.toSolicitud(result.rows[0], []) : null
    }

    async createWithProtection(data){
        const client = await this.db.connect()
        try{
            await client.query('BEGIN')
            await client.query('SELECT pg_advisory_xact_lock($1)', [data.idUsuario])

            const existing = await client.query(
                `SELECT *
                 FROM solicitudes
                 WHERE idUsuario = $1 AND idIntento = $2`,
                [data.idUsuario, data.idIntento]
            )
            if (existing.rowCount === 1){
                await client.query('COMMIT')
                return this.toSolicitud(existing.rows[0], [])
            }

            const active = await client.query(
                `SELECT 1
                 FROM solicitudes
                 WHERE idUsuario = $1
                   AND estado IN ('buscando', 'aceptada', 'en_curso')
                   AND (estado <> 'buscando' OR expiresAt > now())
                 LIMIT 1`,
                [data.idUsuario]
            )
            if (active.rowCount === 1){
                const error = new Error('El cliente ya tiene un viaje activo')
                error.code = 'ACTIVE_REQUEST'
                throw error
            }

            const result = await client.query(
                `INSERT INTO solicitudes
                    (idUsuario, idIntento, origen, destino, referencia,
                     distanciaCotizadaMetros, tarifaAcordada, moneda, expiresAt)
                 VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8,
                         now() + make_interval(secs => $9))
                 RETURNING *`,
                [
                    data.idUsuario,
                    data.idIntento,
                    JSON.stringify(data.origen),
                    JSON.stringify(data.destino),
                    data.referencia,
                    data.distanceMeters,
                    data.amount,
                    data.currency,
                    data.ttlSeconds
                ]
            )
            await client.query('COMMIT')
            return this.toSolicitud(result.rows[0], [])
        }catch(error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    }

    async findCurrentWithOffers(idUsuario){
        const result = await this.db.query(
            `SELECT
                s.*,
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'id', o.idOferta,
                            'driverId', o.idConductor,
                            'amount', o.tarifa,
                            'status', o.estado,
                            'createdAt', o.createAt,
                            'expiresAt', o.expiresAt
                        ) ORDER BY o.createAt
                    ) FILTER (WHERE o.idOferta IS NOT NULL AND o.estado = 'vigente' AND o.expiresAt > now()),
                    '[]'::jsonb
                ) AS ofertas
             FROM solicitudes s
             LEFT JOIN ofertas o ON o.idSolicitud = s.idSolicitud
             WHERE s.idUsuario = $1
               AND s.estado IN ('buscando', 'aceptada', 'en_curso')
               AND (s.estado <> 'buscando' OR s.expiresAt > now())
             GROUP BY s.idSolicitud
             ORDER BY s.createAt DESC
             LIMIT 1`,
            [idUsuario]
        )
        const row = result.rows[0]
        return row ? this.toSolicitud(row, row.ofertas) : null
    }

    toSolicitud(row, ofertas){
        return {
            id: row.idsolicitud,
            origin: row.origen,
            destination: row.destino,
            reference: row.referencia,
            distanceMeters: row.distanciacotizadametros,
            amount: Number(row.tarifaacordada),
            currency: row.moneda,
            status: row.estado,
            createdAt: row.createat,
            expiresAt: row.expiresat,
            offers: ofertas
        }
    }
}
