
export function ConductorHome({ user, onLogout }) {
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

            <p className="subtitle">
                Desde aquí podrás gestionar tu perfil
                de conductor cuando esté disponible.
            </p>

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
