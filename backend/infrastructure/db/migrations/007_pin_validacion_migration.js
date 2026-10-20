export async function runPinValidacion(db){
    await db.query(`
        ALTER TABLE solicitudes
        ALTER COLUMN pin TYPE VARCHAR(4);

        ALTER TABLE solicitudes
        ADD COLUMN IF NOT EXISTS pinIntentosFallidos INT NOT NULL DEFAULT 0;

        ALTER TABLE solicitudes
        ADD COLUMN IF NOT EXISTS pinBloqueadoHasta TIMESTAMPTZ;

        ALTER TABLE solicitudes
        ADD COLUMN IF NOT EXISTS pinConsumido BOOLEAN NOT NULL DEFAULT false;

        ALTER TABLE solicitudes
        ADD COLUMN IF NOT EXISTS iniciadoAt TIMESTAMPTZ;
    `)
}