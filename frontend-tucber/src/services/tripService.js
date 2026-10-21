import { api } from '../config/api'

export const tripService = {
    async quote(origin, destination) {
        const { data } = await api.post('/tarifas/cotizacion', { origin, destination })
        return data
    },
    async create(request) {
        const { data } = await api.post('/solicitudes', request)
        return data.solicitud
    },
    async current() {
        const { data } = await api.get('/solicitudes/actual')
        return data.solicitud
    },
    async action(id, action, body = {}) {
        const path = ['llegada', 'iniciar'].includes(action) ? 'solicitudes' : 'viajes'
        const { data } = await api.post(`/${path}/${id}/${action}`, body)
        return data.solicitud || data
    },
    async pin(id) {
        const { data } = await api.get(`/solicitudes/${id}/pin`)
        return data.pin
    },
    async history() {
        const { data } = await api.get('/viajes/historial')
        return data
    },
    async earnings() {
        const { data } = await api.get('/viajes/ingresos')
        return data
    }
}

export function getErrorMessage(error) {
    return error.response?.data?.message || error.message || 'No se pudo completar la acción.'
}

export function formatMoney(amount) {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount)
}
