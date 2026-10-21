import test from 'node:test'
import assert from 'node:assert/strict'
import { Pool } from 'pg'
import { runMigrations } from '../infrastructure/db/migrations/setup.js'
import SolicitudRepository from '../modules/solicitudes/solicitud_repository.js'
import SolicitudService from '../modules/solicitudes/solicitud_service.js'

test('searches expire after 60 seconds and release offers without altering assigned trips', async () => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })
    try {
        await runMigrations(pool)
        const { rows: [user] } = await pool.query(`
            INSERT INTO usuarios (nombre, correo, contrasenaHash, rol)
            VALUES ('Expiry test', $1, 'unused', 'cliente') RETURNING idUsuario
        `, [`expiry-${Date.now()}@test.local`])
        const repository = new SolicitudRepository(pool)
        const service = new SolicitudService(repository, {
            calculateQuote: async () => ({ distanceMeters: 1000, amount: 5, currency: 'GTQ' })
        })
        const request = await service.create(user.idusuario, {
            origin: { latitude: 14.63, longitude: -89.98 },
            destination: { latitude: 14.64, longitude: -89.98 },
            idempotencyKey: 'expiry-test'
        })
        assert.equal(new Date(request.expiresAt) - new Date(request.createdAt), 60000)
        await pool.query("UPDATE solicitudes SET expiresAt = now() - interval '1 second' WHERE idSolicitud = $1", [request.id])
        const expired = await repository.expireSearches()
        assert.ok(expired.some(row => row.idsolicitud === request.id))
        assert.equal(await service.getCurrent(user.idusuario), null)
        assert.deepEqual(await repository.expireSearches(), [])
        await pool.query("UPDATE solicitudes SET estado = 'aceptada' WHERE idSolicitud = $1", [request.id])
        await repository.expireSearches()
        assert.equal((await repository.findById(request.id)).estado, 'aceptada')
        await pool.query('DELETE FROM usuarios WHERE idUsuario = $1', [user.idusuario])
    } finally {
        await pool.end()
    }
})
