import { z } from 'zod'

const coordinate = z.number().finite()
const point = z.object({
    latitude: coordinate.min(-90).max(90),
    longitude: coordinate.min(-180).max(180)
})
const quoteRequest = z.object({
    origin: point,
    destination: point
})

export default class TarifaController {
    constructor(router, tarifaService) {
        this.tarifaService = tarifaService
        router.post('/tarifas/cotizacion', (req, res) => this.getQuote(req, res))
    }

    async getQuote(req, res) {
        const result = quoteRequest.safeParse(req.body)
        if (!result.success) {
            return res.status(400).json({
                message: 'Origen y destino deben incluir coordenadas válidas'
            })
        }

        try {
            const quote = await this.tarifaService.calculateQuote(result.data.origin, result.data.destination)
            return res.status(200).json(quote)
        } catch (error) {
            console.error('Error al calcular tarifa:', error)
            const status = error.message.includes('fuera de la zona piloto') ? 400 : 502
            return res.status(status).json({ message: error.message })
        }
    }
}
