import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { RegisterForm } from './components/RegisterForm'
import { LoginForm } from './components/LoginForm'
import { ClienteHome } from './pages/ClienteHome'
import { ConductorHome } from './pages/ConductorHome'
import { SeleccionViaje } from './pages/SeleccionViaje'

function MainContent() {
    const { user, logout, loading } = useAuth()
    const [isRegisterView, setIsRegisterView] = useState(false)

    if (loading) {
        return <div style={{ color: '#006852', fontWeight: 'bold' }}>Cargando sesión...</div>
    }

    if (user) {
        if (user.rol === 'cliente') {
            return <ClienteHome user={user} onLogout={logout} />
        }
        
        if (user.rol === 'conductor') {
            return <ConductorHome user={user} onLogout={logout} />
        }

        return (
            <div className="app-card" style={{ textAlign: 'center' }}>
                <h1 className="brand-title">Rol no válido</h1>
                
                <p className="subtitle">
                    No se pudo identificar el rol asociado a tu cuenta.
                </p>
                
                <button
                    type="button"
                    onClick={logout}
                    className="btn-submit"
                >
                    Volver al inicio de sesión
                </button>
            </div>
        )
    }

    return isRegisterView ? (
        <RegisterForm onSwitchToLogin={() => setIsRegisterView(false)} />
    ) : (
        <LoginForm onSwitchToRegister={() => setIsRegisterView(true)} />
    )
}

function App() {
        const parametros = new URLSearchParams(window.location.search)

    if (parametros.get('vista') === 'seleccion') {
        return (
            <div className="auth-container">
                <SeleccionViaje />
            </div>
        )
    }
    
    return (
        <AuthProvider>
            <div className="auth-container">
                <MainContent />
            </div>
        </AuthProvider>
    )
}

export default App