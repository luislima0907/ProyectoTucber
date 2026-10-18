import { z } from 'zod'

const coordinate = z.number().finite()
const point = z.object({
    latitude: coordinate.min(-90).max(90),
    longitude: coordinate.min(-180).max(180)
})
const createRequest = z.object({
    origin: point,
    destination: point,
    reference: z.string().trim().max(250).optional(),
    idempotencyKey: z.string().trim().min(1).max(100)
})

export default class SolicitudController{
    constructor(router, service){
        this.service = service
        router.post('/solicitudes', (req, res) => this.create(req, res))
        router.get('/solicitudes/actual', (req, res) => this.getCurrent(req, res))
    }

    resolveClient(req, res){
        const idUsuario = Number(req.user?.sub)
        if (!Number.isInteger(idUsuario) || idUsuario <= 0){
            res.status(401).json({ message: 'Token sin identidad de usuario. Inicia sesión de nuevo.' })
            return null
        }
        if (req.user?.rol !== 'cliente'){
            res.status(403).json({ message: 'Solo los clientes pueden crear solicitudes.' })
            return null
        }
        return idUsuario
    }

    async create(req, res){
        const idUsuario = this.resolveClient(req, res)
        if (idUsuario === null) return

        const result = createRequest.safeParse(req.body)
        if (!result.success){
            return res.status(400).json({ message: 'Origen, destino e identificador de intento son obligatorios y válidos.' })
        }

        try{
            const solicitud = await this.service.create(idUsuario, result.data)
            return res.status(201).json({ solicitud })
        }catch(error){
            if (error.code === 'ACTIVE_REQUEST'){
                return res.status(409).json({ message: error.message })
            }
            const message = error.message ?? ''
            if (message.includes('zona piloto') || message.includes('punto') || message.includes('ruta')){
                return res.status(400).json({ message })
            }
            console.error('Error al crear solicitud:', error)
            return res.status(502).json({ message: 'No se pudo calcular la solicitud en el servidor.' })
        }
    }

    async getCurrent(req, res){
        const idUsuario = this.resolveClient(req, res)
        if (idUsuario === null) return

        try{
            const solicitud = await this.service.getCurrent(idUsuario)
            return res.status(200).json({ solicitud })
        }catch(error){
            console.error('Error al consultar solicitud:', error)
            return res.status(500).json({ message: 'No se pudo consultar la solicitud.' })
        }
    }
}
