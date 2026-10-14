import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { RegisterForm } from './components/RegisterForm'
import { LoginForm } from './components/LoginForm'

function MainContent() {
    const { user, logout, loading } = useAuth()
    const [isRegisterView, setIsRegisterView] = useState(false)

    if (loading) {
        return <div style={{ color: '#006852', fontWeight: 'bold' }}>Cargando sesión...</div>
    }

    if (user) {
        return (
            <div className="app-card" style={{ textAlign: 'center' }}>
                <h1 className="brand-title">¡Hola, {user.nombre}!</h1>
                <p className="subtitle">Sesión activa en TUCBER</p>

                <div className="diamond-divider" style={{ justifyContent: 'center' }}>
                    <span className="diamond" style={{ background: '#006852' }}></span>
                    <span className="diamond" style={{ background: '#d97706' }}></span>
                    <span className="diamond" style={{ background: '#0284c7' }}></span>
                    <span className="diamond" style={{ background: '#006852' }}></span>
                    <span className="diamond" style={{ background: '#d97706' }}></span>
                    <span className="diamond" style={{ background: '#0284c7' }}></span>
                    <span className="diamond" style={{ background: '#006852' }}></span>
                    <span className="diamond" style={{ background: '#006852' }}></span>
                    <span className="diamond" style={{ background: '#d97706' }}></span>
                    <span className="diamond" style={{ background: '#0284c7' }}></span>
                    <span className="diamond" style={{ background: '#006852' }}></span>
                    <span className="diamond" style={{ background: '#d97706' }}></span>
                    <span className="diamond" style={{ background: '#0284c7' }}></span>
                    <span className="diamond" style={{ background: '#006852' }}></span>
                </div>

                <div style={{ textTransform: 'capitalize', margin: '1rem 0', textAlign: 'left', background: '#fafcfb', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8e5' }}>
                    <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}><strong>Correo:</strong> {user.correo}</p>
                    <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}><strong>Rol:</strong> {user.rol}</p>
                </div>

                {!user.isVerified && (
                    <div className="verify-box" style={{ textAlign: 'left' }}>
                      <strong>Verificación pendiente:</strong> No puedes realizar ni aceptar viajes hasta completar la verificación de la cuenta.
                    </div>
                )}

                <button onClick={logout} className="btn-submit">
                    Cerrar sesión
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
    return (
        <AuthProvider>
            <div className="auth-container">
                <MainContent />
            </div>
        </AuthProvider>
    )
}

export default App