import { useState } from 'react'
import { ConductorProfileForm } from '../components/ConductorProfileForm'

export function ConductorHome({ user, onLogout }) {
    const [currentView, setCurrentView] = useState('home')

    if (currentView === 'vehicle') {
        return (
            <main className="app-card">
                <button
                    type="button"
                    className="link-btn"
                    onClick={() => setCurrentView('home')}
                >
                    Volver al panel
                </button>

                 <ConductorProfileForm />
            </main>
        )
    }

    return (
        <main className="app-card">
            <h1 className="brand-title">
                ¡Bienvenido a TUCBER, {user.nombre}!
            </h1>

            <p className="subtitle">
                Panel de conductor
            </p>

            <div className="diamond-divider">
                <span className="diamond"></span>
                <span className="diamond"></span>
                <span className="diamond"></span>
            </div>

            <section>
                <h2>Mi cuenta</h2>
                <p><strong>Nombre:</strong> {user.nombre}</p>
                <p><strong>Correo:</strong> {user.correo}</p>
                <p><strong>Rol:</strong> Conductor</p>
            </section>

            <section className="form-group">
                <h2>Mi vehículo</h2>
                <p className="subtitle">
                    Registra o actualiza los datos de tu vehículo.
                </p>

                <button
                    type="button"
                    className="btn-submit"
                    onClick={() => setCurrentView('vehicle')}
                >
                    Gestionar mi vehículo
                </button>
            </section>

            <button
                type="button"
                onClick={onLogout}
                className="btn-submit"
            >
                Cerrar sesión
            </button>
        </main>
    )
}
