import { useEffect, useState } from 'react'
import { driverService } from '../services/driverService'
import { API_URL } from '../config/api'
import { getErrorMessage } from '../services/tripService'

export function ConductorProfileForm() {
    const [profile, setProfile] = useState(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    useEffect(() => {
        let active = true
        driverService
            .getProfile()
            .then((data) => {
                if (active) setProfile(data)
            })
            .catch((failure) => {
                if (active) setError(getErrorMessage(failure))
            })
        return () => {
            active = false
        }
    }, [])
    async function submit(event) {
        event.preventDefault()
        setBusy(true)
        setError('')
        setMessage('')
        try {
            const saved = await driverService.saveProfile(new FormData(event.currentTarget))
            setProfile(saved)
            setMessage('Perfil guardado.')
        } catch (failure) {
            setError(getErrorMessage(failure))
        } finally {
            setBusy(false)
        }
    }
    if (!profile) return <p role="status">{error || 'Cargando vehículo…'}</p>
    return (
        <form className="profile-form" onSubmit={submit}>
            <h2>Tu vehículo</h2>
            <p className="muted">Estos datos ayudan al cliente a reconocerte.</p>
            <label className="form-group">
                Placa
                <input
                    name="placa"
                    defaultValue={profile.placa || ''}
                    required
                    minLength={4}
                    maxLength={10}
                />
            </label>
            <label className="form-group">
                Color
                <input
                    name="color"
                    defaultValue={profile.color || ''}
                    required
                    minLength={3}
                    maxLength={30}
                />
            </label>
            <label className="form-group">
                Pasajeros
                <input
                    type="number"
                    name="capacidad"
                    defaultValue={profile.capacidad || 1}
                    required
                    min={1}
                    max={5}
                />
            </label>
            <label className="form-group">
                Teléfono
                <input
                    name="telefono"
                    type="tel"
                    defaultValue={profile.telefono || ''}
                    required
                    pattern="\+?[0-9]{7,15}"
                />
            </label>
            <label className="form-group">
                Foto del vehículo
                <input type="file" name="foto" accept="image/jpeg,image/png" />
            </label>
            {profile.foto && (
                <img
                    className="profile-photo"
                    src={`${API_URL}${profile.foto}`}
                    alt="Tu vehículo"
                />
            )}
            {error && (
                <p role="alert" className="error-msg">
                    {error}
                </p>
            )}
            {message && <p role="status">{message}</p>}
            <button className="primary-button" disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar vehículo'}
            </button>
        </form>
    )
}
