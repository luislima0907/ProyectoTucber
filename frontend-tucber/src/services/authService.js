import { api } from '../config/api'
import { getAccessToken, saveAccessToken, clearAccessToken } from '../config/auth'

export const authService = {
    async register(data) {
        const response = await api.post('/auth/register', data)
        saveAccessToken(response.data.token)
        return response.data.user
    },

    async login(data) {
        const response = await api.post('/auth/login', data)
        saveAccessToken(response.data.token)
        return response.data.user
    },

    async getProfile() {
        if (!getAccessToken()) return null
        const response = await api.get('/auth/me')
        if (!response.data.user) clearAccessToken()
        return response.data.user
    },

    async logout() {
        try {
            await api.post('/auth/logout')
        } finally {
            clearAccessToken()
            window.dispatchEvent(new Event('tucber:logout'))
        }
    },
}
