import { useState } from 'react'
import { ConductorProfileForm } from '../components/ConductorProfileForm'
import { SolicitudesDisponibles } from '../components/SolicitudesDisponibles'
import '../css/ConductorSolicitudes.css'

export function ConductorHome({ user, onLogout }) {
    const [currentView, setCurrentView] = useState('home')

    return (
        <main className="conductor-panel">
            <header className="conductor-header">
                <div className="conductor-marca">
                    <h1>TUCBER</h1>
                    <span>Panel de conductor</span>
                </div>

                <div className="conductor-usuario">
                    <span>{user.nombre}</span>
                    <button
                        type="button"
                        className="conductor-cerrar-sesion"
                        onClick={onLogout}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </header>

            <nav className="conductor-navegacion" aria-label="Navegación del conductor">
                <button
                    type="button"
                    className={currentView === 'home' ? 'activo' : ''}
                    onClick={() => setCurrentView('home')}
                >
                    Inicio
                </button>

                <button
                    type="button"
                    className={currentView === 'requests' ? 'activo' : ''}
                    onClick={() => setCurrentView('requests')}
                >
                    Solicitudes disponibles
                </button>

                <button
                    type="button"
                    className={currentView === 'vehicle' ? 'activo' : ''}
                    onClick={() => setCurrentView('vehicle')}
                >
                    Mi vehículo
                </button>
            </nav>

            <div className="conductor-contenido">
                {currentView === 'home' && (
                    <section className="conductor-inicio">
                        <h2>¡Bienvenido a TUCBER, {user.nombre}!</h2>
                        <p>
                            Desde aquí puedes administrar tu vehículo y consultar
                            las solicitudes de viaje disponibles.
                        </p>

                        <div className="conductor-accesos">
                            <button
                                type="button"
                                onClick={() => setCurrentView('requests')}
                            >
                                <strong>Solicitudes disponibles</strong>
                                <span>Consulta los viajes que buscan conductor.</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setCurrentView('vehicle')}
                            >
                                <strong>Mi vehículo</strong>
                                <span>Consulta o actualiza los datos de tu vehículo.</span>
                            </button>
                        </div>

                        <section className="conductor-cuenta">
                            <h3>Mi cuenta</h3>
                            <p><strong>Nombre:</strong> {user.nombre}</p>
                            <p><strong>Correo:</strong> {user.correo}</p>
                            <p><strong>Rol:</strong> Conductor</p>
                        </section>
                    </section>
                )}

                {currentView === 'requests' && (
                    <SolicitudesDisponibles />
                )}

                {currentView === 'vehicle' && (
                    <div className="conductor-vehiculo">
                        <ConductorProfileForm />
                    </div>
                )}
            </div>
        </main>
    )
}
