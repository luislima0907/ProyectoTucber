
import { api } from '../config/api'

export const driverService = {
    async getProfile() {
        const response = await api.get('/drivers/me')
        return response.data.perfil
    },

    async saveProfile(formData) {
        const response = await api.put('/drivers/me', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        return response.data.perfil
    },

    async getAvailability(options = {}) {
        const response = await api.get('/drivers/me/availability', options)
        return response.data
    },

    async updateAvailability(disponible) {
        const response = await api.patch('/drivers/me/availability', {
            disponible
        })

        return response.data
    },

    async getPendingRequests(options = {}) {
        const response = await api.get('/drivers/requests/pending', options)
        return response.data.solicitudes
    },

    async submitOffer(requestId) {
        const response = await api.post('/ofertas', { idSolicitud: Number(requestId) })
        return response.data.oferta
    },

    async getOfferStatus(offerId) {
        const response = await api.get(`/ofertas/${offerId}`)
        return response.data.oferta
    }
}
