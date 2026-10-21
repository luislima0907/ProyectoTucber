import HttpError from '../../common/http_error.js'

export default class ViajeController {
    constructor(router, service) {
        this.service = service
        router.get('/viajes/historial', (req, res) => this.getHistory(req, res))
        router.get('/viajes/ingresos', (req, res) => this.getEarnings(req, res))
        router.post('/viajes/:id/finalizar', (req, res) => this.update(req, res, 'finish'))
        router.post('/viajes/:id/cancelar', (req, res) => this.update(req, res, 'cancel'))
        router.post('/viajes/:id/pago', (req, res) => this.update(req, res, 'confirmPayment'))
        router.post('/viajes/:id/calificar', (req, res) => this.update(req, res, 'rate'))
        router.post('/viajes/:id/reportar', (req, res) => this.report(req, res))
    }

    async update(req, res, action) {
        const trip = await this.service[action](Number(req.params.id), req.user, req.body.stars)
        const search = req.app.locals.searchEngine
        search.publishTrip(trip)
        await search.broadcastPending()
        res.json({ solicitud: search.requestService.repository.toSolicitud(trip, []) })
    }

    async report(req, res) {
        const report = await this.service.report(Number(req.params.id), req.user, req.body.description)
        res.status(201).json(report)
    }

    async getHistory(req, res) {
        const rows = await this.service.repository.findHistory(req.user.sub)
        const repository = req.app.locals.searchEngine.requestService.repository
        res.json(rows.map(row => repository.toSolicitud(row, [])))
    }

    async getEarnings(req, res) {
        if (req.user.rol !== 'conductor') throw new HttpError(403, 'Solo para conductores.')
        res.json(await this.service.repository.findEarnings(req.user.sub))
    }
}
