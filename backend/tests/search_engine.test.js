import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'
import WebSocket from 'ws'
import { createApplication } from '../app.js'
import { runMigrations } from '../infrastructure/db/migrations/setup.js'
import SearchRepository from '../modules/search/search_repository.js'

function receive(socket, type, predicate = () => true) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            socket.off('message', listener)
            reject(new Error(`Missing event: ${type}`))
        }, 3000)
        function listener(bytes) {
            const message = JSON.parse(bytes)
            if (message.type !== type || !predicate(message.data)) return
            clearTimeout(timeout)
            socket.off('message', listener)
            resolve(message.data)
        }
        socket.on('message', listener)
    })
}

test('WebSocket broadcasts, assigns once under concurrency and restores after reconnect', async () => {
    process.env.JWT_SECRET = 'isolated-test-secret'
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173'
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })
    const sockets = []
    let server
    let searchEngine
    const ids = []
    try {
        await runMigrations(pool)
        for (const rol of ['cliente', 'conductor', 'conductor']) {
            const { rows: [user] } = await pool.query(`
                INSERT INTO usuarios(nombre, correo, contrasenaHash, rol)
                VALUES ('Search test', $1, 'unused', $2) RETURNING idUsuario
            `, [`search-${crypto.randomUUID()}@test.local`, rol])
            ids.push(user.idusuario)
            if (rol === 'conductor') await pool.query('INSERT INTO conductores(idUsuario, disponible) VALUES ($1, true)', [user.idusuario])
        }
        ;({ server, searchEngine } = createApplication(pool))
        server.listen(0)
        await once(server, 'listening')
        async function connect(id, rol) {
            const token = jwt.sign({ sub: id, rol }, process.env.JWT_SECRET, { expiresIn: '5m' })
            const socket = new WebSocket(`ws://localhost:${server.address().port}/search`, {
                headers: { Origin: process.env.FRONTEND_ORIGIN, Cookie: `tucber_session=${token}` }
            })
            sockets.push(socket)
            await once(socket, 'open')
            return socket
        }
        const customer = await connect(ids[0], 'cliente')
        const driver = await connect(ids[1], 'conductor')
        await connect(ids[2], 'conductor')
        const { rows: [request] } = await pool.query(`
            INSERT INTO solicitudes(idUsuario, idIntento, origen, destino, distanciaCotizadaMetros, tarifaAcordada, expiresAt)
            VALUES ($1, 'socket-test', '{"latitude":14.63,"longitude":-89.98}',
                '{"latitude":14.64,"longitude":-89.98}', 1000, 5, now() + interval '60 seconds') RETURNING *
        `, [ids[0]])
        const delivery = receive(driver, 'requests', data => data.some(item => item.id === request.idsolicitud))
        await searchEngine.broadcastPending()
        assert.equal((await delivery)[0].amount, 5)
        const repository = new SearchRepository(pool)
        const results = await Promise.allSettled([
            repository.accept(ids[1], request.idsolicitud),
            repository.accept(ids[2], request.idsolicitud)
        ])
        assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
        const winner = results.find(result => result.status === 'fulfilled').value
        const assigned = receive(customer, 'trip', data => data?.status === 'aceptada')
        searchEngine.publishTrip(winner)
        assert.equal((await assigned).driverId, winner.idconductor)
        const restored = receive(customer, 'trip')
        customer.send(JSON.stringify({ type: 'sync' }))
        assert.equal((await restored).id, request.idsolicitud)
        searchEngine.locations.set(ids[1], { latitude: 14.63, longitude: -89.98 })
        searchEngine.locations.set(ids[2], { latitude: 15, longitude: -90 })
        assert.equal(searchEngine.nearestDrivers(ids.slice(1), request.origen)[0], ids[1])
    } finally {
        sockets.forEach(socket => socket.terminate())
        searchEngine?.close()
        if (server) await new Promise(resolve => server.close(resolve))
        await pool.query('DELETE FROM solicitudes WHERE idUsuario = ANY($1)', [ids])
        await pool.query('DELETE FROM usuarios WHERE idUsuario = ANY($1)', [ids])
        await pool.end()
    }
})
