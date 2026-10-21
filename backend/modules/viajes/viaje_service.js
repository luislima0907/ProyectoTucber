import HttpError from '../../common/http_error.js'

export default class ViajeService {
    constructor(repository) {
        this.repository = repository
    }

    async getTrip(id, user) {
        const trip = await this.repository.findById(id)
        if (!trip || (trip.idusuario !== user.sub && trip.idconductor !== user.sub)) {
            throw new HttpError(404, 'Viaje no disponible.')
        }
        return trip
    }

    async finish(id, user) {
        const trip = await this.getTrip(id, user)
        if (trip.idconductor !== user.sub) throw new HttpError(403, 'Solo el conductor puede finalizar.')
        if (trip.estado === 'completada') return trip
        return this.requireResult(await this.repository.finish(id, user.sub))
    }

    async cancel(id, user) {
        const trip = await this.getTrip(id, user)
        if (trip.estado === 'cancelada') return trip
        return this.requireResult(await this.repository.cancel(id, user.sub))
    }

    async confirmPayment(id, user) {
        await this.getTrip(id, user)
        return this.requireResult(await this.repository.confirmPayment(id, user.sub))
    }

    async rate(id, user, stars) {
        await this.getTrip(id, user)
        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            throw new HttpError(400, 'Selecciona de 1 a 5 estrellas.')
        }
        return this.requireResult(await this.repository.rate(id, user.sub, stars))
    }

    async report(id, user, description) {
        await this.getTrip(id, user)
        if (typeof description !== 'string' || !description.trim()) {
            throw new HttpError(400, 'Describe el problema.')
        }
        return this.repository.createReport(id, user.sub, description.trim())
    }

    requireResult(trip) {
        if (!trip) throw new HttpError(409, 'El viaje cambió de estado. Actualiza para continuar.')
        return trip
    }
}
