import { z } from 'zod'

const createOffer = z.object({
    idSolicitud: z.number().int().positive()
})

export default class OfertaController{
    constructor(router, service){
        this.service = service
        router.post('/ofertas', (req, res) => this.create(req, res))
        router.post('/ofertas/:id/aceptar', (req, res) => this.accept(req, res))
        router.post('/ofertas/:id/descartar', (req, res) => this.discard(req, res))
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

    resolveClient(req, res){
        const idUsuario = Number(req.user?.sub)
        if (!Number.isInteger(idUsuario) || idUsuario <= 0){
            res.status(401).json({ message: 'Token sin identidad de usuario. Inicia sesión de nuevo.' })
            return null
        }
        if (req.user?.rol !== 'cliente'){
            res.status(403).json({ message: 'Solo los clientes pueden decidir sobre las ofertas.' })
            return null
        }
        return idUsuario
    }

    parseOfferId(req, res){
        const idOferta = Number(req.params.id)
        if (!Number.isInteger(idOferta) || idOferta <= 0){
            res.status(400).json({ message: 'El identificador de la oferta debe ser un entero positivo.' })
            return null
        }
        return idOferta
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

    async accept(req, res){
        const idUsuario = this.resolveClient(req, res)
        if (idUsuario === null) return
        const idOferta = this.parseOfferId(req, res)
        if (idOferta === null) return

        try{
            const solicitud = await this.service.accept(idUsuario, idOferta)
            return res.status(200).json({ solicitud })
        }catch(error){
            return this.handleDecisionError(error, res, 'aceptar')
        }
    }

    async discard(req, res){
        const idUsuario = this.resolveClient(req, res)
        if (idUsuario === null) return
        const idOferta = this.parseOfferId(req, res)
        if (idOferta === null) return

        try{
            const oferta = await this.service.discard(idUsuario, idOferta)
            return res.status(200).json({ oferta })
        }catch(error){
            return this.handleDecisionError(error, res, 'descartar')
        }
    }

    handleDecisionError(error, res, accion){
        if (error.code === 'OFFER_NOT_FOUND'){
            return res.status(404).json({ message: error.message })
        }
        if (error.code === 'OFFER_FORBIDDEN'){
            return res.status(403).json({ message: error.message })
        }
        if (error.code === 'REQUEST_NOT_AVAILABLE' || error.code === 'OFFER_NOT_AVAILABLE' ||
            error.code === 'DRIVER_NOT_ELIGIBLE'){
            return res.status(409).json({ message: error.message })
        }
        console.error(`Error al ${accion} oferta:`, error)
        return res.status(500).json({ message: `No se pudo ${accion} la oferta.` })
    }
}
