import { z } from 'zod'
import HttpError from '../../common/http_error.js'

const point = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    description: z.string().max(250).optional(),
})
const requestSchema = z.object({
    origin: point,
    destination: point,
    reference: z.string().max(250).optional(),
    idempotencyKey: z.string().min(1).max(100),
})

export default class SolicitudController {
    constructor(router, service) {
        this.service = service
        router.post('/solicitudes', (req, res) => this.create(req, res))
        router.get('/solicitudes/actual', (req, res) => this.getCurrent(req, res))
        router.get('/solicitudes/:id/pin', (req, res) => this.getPin(req, res))
        router.post('/solicitudes/:id/llegada', (req, res) => this.markArrived(req, res))
        router.post('/solicitudes/:id/iniciar', (req, res) => this.start(req, res))
    }

    requireRole(req, role) {
        if (req.user.rol !== role) throw new HttpError(403, 'Tu cuenta no permite esta acción.')
    }

    async create(req, res) {
        this.requireRole(req, 'cliente')
        const result = requestSchema.safeParse(req.body)
        if (!result.success) throw new HttpError(400, 'Selecciona origen y destino válidos.')
        const solicitud = await this.service.create(req.user.sub, result.data)
        await req.app.locals.searchEngine.broadcastPending()
        res.status(201).json({ solicitud })
    }

    async getCurrent(req, res) {
        const repository = this.service.repository
        const row =
            req.user.rol === 'cliente'
                ? await repository.findCurrentForClient(req.user.sub)
                : await repository.findCurrentForDriver(req.user.sub)
        res.json({ solicitud: row ? repository.toSolicitud(row, []) : null })
    }

    async getPin(req, res) {
        this.requireRole(req, 'cliente')
        res.json(await this.service.getPin(req.user.sub, Number(req.params.id)))
    }

    async markArrived(req, res) {
        this.requireRole(req, 'conductor')
        const row = await this.service.markArrived(req.user.sub, Number(req.params.id))
        await this.respond(req, res, row)
    }

    async start(req, res) {
        this.requireRole(req, 'conductor')
        if (!/^\d{4}$/.test(req.body.pin))
            throw new HttpError(400, 'Introduce el PIN de 4 dígitos.')
        const row = await this.service.validatePin(
            req.user.sub,
            Number(req.params.id),
            req.body.pin,
        )
        await this.respond(req, res, row)
    }

    async respond(req, res, row) {
        const updated = await req.app.locals.searchEngine.publishTrip(row)
        res.json({ solicitud: updated })
    }
}
