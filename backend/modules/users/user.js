import { z } from 'zod'

export const User = z.object({
    nombre: z.string().trim().min(1),
    correo: z.email().toLowerCase(),
    contrasena: z.string().min(6),
    telefono: z.string().optional(),
    rol: z.enum(['cliente', 'conductor'])
})
