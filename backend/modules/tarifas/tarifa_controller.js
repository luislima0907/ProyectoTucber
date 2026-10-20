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
            if (error.code === 'ZONE') {
                return res.status(400).json({ message: error.message })
            }
            if (error.code === 'UPSTREAM') {
                return res.status(502).json({ message: error.message })
            }
            return res.status(500).json({ message: 'Error inesperado al calcular la tarifa.' })
        }
    }
}
