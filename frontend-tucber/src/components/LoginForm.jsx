import { useState } from "react"
import { useAuth } from "../context/useAuth"

export const LoginForm = ({ onSuccess, onSwitchToRegister }) => {
    const { login } = useAuth()

    const [correo, setCorreo] = useState('')
    const [contrasena, setContrasena] = useState('')

    const [error, setError] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)

        try {
            await login({ correo, contrasena })
            if (onSuccess) onSuccess()
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Credenciales inválidas. Verifica tu correo y contraseña.'
            setError(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="app-card">
            <h1 className="brand-title">TUCBER</h1>
            <p className="subtitle">Los mejores viajes al alcance de tu mano.</p>

            <div className="diamond-divider">
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

            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
                <label>Correo electrónico</label>
                <input
                    type="email"
                    className="form-input"
                    placeholder="tu@correo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    autoComplete="email"
                    required
                />
            </div>

            <div className="form-group">
                <label>Contraseña</label>
                <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete="current-password"
                    required
                />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-submit">
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            {onSwitchToRegister && (
                <p className="switch-text">
                    ¿No tienes cuenta?{' '}
                    <button type="button" onClick={onSwitchToRegister} className="link-btn">
                        Crear cuenta
                    </button>
                </p>
            )}
        </form>
    )
}