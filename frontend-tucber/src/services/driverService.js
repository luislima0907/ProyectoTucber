import { api } from '../config/api'

export const driverService = {
    async getProfile() {
        const { data } = await api.get('/drivers/me')
        return data.perfil
    },
    async saveProfile(formData) {
        const { data } = await api.put('/drivers/me', formData)
        return data.perfil
    },
    async getAvailability() {
        const { data } = await api.get('/drivers/me/availability')
        return data
    },
    async updateAvailability(disponible) {
        const { data } = await api.patch('/drivers/me/availability', { disponible })
        return data
    },
}
