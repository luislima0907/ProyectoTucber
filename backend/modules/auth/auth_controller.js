import { User } from '../users/user.js'
import { UserLoginDTO } from '../users/userLoginDTO.js'
import { optionalAuthenticateToken } from '../../middlewares/jwt_midleware.js'
import HttpError from '../../common/http_error.js'

export default class AuthController {
    constructor(router, service) {
        this.service = service
        this.cookieName = process.env.SESSION_COOKIE_NAME || 'tucber_session'
        this.cookieOptions = {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        }
        router.post('/register', (req, res) => this.register(req, res))
        router.post('/login', (req, res) => this.login(req, res))
        router.get('/me', optionalAuthenticateToken, (req, res) => this.getCurrentUser(req, res))
        router.post('/logout', (req, res) => this.logout(req, res))
    }

    parse(schema, body) {
        const result = schema.safeParse(body)
        if (!result.success) throw new HttpError(400, 'Revisa los campos del formulario.')
        return result.data
    }

    async register(req, res) {
        const user = await this.service.registerUser(this.parse(User, req.body))
        this.respond(res, this.service.createSession(user))
    }

    async login(req, res) {
        const session = await this.service.loginUser(this.parse(UserLoginDTO, req.body))
        this.respond(res, session)
    }

    respond(res, session) {
        res.cookie(this.cookieName, session.token, {
            ...this.cookieOptions,
            maxAge: 8 * 60 * 60 * 1000,
        })
        res.json({ user: session.user })
    }

    async getCurrentUser(req, res) {
        const user = req.user ? await this.service.getUserById(req.user.sub) : null
        res.json({ user })
    }

    logout(req, res) {
        res.clearCookie(this.cookieName, this.cookieOptions)
        res.json({ message: 'Sesión cerrada.' })
    }
}
