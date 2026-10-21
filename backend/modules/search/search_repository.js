import HttpError from '../../common/http_error.js'

export default class SearchRepository {
    constructor(db) {
        this.db = db
    }

    async findPending() {
        const { rows } = await this.db.query(`
            SELECT * FROM solicitudes
            WHERE estado = 'buscando' AND expiresAt > now()
            ORDER BY createAt
        `)
        return rows
    }

    async findAvailableDrivers() {
        const { rows } = await this.db.query(`
            SELECT c.idUsuario FROM conductores c
            WHERE c.disponible = true AND NOT EXISTS (
                SELECT 1 FROM solicitudes s WHERE s.idConductor = c.idUsuario
                AND s.estado IN ('aceptada', 'en_recogida', 'en_curso')
            )
        `)
        return rows.map(row => row.idusuario)
    }

    async accept(idConductor, idSolicitud) {
        const client = await this.db.connect()
        try {
            await client.query('BEGIN')
            const { rows: [driver] } = await client.query(
                'SELECT disponible FROM conductores WHERE idUsuario = $1 FOR UPDATE',
                [idConductor]
            )
            if (!driver?.disponible) throw new HttpError(409, 'Activa tu disponibilidad primero.')
            const { rowCount } = await client.query(`
                SELECT 1 FROM solicitudes WHERE idConductor = $1
                AND estado IN ('aceptada', 'en_recogida', 'en_curso')
            `, [idConductor])
            if (rowCount) throw new HttpError(409, 'Ya tienes un viaje activo.')
            const { rows: [trip] } = await client.query(`
                UPDATE solicitudes SET idConductor = $1, estado = 'aceptada'
                WHERE idSolicitud = $2 AND estado = 'buscando' AND expiresAt > now()
                RETURNING *
            `, [idConductor, idSolicitud])
            if (!trip) throw new HttpError(409, 'Otro conductor aceptó o la búsqueda terminó.')
            await client.query('UPDATE conductores SET disponible = false WHERE idUsuario = $1', [idConductor])
            await client.query("UPDATE ofertas SET estado = 'retirada' WHERE idSolicitud = $1 AND estado = 'vigente'", [idSolicitud])
            await client.query('COMMIT')
            return trip
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    }
}
