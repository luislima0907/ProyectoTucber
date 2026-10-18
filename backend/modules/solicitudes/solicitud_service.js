import TarifaService from '../tarifas/tarifa_service.js'

const REQUEST_TTL_SECONDS = 90

export default class SolicitudService{
    constructor(repository, tarifaService = new TarifaService(process.env.GOOGLE_MAPS_API_KEY)){
        this.repository = repository
        this.tarifaService = tarifaService
    }

    async create(idUsuario, request){
        const existing = await this.repository.findByAttempt(idUsuario, request.idempotencyKey)
        if (existing){
            return existing
        }

        const quote = await this.tarifaService.calculateQuote(request.origin, request.destination)
        return this.repository.createWithProtection({
            idUsuario,
            idIntento: request.idempotencyKey,
            origen: request.origin,
            destino: request.destination,
            referencia: request.reference ?? null,
            distanceMeters: quote.distanceMeters,
            amount: quote.amount,
            currency: quote.currency,
            ttlSeconds: REQUEST_TTL_SECONDS
        })
    }

    async getCurrent(idUsuario){
        return this.repository.findCurrentWithOffers(idUsuario)
    }
}
