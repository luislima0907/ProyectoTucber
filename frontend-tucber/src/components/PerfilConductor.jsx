export function PerfilConductor({
    oferta,
    perfil,
    bloqueado,
    aceptando,
    descartando,
    onAceptar,
    onDescartar,
    onVolver
}) {
    let calificacion = 'No disponible'

    if (perfil?.cantidadResenas === 0) {
        calificacion = 'Nuevo'
    } else if (Number.isFinite(perfil?.calificacion)) {
        calificacion = perfil.calificacion.toFixed(1) + ' / 5'
    }

    return (
        <section className="perfil-conductor">
            <h3>Perfil del conductor</h3>

            {perfil?.foto ? (
                <img
                    className="perfil-conductor-foto"
                    src={perfil.foto}
                    alt="Foto del conductor"
                />
            ) : (
                <div className="perfil-conductor-sin-foto">
                    Foto no disponible
                </div>
            )}

            {!perfil && (
                <p>
                    Los datos del perfil aún no están disponibles.
                    Puedes consultar la tarifa y el vencimiento de la oferta.
                </p>
            )}

            <dl className="datos-confirmacion">
                <div>
                    <dt>Calificación</dt>
                    <dd>{calificacion}</dd>
                </div>

                <div>
                    <dt>Viajes realizados</dt>
                    <dd>{perfil?.viajes ?? 'No disponible'}</dd>
                </div>

                <div>
                    <dt>Vehículo</dt>
                    <dd>{perfil?.vehiculo || 'No disponible'}</dd>
                </div>

                <div>
                    <dt>Placa</dt>
                    <dd>{perfil?.placa || 'No disponible'}</dd>
                </div>

                <div>
                    <dt>Tarifa de la oferta</dt>
                    <dd>Q{Number(oferta.amount).toFixed(2)}</dd>
                </div>

                <div>
                    <dt>Oferta disponible hasta</dt>
                    <dd>
                        {new Date(oferta.expiresAt)
                            .toLocaleTimeString('es-GT')}
                    </dd>
                </div>
            </dl>

            <div className="acciones-oferta">
                <button
                    type="button"
                    className="btn-oferta btn-aceptar"
                    disabled={bloqueado}
                    onClick={onAceptar}
                >
                    {aceptando ? 'Aceptando...' : 'Aceptar oferta'}
                </button>

                <button
                    type="button"
                    className="btn-oferta btn-descartar"
                    disabled={bloqueado}
                    onClick={onDescartar}
                >
                    {descartando ? 'Descartando...' : 'Descartar oferta'}
                </button>
            </div>

            <button
                type="button"
                className="btn-oferta btn-actualizar"
                disabled={bloqueado}
                onClick={onVolver}
            >
                Volver a las ofertas
            </button>
        </section>
    )
}