export async function runDisponibilidadConductores(db){
    await db.query(`
        ALTER TABLE conductores
        ADD COLUMN IF NOT EXISTS disponible BOOLEAN NOT NULL DEFAULT FALSE;

        ALTER TABLE solicitudes
        ADD COLUMN IF NOT EXISTS idConductor INTEGER REFERENCES usuarios(idUsuario);

        ALTER TABLE ofertas
        DROP CONSTRAINT IF EXISTS ofertas_estado_check;

        ALTER TABLE ofertas
        ADD CONSTRAINT ofertas_estado_check
        CHECK (estado IN ('vigente', 'aceptada', 'rechazada', 'expirada', 'retirada'));

        CREATE INDEX IF NOT EXISTS solicitudes_conductor_estado_idx
            ON solicitudes(idConductor, estado);
    `)
}
