import  {z} from 'zod'

const roles = ["cliente", "conductor"]
export const User = z.object(
    {
        nombre: z.string().min(1),
        correo: z.email(),
        contrasena:z.string().min(6),
        telefono: z.string(), //numero guatemalteco btw sin el +502
        rol:z.enum(roles)
    }
)       