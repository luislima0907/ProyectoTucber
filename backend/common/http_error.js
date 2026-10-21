export default class HttpError extends Error {
    constructor(status, message) {
        super(message)
        this.status = status
    }
}

export function handleError(error, req, res, next) {
    if (res.headersSent) return next(error)
    const status = error.status || 500
    const message = status === 500 ? 'No se pudo completar la operación.' : error.message
    res.status(status).json({ message, error: { message } })
}
