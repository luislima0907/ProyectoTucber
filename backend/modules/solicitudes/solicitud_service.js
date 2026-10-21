import { randomInt } from 'node:crypto'
import TarifaService from '../tarifas/tarifa_service.js'
import HttpError from '../../common/http_error.js'

export default class SolicitudService {
    constructor(repository, tarifaService = new TarifaService(process.env.GOOGLE_MAPS_API_KEY)) {
        this.repository = repository
        this.tarifaService = tarifaService
    }

    async create(userId, request) {
        await this.repository.expireSearches()
        const existing = await this.repository.findByAttempt(userId, request.idempotencyKey)
        if (existing) return existing
        const quote = await this.tarifaService.calculateQuote(request.origin, request.destination)
        return this.repository.createWithProtection({
            idUsuario: userId,
            idIntento: request.idempotencyKey,
            origen: request.origin,
            destino: request.destination,
            referencia: request.reference || null,
            distanceMeters: quote.distanceMeters,
            amount: quote.amount,
            currency: quote.currency,
            route: quote.polyline,
            ttlSeconds: 60,
        })
    }

    async getCurrent(userId) {
        await this.repository.expireSearches()
        const row = await this.repository.findCurrentForClient(userId)
        return row ? this.repository.toSolicitud(row, []) : null
    }

    async markArrived(driverId, id) {
        const pin = String(randomInt(1000, 10000))
        const trip = await this.repository.markArrived(id, driverId, pin)
        if (!trip) throw new HttpError(409, 'Este viaje no permite marcar llegada.')
        return trip
    }

    async getPin(userId, id) {
        const trip = await this.repository.findById(id)
        if (!trip || trip.idusuario !== userId) throw new HttpError(404, 'Viaje no disponible.')
        if (trip.estado !== 'en_recogida')
            throw new HttpError(409, 'El conductor todavía no ha llegado.')
        return { pin: trip.pin }
    }

    async validatePin(driverId, id, pin) {
        const trip = await this.repository.startTrip(id, driverId, pin)
        if (!trip) throw new HttpError(409, 'PIN incorrecto o viaje no disponible.')
        return trip
    }
}
