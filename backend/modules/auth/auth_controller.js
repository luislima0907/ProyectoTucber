import { User } from "../users/user.js"
import { UserLoginDTO } from "../users/userLoginDTO.js"
import { optionalAuthenticateToken } from "../../middlewares/jwt_midleware.js"

const COOKIE_MAX_AGE = 500 * 60 * 1000

function cookieName(){
    return process.env.SESSION_COOKIE_NAME || 'tucber_session'
}

function setSessionCookie(res, token){
    res.cookie(cookieName(), token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: COOKIE_MAX_AGE
    })
}

export default class AuthController{

    constructor(router, authService){
        this.router = router
        this.authService = authService

        router.post("/register", async (req, res) =>{

            const result = User.safeParse(req.body )

            try{
                 if (!result.success){

                    return res.status(400).send(result.error.issues.map(e => e.path + e.message))
                }

                await this.authService.registerUser(result.data)
                const session = await this.authService.loginUser({ correo: result.data.correo, contrasena: result.data.contrasena })
                setSessionCookie(res, session.token)
                return res.status(200).send({ user: session.user })

            }catch(e){
                if (e.code === '23505') {
                    return res.status(409).send({ message: 'El correo ya está registrado' })
                }
                console.error('Error al registrar usuario:', e)
                return res.status(500).send("No se ha podido crear el usuario")
            }

        })

        router.post("/login", async (req, res) => {
            const result = UserLoginDTO.safeParse(req.body)

            if (!result.success){
                return res.status(400).send(result.error.issues.map(e => e.path + e.message))
            }

            try{
                const session = await this.authService.loginUser(result.data)
                setSessionCookie(res, session.token)
                return res.status(200).send({ user: session.user })
            }catch(e){
                return res.status(401).send({ message: 'Credenciales inválidas' })
            }
        })

        router.get("/me", optionalAuthenticateToken, async (req, res) => {
            try{
                if (!req.user) {
                    return res.status(200).send({ user: null })
                }

                const user = await this.authService.getUserById(req.user.sub)
                if (!user){
                    return res.status(404).send({ message: 'Usuario no encontrado' })
                }
                return res.status(200).send({ user })
            }catch(e){
                return res.status(500).send({ message: 'No se ha podido consultar el usuario' })
            }
        })

        router.post("/logout", (req, res) => {
            res.clearCookie(cookieName(), { httpOnly: true, sameSite: 'lax', secure: false })
            return res.status(200).send({ message: 'Sesión cerrada' })
        })
    }
}
