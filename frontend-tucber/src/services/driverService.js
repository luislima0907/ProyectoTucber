
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
    }
}
