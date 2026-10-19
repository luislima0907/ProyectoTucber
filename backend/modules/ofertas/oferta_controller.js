import { z } from 'zod'

const createOffer = z.object({
    idSolicitud: z.number().int().positive()
})

export default class OfertaController{
    constructor(router, service){
        this.service = service
        router.post('/ofertas', (req, res) => this.create(req, res))
    }

    resolveDriver(req, res){
        const idUsuario = Number(req.user?.sub)
        if (!Number.isInteger(idUsuario) || idUsuario <= 0){
            res.status(401).json({ message: 'Token sin identidad de usuario. Inicia sesión de nuevo.' })
            return null
        }
        if (req.user?.rol !== 'conductor'){
            res.status(403).json({ message: 'Solo los conductores pueden ofertar.' })
            return null
        }
        return idUsuario
    }

    async create(req, res){
        const idConductor = this.resolveDriver(req, res)
        if (idConductor === null) return

        const result = createOffer.safeParse(req.body)
        if (!result.success){
            return res.status(400).json({ message: 'idSolicitud es obligatorio y debe ser un entero positivo.' })
        }

        try{
            const { oferta, created } = await this.service.create(idConductor, result.data)
            return res.status(created ? 201 : 200).json({ oferta })
        }catch(error){
            if (error.code === 'REQUEST_NOT_FOUND'){
                return res.status(404).json({ message: error.message })
            }
            if (error.code === 'DRIVER_UNAVAILABLE' || error.code === 'ACTIVE_TRIP' ||
                error.code === 'REQUEST_NOT_AVAILABLE' || error.code === 'ACTIVE_OFFER'){
                return res.status(409).json({ message: error.message })
            }
            console.error('Error al crear oferta:', error)
            return res.status(500).json({ message: 'No se pudo crear la oferta.' })
        }
    }
}
