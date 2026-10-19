import multer from 'multer'
import { z } from 'zod'
import { Vehicle, VEHICLE_LIMITS, validatePhotoFile } from './vehicle.js'

const PHOTO_FIELD = 'foto'

const uploadPhoto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: VEHICLE_LIMITS.photoMaxBytes, files: 1 }
}).single(PHOTO_FIELD)

export default class DriverController{

    constructor(router, driverService){
        this.driverService = driverService

        router.get("/drivers/me", (req, res) => this.getMyProfile(req, res))
        router.put("/drivers/me", (req, res) => this.handlePhotoUpload(req, res))
        router.get("/drivers/me/photo", (req, res) => this.getMyPhoto(req, res))
        router.get("/drivers/me/availability", (req, res) => this.getAvailability(req, res))
        router.patch("/drivers/me/availability", (req, res) => this.setAvailability(req, res))
        router.get("/drivers/requests/pending", (req, res) => this.getPendingRequests(req, res))
        router.get("/drivers/requests/current", (req, res) => this.getCurrentTrip(req, res))
    }

    resolveDriver(req, res){
        const idUsuario = Number(req.user?.sub)
        if (!Number.isInteger(idUsuario) || idUsuario <= 0){
            res.status(401).json({ message: 'Token sin identidad de usuario. Inicia sesión de nuevo.' })
            return null
        }
        if (req.user?.rol !== 'conductor'){
            res.status(403).json({ message: 'Solo los conductores pueden gestionar el perfil del vehículo.' })
            return null
        }
        return idUsuario
    }

    async getMyProfile(req, res){
        const idUsuario = this.resolveDriver(req, res)
        if (idUsuario === null) return

        try{
            const perfil = await this.driverService.getMyProfile(idUsuario)
            if (!perfil){
                return res.status(404).json({ message: 'Perfil no encontrado' })
            }
            return res.status(200).json({ perfil })
        }catch(error){
            console.error(error)
            return res.status(500).json({ message: 'No se ha podido consultar el perfil del vehículo' })
        }
    }

    async getAvailability(req, res){
        const idUsuario = this.resolveDriver(req, res)
        if (idUsuario === null) return

        try{
            const disponible = await this.driverService.getAvailability(idUsuario)
            return res.status(200).json({ disponible })
        }catch(error){
            console.error(error)
            return res.status(500).json({ message: 'No se pudo consultar la disponibilidad' })
        }
    }

    async setAvailability(req, res){
        const idUsuario = this.resolveDriver(req, res)
        if (idUsuario === null) return

        const result = z.object({ disponible: z.boolean() }).safeParse(req.body)
        if (!result.success){
            return res.status(400).json({ message: 'disponible debe ser booleano' })
        }

        try{
            const disponible = await this.driverService.setAvailability(idUsuario, result.data.disponible)
            return res.status(200).json({ disponible })
        }catch(error){
            if (error.code === 'ACTIVE_TRIP'){
                return res.status(409).json({ message: error.message })
            }
            console.error(error)
            return res.status(500).json({ message: 'No se pudo actualizar la disponibilidad' })
        }
    }

    async getPendingRequests(req, res){
        const idUsuario = this.resolveDriver(req, res)
        if (idUsuario === null) return

        try{
            const solicitudes = await this.driverService.getPendingRequests(idUsuario)
            return res.status(200).json({ solicitudes })
        }catch(error){
            console.error(error)
            return res.status(500).json({ message: 'No se pudieron consultar las solicitudes pendientes' })
        }
    }

    async getCurrentTrip(req, res){
        const idUsuario = this.resolveDriver(req, res)
        if (idUsuario === null) return

        try{
            const solicitud = await this.driverService.getCurrentTrip(idUsuario)
            return res.status(200).json({ solicitud })
        }catch(error){
            console.error(error)
            return res.status(500).json({ message: 'No se pudo consultar el viaje actual' })
        }
    }

    handlePhotoUpload(req, res){
        uploadPhoto(req, res, (error) => {
            if (error){
                const message = error.code === 'LIMIT_FILE_SIZE'
                    ? `La foto no puede superar ${VEHICLE_LIMITS.photoMaxBytes / (1024 * 1024)} MB`
                    : 'No se ha podido procesar el archivo de la foto'
                return res.status(400).send(['foto' + message])
            }
            return this.saveMyProfile(req, res)
        })
    }

    async saveMyProfile(req, res){
        const idUsuario = this.resolveDriver(req, res)
        if (idUsuario === null) return

        const result = Vehicle.safeParse(req.body)
        if (!result.success){
            return res.status(400).send(result.error.issues.map(e => e.path + e.message))
        }

        const photoError = validatePhotoFile(req.file)
        if (photoError){
            return res.status(400).send(['foto' + photoError])
        }

        try{
            const saved = await this.driverService.saveMyProfile(idUsuario, result.data, req.file)
            if (!saved){
                return res.status(403).json({ message: 'Solo los conductores pueden guardar datos del vehículo.' })
            }
            const perfil = await this.driverService.getMyProfile(idUsuario)
            return res.status(200).json({ message: 'Perfil del vehículo actualizado', perfil })
        }catch(error){
            console.error(error)
            return res.status(500).json({ message: 'No se ha podido guardar el perfil del vehículo' })
        }
    }

    async getMyPhoto(req, res){
        const idUsuario = this.resolveDriver(req, res)
        if (idUsuario === null) return

        try{
            const photoPath = await this.driverService.getMyPhotoPath(idUsuario)
            if (!photoPath){
                return res.status(404).json({ message: 'No hay foto de vehículo registrada' })
            }
            return res.sendFile(photoPath, (error) => {
                if (error && !res.headersSent){
                    return res.status(404).json({ message: 'No se ha podido entregar la foto del vehículo' })
                }
            })
        }catch(error){
            console.error(error)
            return res.status(500).json({ message: 'No se ha podido consultar la foto del vehículo' })
        }
    }
}
