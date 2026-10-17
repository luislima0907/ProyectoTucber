export async function runConductor(db){
        return db.query(`
            
        CREATE TABLE IF NOT EXISTS conductores (
            idUsuario INTEGER PRIMARY KEY REFERENCES usuarios(idUsuario) ON DELETE CASCADE,
            placaVehiculo TEXT,
            colorVehiculo TEXT,
            capacidadVehiculo SMALLINT,
            createAt TIMESTAMPTZ NOT NULL DEFAULT now(),
            updateAt TIMESTAMPTZ NOT NULL DEFAULT now()
            );       
            `)

}

export async function dropConductor(db){
    db.query("DROP TABLE conductores")

}