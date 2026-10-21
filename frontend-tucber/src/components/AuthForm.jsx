import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { Brand } from './layout/AppShell'
import { getErrorMessage } from '../services/tripService'

export function AuthForm() {
    const { login, register } = useAuth()
    const [registering, setRegistering] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [role, setRole] = useState('cliente')
    async function submit(event) {
        event.preventDefault()
        setBusy(true)
        setError('')
        const fields = Object.fromEntries(new FormData(event.currentTarget))
        try {
            if (registering) await register({ ...fields, rol: role })
            else await login(fields)
        } catch (failure) { setError(getErrorMessage(failure)) }
        finally { setBusy(false) }
    }
    return <main className="auth-layout">
        <section className="auth-story"><Brand /><div><h1>De aquí.<br />Para llevarte<br /><em>más cerca.</em></h1><p>Tu próximo viaje por Jalapa.<br />Con la confianza de nuestra gente.</p></div><span>GUATEMALA · TUCBER</span></section>
        <section className="auth-form-panel"><form onSubmit={submit}>
            <div className="mobile-brand"><Brand /></div>
            <h2>{registering ? 'Empecemos el camino.' : 'Qué bueno verte.'}</h2><p className="muted">{registering ? 'Crea tu cuenta y muévete con nosotros.' : 'Inicia sesión para continuar tu viaje.'}</p>
            {registering && <label className="form-group">Tu nombre<input name="nombre" autoComplete="name" required placeholder="Nombre y apellido" /></label>}
            <label className="form-group">Correo electrónico<input name="correo" type="email" autoComplete="email" required placeholder="tu@correo.com" /></label>
            <label className="form-group">Contraseña<input name="contrasena" type="password" minLength={registering ? 6 : 1} autoComplete={registering ? 'new-password' : 'current-password'} required placeholder={registering ? 'Al menos 6 caracteres' : 'Tu contraseña'} /></label>
            {registering && <fieldset className="role-picker"><legend>¿Cómo quieres usar TUCBER?</legend>{['cliente', 'conductor'].map(value => <label key={value} className={role === value ? 'role-option selected' : 'role-option'}><input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} />{value === 'cliente' ? 'Quiero viajar' : 'Quiero conducir'}</label>)}</fieldset>}
            {error && <p className="error-msg" role="alert">{error}</p>}
            <button className="primary-button" disabled={busy}>{busy ? 'Procesando…' : registering ? 'Crear mi cuenta' : 'Iniciar sesión'}</button>
            <p className="auth-switch">{registering ? '¿Ya tienes cuenta?' : '¿Tu primer viaje con nosotros?'} <button type="button" className="text-button" onClick={() => { setRegistering(!registering); setError('') }}>{registering ? 'Inicia sesión' : 'Crea una cuenta'}</button></p>
        </form></section>
    </main>
}
