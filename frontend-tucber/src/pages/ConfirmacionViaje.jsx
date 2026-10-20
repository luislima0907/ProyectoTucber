import '../css/ConfirmacionViaje.css'

export function ConfirmacionViaje({ seleccion, onVolver }) {
    const cotizacion = seleccion.cotizacion

    return (
        <main className="app-card confirmacion-viaje">
            <h1 className="brand-title">Revisa tu viaje</h1>

            <p className="subtitle">
                Comprueba los puntos antes de confirmar.
            </p>

            <dl className="datos-confirmacion">
                <div>
                    <dt>Origen</dt>
                    <dd>{seleccion.origen.descripcion}</dd>
                </div>

                <div>
                    <dt>Destino</dt>
                    <dd>{seleccion.destino.descripcion}</dd>
                </div>

                <div>
                    <dt>Referencia de recogida</dt>
                    <dd>
                        {seleccion.referenciaRecogida || 'Sin referencia'}
                    </dd>
                </div>

                <div>
                    <dt>Distancia</dt>
                    <dd>
                        {cotizacion
                            ? `${cotizacion.distanceKm} km`
                            : 'Pendiente de calcular'}
                    </dd>
                </div>

                <div>
                    <dt>Tarifa en quetzales</dt>
                    <dd>
                        {cotizacion
                            ? `${cotizacion.currencySymbol}${cotizacion.amount}`
                            : 'Pendiente de calcular'}
                    </dd>
                </div>
            </dl>

            <div className="acciones-confirmacion">
                <button
                    type="button"
                    className="btn-corregir"
                    onClick={onVolver}
                >
                    Volver a corregir
                </button>

                <button
                    type="button"
                    className="btn-submit"
                    disabled={!cotizacion}
                    aria-describedby="motivo-bloqueo"
                >
                    Confirmar selección
                </button>
            </div>

            {!cotizacion && (
                <small id="motivo-bloqueo">
                    Se necesita una cotización válida para confirmar.
                </small>
            )}
        </main>
    )
}