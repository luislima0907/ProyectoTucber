import { WebSocketServer, WebSocket } from 'ws'
import { z } from 'zod'
import { readIdentity } from '../../middlewares/jwt_midleware.js'
import HttpError from '../../common/http_error.js'

const locationSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
})

export default class SearchEngine {
    constructor(server, repository, requestService, origins) {
        this.repository = repository
        this.requestService = requestService
        this.connections = new Map()
        this.locations = new Map()
        this.server = new WebSocketServer({ noServer: true, maxPayload: 8192 })
        server.on('upgrade', (request, socket, head) => {
            try {
                if (request.url !== '/search' || !origins.includes(request.headers.origin)) {
                    throw new Error('Invalid origin')
                }
                const user = readIdentity(request)
                this.server.handleUpgrade(request, socket, head, (connection) =>
                    this.connect(connection, user),
                )
            } catch {
                socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n')
            }
        })
        this.timer = setInterval(() => this.expire().catch(() => {}), 1000)
        this.timer.unref()
    }

    connect(socket, user) {
        socket.user = user
        this.connections.set(socket, user)
        const expiry = setTimeout(
            () => socket.close(1008, 'Sesión vencida'),
            Math.max(0, user.exp * 1000 - Date.now()),
        )
        socket.on('message', async (bytes) => {
            try {
                const message = JSON.parse(bytes.toString())
                await this.handleMessage(socket, message)
            } catch (error) {
                this.send(socket, 'error', {
                    message: error.status ? error.message : 'No se pudo procesar la solicitud.',
                })
            }
        })
        socket.on('error', () => socket.close())
        socket.on('close', () => {
            clearTimeout(expiry)
            this.connections.delete(socket)
            if (![...this.connections.values()].some((item) => item.sub === user.sub)) {
                this.locations.delete(user.sub)
            }
        })
        this.restore(socket).catch(() =>
            this.send(socket, 'error', { message: 'No se pudo recuperar el viaje.' }),
        )
    }

    async handleMessage(socket, message) {
        const user = socket.user
        if (message.type === 'sync') return this.restore(socket)
        if (user.rol !== 'conductor') throw new HttpError(403, 'Acción exclusiva de conductores.')
        if (message.type === 'location') {
            const result = locationSchema.safeParse(message.location)
            if (!result.success) throw new HttpError(400, 'Ubicación inválida.')
            this.locations.set(user.sub, result.data)
            return this.broadcastPending()
        }
        if (message.type === 'accept') {
            const id = Number(message.id)
            if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Solicitud inválida.')
            const trip = await this.repository.accept(user.sub, id)
            await this.publishTrip(trip)
            return this.broadcastPending()
        }
        throw new HttpError(400, 'Acción no reconocida.')
    }

    async restore(socket) {
        const repository = this.requestService.repository
        const user = socket.user
        const trip =
            user.rol === 'cliente'
                ? await repository.findCurrentForClient(user.sub)
                : await repository.findCurrentForDriver(user.sub)
        const detail = trip ? await repository.findById(trip.idsolicitud) : null
        this.send(socket, 'trip', detail ? repository.toSolicitud(detail, []) : null)
        if (user.rol === 'conductor') await this.broadcastPending()
    }

    async broadcastPending() {
        const [requests, available] = await Promise.all([
            this.repository.findPending(),
            this.repository.findAvailableDrivers(),
        ])
        const active = new Set([...this.connections.values()].map((user) => user.sub))
        const drivers = available.filter((id) => active.has(id))
        const deliveries = new Map(drivers.map((id) => [id, []]))
        for (const request of requests) {
            for (const id of this.nearestDrivers(drivers, request.origen)) {
                deliveries.get(id).push({
                    id: request.idsolicitud,
                    origin: request.origen,
                    destination: request.destino,
                    amount: Number(request.tarifaacordada),
                    distanceMeters: request.distanciacotizadametros,
                    expiresAt: request.expiresat,
                })
            }
        }
        for (const [socket, user] of this.connections) {
            if (user.rol === 'conductor')
                this.send(socket, 'requests', deliveries.get(user.sub) || [])
        }
    }

    nearestDrivers(drivers, origin) {
        const located = drivers.filter((id) => this.locations.has(id))
        if (!located.length) return drivers
        return located
            .sort((first, second) => {
                return (
                    this.distance(this.locations.get(first), origin) -
                    this.distance(this.locations.get(second), origin)
                )
            })
            .slice(0, 5)
    }

    distance(first, second) {
        const radians = Math.PI / 180
        const latitude = (second.latitude - first.latitude) * radians
        const longitude = (second.longitude - first.longitude) * radians
        const value =
            Math.sin(latitude / 2) ** 2 +
            Math.cos(first.latitude * radians) *
                Math.cos(second.latitude * radians) *
                Math.sin(longitude / 2) ** 2
        return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
    }

    async publishTrip(row) {
        const repository = this.requestService.repository
        const detail = await repository.findById(row.idsolicitud)
        const trip = repository.toSolicitud(detail || row, [])
        for (const [socket, user] of this.connections) {
            if (user.sub === row.idusuario || user.sub === row.idconductor)
                this.send(socket, 'trip', trip)
        }
        return trip
    }

    async expire() {
        const expired = await this.requestService.repository.expireSearches()
        for (const trip of expired) await this.publishTrip(trip)
        if (expired.length) await this.broadcastPending()
    }

    send(socket, type, data) {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, data }))
    }

    close() {
        clearInterval(this.timer)
        for (const socket of this.connections.keys()) socket.terminate()
        this.server.close()
    }
}
