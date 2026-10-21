import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import HttpError from '../../common/http_error.js'

export default class AuthService {
    constructor(repository) {
        this.repository = repository
    }

    async registerUser(user) {
        const hash = await bcrypt.hash(user.contrasena, 10)
        try {
            return await this.repository.create(user, hash)
        } catch (error) {
            if (error.code === '23505') throw new HttpError(409, 'El correo ya está registrado.')
            throw error
        }
    }

    async loginUser(credentials) {
        const user = await this.repository.findByEmail(credentials.correo)
        if (!user || !(await bcrypt.compare(credentials.contrasena, user.contrasenahash))) {
            throw new HttpError(401, 'Correo o contraseña incorrectos.')
        }
        return this.createSession({
            id: user.idusuario,
            nombre: user.nombre,
            correo: user.correo,
            rol: user.rol,
        })
    }

    createSession(user) {
        const token = jwt.sign({ sub: user.id, rol: user.rol }, process.env.JWT_SECRET, {
            expiresIn: '8h',
        })
        return { token, user }
    }

    async getUserById(id) {
        return this.repository.findById(id)
    }
}
