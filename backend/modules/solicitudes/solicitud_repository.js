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
                   AND estado IN ('buscando', 'aceptada', 'en_recogida', 'en_curso')
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

    findByIdForUpdate(idSolicitud, tx){
        const db = tx ?? this.db
        return db.query(
            `SELECT *
             FROM solicitudes
             WHERE idSolicitud = $1
             FOR UPDATE`,
            [idSolicitud]
        ).then(r => r.rows[0] || null)
    }

    findById(idSolicitud){
        return this.db.query(
            `SELECT *
            FROM solicitudes
            WHERE idSolicitud = $1`,
            [idSolicitud]
        ).then(r => r.rows[0] || null)
    }

    async markArrived(idSolicitud, idConductor, tx){
        const db = tx ?? this.db
        const result = await db.query(
            `UPDATE solicitudes
                SET estado = 'en_recogida',
                    llegadaAt = COALESCE(llegadaAt, now()),
                    pin = COALESCE(pin, LPAD(floor(random()*10000)::text, 4, '0'))
              WHERE idSolicitud = $1
                AND idConductor = $2
                AND estado = 'aceptada'
            RETURNING *`,
            [idSolicitud, idConductor]
        )
        return result.rows[0] ? this.toSolicitud(result.rows[0], []) : null
    }

    async findCurrentForClient(idUsuario){
        const result = await this.db.query(
            `SELECT *
             FROM solicitudes
             WHERE idUsuario = $1
               AND estado IN ('buscando', 'aceptada', 'en_recogida', 'en_curso')
               AND (estado <> 'buscando' OR expiresAt > now())
             ORDER BY createAt DESC
             LIMIT 1`,
            [idUsuario]
        )
        return result.rows[0] || null
    }

    async findCurrentForDriver(idConductor){
        const result = await this.db.query(
            `SELECT *
             FROM solicitudes
             WHERE idConductor = $1
               AND estado IN ('aceptada', 'en_recogida', 'en_curso')
             ORDER BY createAt DESC
             LIMIT 1`,
            [idConductor]
        )
        return result.rows[0] || null
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
            llegadaAt: row.llegadaat,
            iniciadoAt: row.iniciadoat,
            driverId: row.idconductor,
            offers: ofertas
        }
    }
}
