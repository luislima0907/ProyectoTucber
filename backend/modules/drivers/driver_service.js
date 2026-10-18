import { existsSync } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join } from 'node:path'
import { detectImageType } from './vehicle.js'

const here = dirname(fileURLToPath(import.meta.url))
const STORAGE_DIR = join(here, '..', '..', 'storage', 'drivers')

export const PHOTO_REFERENCE_ROUTE = '/drivers/me/photo'

export default class DriverService{

    constructor(repository){
        this.repository = repository
    }

    async getMyProfile(idUsuario){
        const row = await this.repository.findById(idUsuario)
        if (!row) return null
        return this.toProfile(row)
    }

    async getAvailability(idUsuario){
        const row = await this.repository.findById(idUsuario)
        return row?.disponible ?? false
    }

    async setAvailability(idUsuario, disponible){
        return this.repository.setAvailability(idUsuario, disponible)
    }

    async getPendingRequests(idUsuario){
        return this.repository.findPendingRequests(idUsuario)
    }

    async saveMyProfile(idUsuario, vehicleData, file){
        let foto = null
        if (file){
            foto = await this.savePhotoFile(idUsuario, file)
        }

        try{
            const saved = await this.repository.saveVehicle({
                idUsuario,
                placa: vehicleData.placa,
                color: vehicleData.color,
                capacidad: vehicleData.capacidad,
                telefono: vehicleData.telefono,
                foto
            })
            if (!saved && foto) await this.deletePhotoFile(foto)
            return saved
        }catch(error){
            if (foto) await this.deletePhotoFile(foto)
            throw error
        }
    }

    async getMyPhotoPath(idUsuario){
        const row = await this.repository.findById(idUsuario)
        if (!row || !row.fotovehiculo) return null
        const absolutePath = join(STORAGE_DIR, basename(row.fotovehiculo))
        return existsSync(absolutePath) ? absolutePath : null
    }

    async savePhotoFile(idUsuario, file){
        const type = detectImageType(file.buffer)
        if (!type) throw new Error('Tipo de imagen no soportado')
        const extension = type === 'jpeg' ? 'jpg' : 'png'
        const fileName = `vehiculo_${idUsuario}_${Date.now()}.${extension}`
        await mkdir(STORAGE_DIR, { recursive: true })
        await writeFile(join(STORAGE_DIR, fileName), file.buffer)
        return fileName
    }

    async deletePhotoFile(fileName){
        try{
            await unlink(join(STORAGE_DIR, basename(fileName)))
        }catch{
        }
    }

    toProfile(row){
        return {
            placa: row.placavehiculo,
            color: row.colorvehiculo,
            capacidad: row.capacidadvehiculo,
            telefono: row.telefono,
            foto: row.fotovehiculo ? PHOTO_REFERENCE_ROUTE : null,
            disponible: row.disponible ?? false
        }
    }
}
