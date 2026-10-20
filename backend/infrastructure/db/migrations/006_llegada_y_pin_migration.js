export async function runLlegadaYPin(db){
    await db.query(`
        ALTER TABLE solicitudes
        ADD COLUMN IF NOT EXISTS llegadaAt TIMESTAMPTZ;

        ALTER TABLE solicitudes
        ADD COLUMN IF NOT EXISTS pin VARCHAR(6);

        ALTER TABLE solicitudes
        DROP CONSTRAINT IF EXISTS solicitudes_estado_check;

        ALTER TABLE solicitudes
        ADD CONSTRAINT solicitudes_estado_check
        CHECK (estado IN ('buscando', 'aceptada', 'en_recogida', 'en_curso', 'completada', 'cancelada', 'vencida'));
    `)
}
