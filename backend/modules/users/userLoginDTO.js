import {z} from 'zod'
export const UserLoginDTO = z.object({
    correo: z.email(),
    contrasena: z.string().min(1)

})