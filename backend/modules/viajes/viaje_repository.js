export default class ViajeRepository {
    constructor(db) {
        this.db = db
    }

    async findById(id) {
        const { rows } = await this.db.query('SELECT * FROM solicitudes WHERE idSolicitud = $1', [
            id,
        ])
        return rows[0]
    }

    async finish(id, driverId) {
        const { rows } = await this.db.query(
            `
            UPDATE solicitudes SET estado = 'completada', finalizadoAt = now()
            WHERE idSolicitud = $1 AND idConductor = $2 AND estado = 'en_curso'
            RETURNING *
        `,
            [id, driverId],
        )
        return rows[0]
    }

    async cancel(id, userId) {
        const { rows } = await this.db.query(
            `
            WITH cancelled AS (
                UPDATE solicitudes SET estado = 'cancelada', pin = NULL
                WHERE idSolicitud = $1 AND (idUsuario = $2 OR idConductor = $2)
                AND estado IN ('buscando', 'aceptada', 'en_recogida') RETURNING *
            ), withdrawn AS (
                UPDATE ofertas SET estado = 'retirada'
                WHERE idSolicitud IN (SELECT idSolicitud FROM cancelled) AND estado = 'vigente'
            )
            SELECT * FROM cancelled
        `,
            [id, userId],
        )
        return rows[0]
    }

    async confirmPayment(id, driverId) {
        const { rows } = await this.db.query(
            `
            UPDATE solicitudes SET pagoConfirmado = true
            WHERE idSolicitud = $1 AND idConductor = $2 AND estado = 'completada'
            RETURNING *
        `,
            [id, driverId],
        )
        return rows[0]
    }

    async rate(id, userId, stars) {
        const { rows } = await this.db.query(
            `
            UPDATE solicitudes SET calificacion = $3
            WHERE idSolicitud = $1 AND idUsuario = $2 AND estado = 'completada'
            AND calificacion IS NULL RETURNING *
        `,
            [id, userId, stars],
        )
        return rows[0]
    }

    async createReport(id, userId, description) {
        const { rows } = await this.db.query(
            `
            INSERT INTO reportes(idSolicitud, idUsuario, descripcion)
            VALUES ($1, $2, $3) RETURNING idReporte AS id, createAt
        `,
            [id, userId, description],
        )
        return rows[0]
    }

    async findHistory(userId) {
        const { rows } = await this.db.query(
            `
            SELECT s.*, u.nombre AS conductorNombre, c.placaVehiculo
            FROM solicitudes s
            LEFT JOIN usuarios u ON u.idUsuario = s.idConductor
            LEFT JOIN conductores c ON c.idUsuario = s.idConductor
            WHERE (s.idUsuario = $1 OR s.idConductor = $1)
            AND s.estado IN ('completada', 'cancelada')
            ORDER BY s.createAt DESC LIMIT 50
        `,
            [userId],
        )
        return rows
    }

    async findEarnings(driverId) {
        const { rows } = await this.db.query(
            `
            SELECT COALESCE(SUM(tarifaAcordada) FILTER (WHERE pagoConfirmado), 0) AS recibido,
                COALESCE(SUM(tarifaAcordada) FILTER (WHERE NOT pagoConfirmado), 0) AS pendiente
            FROM solicitudes WHERE idConductor = $1 AND estado = 'completada'
        `,
            [driverId],
        )
        return { received: Number(rows[0].recibido), pending: Number(rows[0].pendiente) }
    }
}
