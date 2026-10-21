export async function runViajes(db) {
    await db.query(`
        ALTER TABLE solicitudes
        ADD COLUMN IF NOT EXISTS finalizadoAt TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS pagoConfirmado BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS calificacion SMALLINT CHECK (calificacion BETWEEN 1 AND 5);

        CREATE TABLE IF NOT EXISTS reportes (
            idReporte SERIAL PRIMARY KEY,
            idSolicitud INTEGER NOT NULL REFERENCES solicitudes(idSolicitud),
            idUsuario INTEGER NOT NULL REFERENCES usuarios(idUsuario),
            descripcion TEXT NOT NULL,
            createAt TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `)
}
