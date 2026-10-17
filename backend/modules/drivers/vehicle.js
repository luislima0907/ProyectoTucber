import { z } from 'zod'

export const VEHICLE_LIMITS = Object.freeze({
    placa: { min: 4, max: 10 },
    color: { min: 3, max: 30 },
    capacidad: { min: 1, max: 5 },
    telefono: { min: 7, max: 15 },
    photoMaxBytes: 5 * 1024 * 1024,
    photoAllowedTypes: ['image/jpeg', 'image/png']
})

export const Vehicle = z.object({
    placa: z.string()
        .trim()
        .min(VEHICLE_LIMITS.placa.min, `La placa debe tener al menos ${VEHICLE_LIMITS.placa.min} caracteres`)
        .max(VEHICLE_LIMITS.placa.max, `La placa no puede superar ${VEHICLE_LIMITS.placa.max} caracteres`)
        .regex(/^[A-Za-z0-9]+$/, 'La placa solo puede contener letras y números'),
    color: z.string()
        .trim()
        .min(VEHICLE_LIMITS.color.min, `El color debe tener al menos ${VEHICLE_LIMITS.color.min} caracteres`)
        .max(VEHICLE_LIMITS.color.max, `El color no puede superar ${VEHICLE_LIMITS.color.max} caracteres`),
    capacidad: z.coerce.number({ error: 'La capacidad debe ser un número entero' })
        .int('La capacidad debe ser un número entero')
        .min(VEHICLE_LIMITS.capacidad.min, `La capacidad debe ser al menos ${VEHICLE_LIMITS.capacidad.min}`)
        .max(VEHICLE_LIMITS.capacidad.max, `La capacidad no puede superar ${VEHICLE_LIMITS.capacidad.max} pasajeros`),
    telefono: z.string()
        .trim()
        .regex(/^\+?\d{7,15}$/, `El teléfono debe tener entre ${VEHICLE_LIMITS.telefono.min} y ${VEHICLE_LIMITS.telefono.max} dígitos`)
})

const IMAGE_SIGNATURES = [
    { type: 'jpeg', bytes: [0xFF, 0xD8, 0xFF] },
    { type: 'png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }
]

export function detectImageType(buffer) {
    if (!Buffer.isBuffer(buffer)) return null
    for (const signature of IMAGE_SIGNATURES) {
        if (signature.bytes.every((byte, index) => buffer[index] === byte)) {
            return signature.type
        }
    }
    return null
}

export function validatePhotoFile(file) {
    if (!file) return null
    if (file.size > VEHICLE_LIMITS.photoMaxBytes) {
        return `La foto no puede superar ${VEHICLE_LIMITS.photoMaxBytes / (1024 * 1024)} MB`
    }
    if (!detectImageType(file.buffer)) {
        return 'La foto debe ser una imagen JPEG o PNG válida'
    }
    return null
}
