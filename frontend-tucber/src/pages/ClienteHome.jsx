import { useState } from 'react'
import { SeleccionViaje } from './SeleccionViaje'
import '../css/ClienteHome.css'

export function ClienteHome({ user, onLogout }) {
    const [vista, setVista] = useState('inicio')

    if (vista === 'viaje') {
        return (
            <div className="cliente-contenido">
                <button
                    type="button"
                    className="cliente-volver"
                    onClick={() => setVista('inicio')}
                >
                    ← Volver al inicio
                </button>

                <SeleccionViaje />
            </div>
        )
    }

    if (vista === 'cuenta') {
        return (
            <main className="app-card cliente-inicio">
                <button
                    type="button"
                    className="cliente-volver"
                    onClick={() => setVista('inicio')}
                >
                    ← Volver al inicio
                </button>

                <h1 className="brand-title">Mi cuenta</h1>

                <dl className="cliente-datos">
                    <dt>Nombre</dt>
                    <dd>{user.nombre}</dd>

                    <dt>Correo electrónico</dt>
                    <dd>{user.correo}</dd>

                    <dt>Tipo de cuenta</dt>
                    <dd>Cliente</dd>
                </dl>
            </main>
        )
    }

    return (
        <main className="app-card cliente-inicio">
            <h1 className="brand-title">¡Bienvenido a TUCBER!</h1>

            <p className="cliente-saludo">
                Hola, {user.nombre} prepárate para tu primer viaje.
            </p>

            <section className="cliente-viaje">
                <h2>¿A dónde quieres ir?</h2>

                <p>
                    Selecciona tu punto de recogida y destino
                    para preparar un viaje.
                </p>

                <button
                    type="button"
                    className="btn-submit"
                    onClick={() => setVista('viaje')}
                >
                    Preparar viaje
                </button>
            </section>

            <nav className="cliente-opciones" aria-label="Mi cuenta">
                <button
                    type="button"
                    className="cliente-opcion"
                    onClick={() => setVista('cuenta')}
                >
                    Mi cuenta
                </button>

                <button
                    type="button"
                    className="cliente-opcion"
                    onClick={onLogout}
                >
                    Cerrar sesión
                </button>
            </nav>
        </main>
    )
}