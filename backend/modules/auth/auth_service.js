import UserService from "../users/user_service.js"
import UserRepository from "../users/user_repository.js"
import bcrypt, { hash } from 'bcrypt'
import jwt from 'jsonwebtoken'
export default class AuthService{
    
    
    constructor(repository){
        this.repository = repository
    }

    async registerUser(user){
            const userService =  new UserService(new UserRepository(this.repository.db)) //no me arrepiento de mi mala practica
            
            const created =  await userService.createUser(user)
            console.log(created)
            if (created){
                return true
            }
            throw new Error("Cant create the user")
            
    }

    async loginUser(userLoginDTO){
         const userService =  new UserService(new UserRepository(this.repository.db))

         const user = (await userService.findUserByCorreo(userLoginDTO.correo))[0]
         const secret = process.env.JWT_SECRET

         if (!user || !await bcrypt.compare(userLoginDTO.contrasena, user.contrasenahash)){
            throw new Error("Invalid credentials")
         }

         const payload = {
             sub: user.idusuario,
             rol: user.rol
         }
         const token = jwt.sign(payload, secret, {
             expiresIn: '500m'
         })

         return { token, user: { id: user.idusuario, nombre: user.nombre, correo: user.correo, rol: user.rol } }
    }

    async getUserById(id){
        const { rows } = await this.repository.db.query("SELECT idusuario, nombre, correo, rol FROM usuarios WHERE idusuario = $1", [id])
        const user = rows[0]
        if (!user) return null
        return { id: user.idusuario, nombre: user.nombre, correo: user.correo, rol: user.rol }
    }
}   