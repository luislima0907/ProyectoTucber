import '../css/ConfirmacionViaje.css'

export function ConfirmacionViaje({ seleccion, onVolver }) {
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
                    <dd>Pendiente de calcular</dd>
                </div>

                <div>
                    <dt>Tarifa en quetzales</dt>
                    <dd>Pendiente de calcular</dd>
                </div>
            </dl>

            <p className="aviso-cotizacion" role="status">
                La tarifa aún no está disponible.
                Podrás confirmar cuando se valide la cobertura
                y se calcule el precio.
            </p>

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
                    disabled
                    aria-describedby="motivo-bloqueo"
                >
                    Confirmar selección
                </button>
            </div>

            <small id="motivo-bloqueo">
                Se necesita una cotización válida para confirmar.
            </small>
        </main>
    )
}