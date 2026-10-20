import { api } from '../config/api'

export const passengerService = {
    async cancelTrip(tripId, reason = '') {
        const response = await api.post(`/trips/${tripId}/cancel`, { reason })
        return response.data
    },

    async getTripStatus(tripId) {
        const response = await api.get(`/trips/${tripId}`)
        return response.data
    }
}