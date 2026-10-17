export default class DriverRepository{

    constructor(db){
        this.db = db
    }

    async findById(idUsuario){
        const result = await this.db.query(
            `SELECT u.idUsuario, u.nombre, u.correo, u.telefono, u.rol,
                    c.placaVehiculo, c.colorVehiculo, c.capacidadVehiculo, c.fotoVehiculo
             FROM usuarios u
             LEFT JOIN conductores c ON c.idUsuario = u.idUsuario
             WHERE u.idUsuario = $1`,
            [idUsuario]
        )
        return result.rows[0] ?? null
    }

    async saveVehicle({ idUsuario, placa, color, capacidad, telefono, foto }){
        const client = await this.db.connect()
        try{
            await client.query('BEGIN')
            const updated = await client.query(
                "UPDATE usuarios SET telefono = $1 WHERE idUsuario = $2 AND rol = 'conductor'",
                [telefono, idUsuario]
            )
            if (updated.rowCount !== 1){
                await client.query('ROLLBACK')
                return false
            }
            await client.query(
                `INSERT INTO conductores (idUsuario, placaVehiculo, colorVehiculo, capacidadVehiculo, fotoVehiculo)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (idUsuario) DO UPDATE SET
                    placaVehiculo = EXCLUDED.placaVehiculo,
                    colorVehiculo = EXCLUDED.colorVehiculo,
                    capacidadVehiculo = EXCLUDED.capacidadVehiculo,
                    fotoVehiculo = COALESCE(EXCLUDED.fotoVehiculo, conductores.fotoVehiculo),
                    updateAt = now()`,
                [idUsuario, placa, color, capacidad, foto]
            )
            await client.query('COMMIT')
            return true
        }catch(error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    }
}
