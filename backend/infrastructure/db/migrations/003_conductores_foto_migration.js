export async function runConductoresFoto(db){
    return db.query(`
        ALTER TABLE conductores
        ADD COLUMN IF NOT EXISTS fotoVehiculo TEXT;
    `)
}
