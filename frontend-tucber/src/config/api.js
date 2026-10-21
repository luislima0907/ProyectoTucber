import axios from 'axios'
import { getAccessToken, clearAccessToken } from './auth'

export const API_URL = import.meta.env.VITE_API_URL || '/api'
export const api = axios.create({ baseURL: API_URL, withCredentials: true })

api.interceptors.request.use((request) => {
    const token = getAccessToken()
    if (token) request.headers.Authorization = `Bearer ${token}`
    return request
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearAccessToken()
            window.dispatchEvent(new Event('tucber:logout'))
        }
        return Promise.reject(error)
    },
)
