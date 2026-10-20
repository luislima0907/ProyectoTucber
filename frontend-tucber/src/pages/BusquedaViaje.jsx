import '../css/ConfirmacionViaje.css'

export function BusquedaViaje({ solicitud }) {
    const buscando = solicitud.status === 'buscando'

    const nombreEstado = {
        buscando: 'Buscando conductor...',
        aceptada: 'Conductor asignado',
        en_curso: 'Viaje en curso...',
        completada: 'Viaje finalizado',
        cancelada: 'Solicitud cancelada',
        vencida: 'Búsqueda finalizada'

    }

    return (
        <main className="app-card confirmacion-viaje">
            <h1 className="brand-title">
                {buscando
                    ? 'Búsqueda de conductor'
                    : 'Estado de tu solicitud'}
            </h1>

            <p>Tu solicitud fue registrada correctamente.</p>

            <dl className="datos-confirmacion">
                <div>
                    <dt>Número de solicitud</dt>
                    <dd>{solicitud.id}</dd>
                </div>

                <div>
                    <dt>Estado de la solicutud</dt>
                    <dd>{nombreEstado[solicitud.status] || 'Estado no disponible'}</dd>
                </div>

                <div>
                    <dt>Vencimiento de búsqueda</dt>
                    <dd>
                        {new Date(
                            solicitud.expiresAt
                        ).toLocaleString('es-GT')}
                    </dd>
                </div>
            </dl>
        </main>
    )
}