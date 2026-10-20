import { useState, useEffect } from 'react'
import { ConductorProfileForm } from '../components/ConductorProfileForm'
import { SolicitudesDisponibles } from '../components/SolicitudesDisponibles'
import { ControlCancelacionViaje } from '../components/ControlCancelacionViaje'
import '../css/ConductorSolicitudes.css'

export function ConductorHome({ user, onLogout }) {
    const [currentView, setCurrentView] = useState('home')
    const [viajeActivo, setViajeActivo] = useState(null)

    useEffect(() => {
        let cancelado = false

        const consultarViaje = async () => {
            try {
                const res = await fetch('http://localhost:3001/solicitudes/actual', {
                    credentials: 'include'
                })
                if (res.ok) {
                    const data = await res.json()
                    if (!cancelado) {
                        const viaje = Array.isArray(data) ? data[0] : (data?.solicitud || data)
                        setViajeActivo(viaje && (viaje.id || viaje.solicitudId) ? viaje : null)
                    }
                } else {
                    if (!cancelado) setViajeActivo(null)
                }
            } catch (error) {
                console.error('Error al obtener viaje activo:', error)
                if (!cancelado) setViajeActivo(null)
            }
        }

        consultarViaje()

        return () => {
            cancelado = true
        }
    }, [])

    const handleCancelacionExitosa = () => {
        setViajeActivo(null)
        setCurrentView('requests')
    }

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
                        {viajeActivo ? (
                            <div className="conductor-viaje-activo" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <h2>Viaje en curso</h2>
                                <p><strong>Solicitud #:</strong> {viajeActivo.id || viajeActivo.solicitudId}</p>
                                <p><strong>Estado:</strong> {viajeActivo.estado}</p>
                                
                                <div style={{ marginTop: '20px' }}>
                                    <ControlCancelacionViaje 
                                        viajeId={viajeActivo.id || viajeActivo.solicitudId} 
                                        onCancelSuccess={handleCancelacionExitosa}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
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
                            </>
                        )}
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