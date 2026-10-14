import { useState } from "react"
import { useAuth } from "../context/useAuth"

export const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
    const { register } = useAuth()

    const [nombre, setNombre] = useState('')
    const [correo, setCorreo] = useState('')
    const [contrasena, setContrasena] = useState('')
    const [rol, setRol] = useState('cliente') 

    const [error, setError] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)

        try {
            await register({ nombre, correo, contrasena, rol })
            if (onSuccess) onSuccess()
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Error al registrar la cuenta.'
            setError(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="app-card">
            <h1 className="brand-title">Crea tu cuenta</h1>
            <p className="subtitle">Únete a la comunidad de TUCBER</p>

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
                <label>Nombre completo</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder="María López"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <label>Correo electrónico</label>
                <input
                    type="email"
                    className="form-input"
                    placeholder="maria@correo.com"
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
                    placeholder="Mínimo 8 caracteres"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete="new-password"
                    required
                />
            </div>

            <div className="form-group" style={{ marginTop: '0.2rem' }}>
                <label>Quiero usar TUCBER para</label>
                <div className="role-picker">
                    <div
                        className={`role-card ${rol === 'cliente' ? 'selected' : ''}`}
                        onClick={() => setRol('cliente')}
                    >
                        <input
                            type="radio"
                            name="rol"
                            value="cliente"
                            checked={rol === 'cliente'}
                            onChange={() => setRol('cliente')}
                            className="role-radio"
                        />
                        Viajar
                    </div>

                    <div
                        className={`role-card ${rol === 'conductor' ? 'selected' : ''}`}
                        onClick={() => setRol('conductor')}
                    >
                        <input
                            type="radio"
                            name="rol"
                            value="conductor"
                            checked={rol === 'conductor'}
                            onChange={() => setRol('conductor')}
                            className="role-radio"
                        />
                        Conductor
                    </div>
                </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-submit">
                {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            {onSwitchToLogin && (
                <p className="switch-text">
                    ¿Ya tienes cuenta?{' '}
                    <button type="button" onClick={onSwitchToLogin} className="link-btn">
                        Inicia sesión
                    </button>
                </p>
            )}
        </form>
    )
}