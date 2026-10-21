export default class SolicitudRepository {
    constructor(db) {
        this.db = db
    }

    async expireSearches() {
        const result = await this.db.query(`
            WITH expired AS (
                UPDATE solicitudes
                SET estado = 'vencida'
                WHERE estado = 'buscando' AND expiresAt <= now()
                RETURNING *
            ), released AS (
                UPDATE ofertas
                SET estado = 'expirada'
                WHERE estado = 'vigente'
                  AND (expiresAt <= now() OR idSolicitud IN (SELECT idSolicitud FROM expired))
            )
            SELECT * FROM expired
        `)
        return result.rows
    }

    async findByAttempt(idUsuario, idIntento) {
        const result = await this.db.query(
            `SELECT *
             FROM solicitudes
             WHERE idUsuario = $1 AND idIntento = $2`,
            [idUsuario, idIntento],
        )
        return result.rows[0] ? this.toSolicitud(result.rows[0], []) : null
    }

    async createWithProtection(data) {
        const client = await this.db.connect()
        try {
            await client.query('BEGIN')
            await client.query('SELECT pg_advisory_xact_lock($1)', [data.idUsuario])

            const existing = await client.query(
                `SELECT *
                 FROM solicitudes
                 WHERE idUsuario = $1 AND idIntento = $2`,
                [data.idUsuario, data.idIntento],
            )
            if (existing.rowCount === 1) {
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
                [data.idUsuario],
            )
            if (active.rowCount === 1) {
                const error = new Error('El cliente ya tiene un viaje activo')
                error.code = 'ACTIVE_REQUEST'
                error.status = 409
                throw error
            }

            const result = await client.query(
                `INSERT INTO solicitudes
                    (idUsuario, idIntento, origen, destino, referencia,
                     distanciaCotizadaMetros, tarifaAcordada, moneda, expiresAt, ruta)
                 VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8,
                         now() + make_interval(secs => $9), $10)
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
                    data.ttlSeconds,
                    data.route || null,
                ],
            )
            await client.query('COMMIT')
            return this.toSolicitud(result.rows[0], [])
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    }

    findByIdForUpdate(idSolicitud, tx) {
        const db = tx ?? this.db
        return db
            .query(
                `SELECT *
             FROM solicitudes
             WHERE idSolicitud = $1
             FOR UPDATE`,
                [idSolicitud],
            )
            .then((r) => r.rows[0] || null)
    }

    async findById(idSolicitud) {
        const { rows } = await this.db.query(`
            SELECT s.*, u.nombre AS conductorNombre, c.placaVehiculo
            FROM solicitudes s
            LEFT JOIN usuarios u ON u.idUsuario = s.idConductor
            LEFT JOIN conductores c ON c.idUsuario = s.idConductor
            WHERE s.idSolicitud = $1
        `, [idSolicitud])
        return rows[0] || null
    }

    async markArrived(id, driverId, pin) {
        const { rows } = await this.db.query(
            `
            UPDATE solicitudes SET estado = 'en_recogida', llegadaAt = now(), pin = $3
            WHERE idSolicitud = $1 AND idConductor = $2 AND estado = 'aceptada' RETURNING *
        `,
            [id, driverId, pin],
        )
        return rows[0]
    }

    async startTrip(id, driverId, pin) {
        const { rows } = await this.db.query(
            `
            UPDATE solicitudes SET estado = 'en_curso', iniciadoAt = now(), pin = NULL
            WHERE idSolicitud = $1 AND idConductor = $2 AND estado = 'en_recogida' AND pin = $3
            RETURNING *
        `,
            [id, driverId, pin],
        )
        return rows[0]
    }

    async findCurrentForClient(idUsuario) {
        const result = await this.db.query(
            `SELECT *
             FROM solicitudes
             WHERE idUsuario = $1
               AND estado IN ('buscando', 'aceptada', 'en_recogida', 'en_curso')
               AND (estado <> 'buscando' OR expiresAt > now())
             ORDER BY createAt DESC
             LIMIT 1`,
            [idUsuario],
        )
        return result.rows[0] || null
    }

    async findCurrentForDriver(idConductor) {
        const result = await this.db.query(
            `SELECT *
             FROM solicitudes
             WHERE idConductor = $1
               AND estado IN ('aceptada', 'en_recogida', 'en_curso')
             ORDER BY createAt DESC
             LIMIT 1`,
            [idConductor],
        )
        return result.rows[0] || null
    }

    toSolicitud(row, ofertas) {
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
            paymentConfirmed: row.pagoconfirmado ?? false,
            finishedAt: row.finalizadoat,
            rating: row.calificacion,
            driverName: row.conductornombre,
            vehiclePlate: row.placavehiculo,
            route: row.ruta,
            offers: ofertas,
        }
    }
}
