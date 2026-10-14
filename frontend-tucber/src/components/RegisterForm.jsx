import { useState } from "react"
import { useAuth } from "../context/useAuth"
import {useFormValidation} from "../hooks/useFormValidation"
import { validateEmail, validatePassword, validateRequired, validateRole } from "../utils/validationUtils"

export const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
    const { register } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const validators = {
        nombre: (val) => validateRequired(val, 'El nombre completo'),
        correo: validateEmail,
        contrasena: (val) => validatePassword(val, 8),
        rol: validateRole
    }

    const{values, setValues, errors, handlChange, handleBlur, validateAll, handleBackendErrors} =
    useFormValidation({nombre: '', correo: '', contrasena: '', rol: 'cliente'},validators)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateAll()) return
        setIsSubmitting(true)

        try {
            await register(values)
            if (onSuccess) onSuccess()
        } catch (err) {
            handleBackendErrors(err)
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

            {errors.general && <div className="error-msg">{errors.general}</div>}

            <div className="form-group">
                <label htmlFor="nombre" className={errors.nombre ? 'label-error' : ''}>
                    Nombre completo
                </label>
                <input id="nombre" name="nombre" type="text" className={`form-input ${errors.nombre ? 'input-error' : ''}`}
                    placeholder="María López"
                    value={values.nombre}
                    onChange={handlChange}
                    onBlur={handleBlur}
                    required
                />
                {errors.nombre && <span className="field-error-msg">{errors.nombre}</span>}
            </div>

            <div className="form-group">
                <label htmlFor= "correo" className={errors.correo ? 'label-error' : ''}>
                    Correo electrónico
                </label>
                <input
                    id="correo"
                    name="correo"
                    type="email"
                    className={`form-input ${errors.correo ? 'input-error' : ''}`}
                    placeholder="maria@correo.com"
                    value={values.correo}
                    onChange={handlChange}
                    onBlur={handleBlur}
                    autoComplete="email"
                    required
                />
                {errors.correo && <span className="field-error-msg">{errors.correo}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="contrasena" className={errors.contrasena ? 'label-error' : ''}>
                    Contraseña
                </label>
                <input
                    id="contrasena"
                    name="contrasena"
                    type="password"
                    className={`form-input ${errors.contrasena ? 'input-error' : ''}`}
                    placeholder="Mínimo 8 caracteres"
                    value={values.contrasena}
                    onChange={handlChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    required
                />
                {errors.contrasena && <span className="field-error-msg">{errors.contrasena}</span>}
            </div>

            <div className="form-group" style={{ marginTop: '0.2rem' }}>
                <label htmlFor="rol" className={errors.rol ? 'label-error' : ''}>
                    Quiero usar TUCBER para
                </label>
                <div className="role-picker">
                    <div
                        className={`role-card ${values.rol === 'cliente' ? 'selected' : ''}`}
                        onClick ={()=> setValues(prev => ({ ...prev, rol: 'cliente' }))}
                    >
                        <input
                            type="radio"
                            name="rol"
                            value="cliente"
                            checked={values.rol === 'cliente'}
                            onChange={handlChange}
                            className="role-radio"
                        />
                        Viajar
                    </div>

                    <div
                        className={`role-card ${values.rol === 'conductor' ? 'selected' : ''}`}
                        onClick ={()=> setValues(prev => ({ ...prev, rol: 'conductor' }))}
                    >
                        <input
                            type="radio"
                            name="rol"
                            value="conductor"
                            checked={values.rol === 'conductor'}
                            onChange={handlChange}
                            className="role-radio"
                        />
                        Conductor
                    </div>
                </div>
                {errors.rol && <span className="field-error-msg">{errors.rol}</span>}
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