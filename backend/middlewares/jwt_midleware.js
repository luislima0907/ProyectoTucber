import jwt from 'jsonwebtoken'

export function readIdentity(request) {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'tucber_session'
    const cookie = request.headers.cookie?.split(';').map(part => part.trim())
        .find(part => part.startsWith(`${cookieName}=`))
    const token = request.headers.authorization?.replace(/^Bearer /, '')
        || (cookie && decodeURIComponent(cookie.slice(cookieName.length + 1)))
    const user = jwt.verify(token, process.env.JWT_SECRET)
    if (!Number.isInteger(Number(user.sub)) || !['cliente', 'conductor'].includes(user.rol)) {
        throw new Error('Invalid identity')
    }
    return { ...user, sub: Number(user.sub) }
}

export function authenticateToken(req, res, next) {
    try {
        req.user = readIdentity(req)
        next()
    } catch {
        res.status(401).json({ message: 'Inicia sesión para continuar.' })
    }
}

export function optionalAuthenticateToken(req, res, next) {
    try {
        req.user = readIdentity(req)
    } catch {
        req.user = null
    }
    next()
}
