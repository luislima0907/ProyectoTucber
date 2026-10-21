import { useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './Context.js'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const clearUser = () => setUser(null)
        window.addEventListener('tucber:logout', clearUser)
        authService
            .getProfile()
            .then((userData) => setUser(userData))
            .catch(() => setUser(null))
            .finally(() => setLoading(false))
        return () => window.removeEventListener('tucber:logout', clearUser)
    }, [])

    const login = async (credentials) => {
        const userData = await authService.login(credentials)
        setUser(userData)
    }

    const register = async (data) => {
        const userData = await authService.register(data)
        setUser(userData)
    }

    const logout = async () => {
        await authService.logout()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
