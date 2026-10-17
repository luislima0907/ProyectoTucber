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
        
        
         if (await bcrypt.compare(userLoginDTO.contrasena, user.contrasenahash)){
            console.log("he entrado aca")
            const payload = {
                sub: user.id,
                rol: user.rol
            }
             const token = jwt.sign(payload,secret, {
             expiresIn: '500m'
         })

            console.log("el token es"+  token)
            return token
         }

        
    }
}   