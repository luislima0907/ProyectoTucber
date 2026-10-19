export default class DriverRepository{

    constructor(db){
        this.db = db
    }

    async findById(idUsuario){
        const result = await this.db.query(
            `SELECT u.idUsuario, u.nombre, u.correo, u.telefono, u.rol,
                    c.placaVehiculo, c.colorVehiculo, c.capacidadVehiculo, c.fotoVehiculo,
                    c.disponible
             FROM usuarios u
             LEFT JOIN conductores c ON c.idUsuario = u.idUsuario
             WHERE u.idUsuario = $1`,
            [idUsuario]
        )
        return result.rows[0] ?? null
    }

    async setAvailability(idUsuario, disponible){
        const client = await this.db.connect()
        try{
            await client.query('BEGIN')
            await client.query('SELECT pg_advisory_xact_lock($1)', [idUsuario])

            if (disponible){
                const activeTrip = await client.query(
                    `SELECT 1
                     FROM solicitudes
                     WHERE idConductor = $1
                       AND estado IN ('aceptada', 'en_curso')
                     LIMIT 1`,
                    [idUsuario]
                )
                if (activeTrip.rowCount === 1){
                    const error = new Error('El conductor ya tiene un viaje activo')
                    error.code = 'ACTIVE_TRIP'
                    throw error
                }
            }else{
                await client.query(
                    `UPDATE ofertas
                     SET estado = 'retirada'
                     WHERE idConductor = $1
                       AND estado = 'vigente'
                       AND expiresAt > now()`,
                    [idUsuario]
                )
            }

            const result = await client.query(
                `INSERT INTO conductores (idUsuario, disponible)
                 VALUES ($1, $2)
                 ON CONFLICT (idUsuario) DO UPDATE SET
                    disponible = EXCLUDED.disponible,
                    updateAt = now()
                 RETURNING disponible`,
                [idUsuario, disponible]
            )
            await client.query('COMMIT')
            return result.rows[0].disponible
        }catch(error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    }

    async findPendingRequests(idUsuario){
        const result = await this.db.query(
            `SELECT
                s.idSolicitud,
                ROUND((s.origen->>'latitude')::numeric, 2) AS origen_latitud_aproximada,
                ROUND((s.origen->>'longitude')::numeric, 2) AS origen_longitud_aproximada,
                ROUND((s.destino->>'latitude')::numeric, 2) AS destino_latitud_aproximada,
                ROUND((s.destino->>'longitude')::numeric, 2) AS destino_longitud_aproximada,
                s.distanciaCotizadaMetros,
                s.tarifaAcordada,
                s.moneda,
                s.estado,
                s.createAt,
                s.expiresAt
             FROM solicitudes s
             JOIN conductores c ON c.idUsuario = $1 AND c.disponible = TRUE
             WHERE s.estado = 'buscando'
               AND s.idConductor IS NULL
               AND s.expiresAt > now()
               AND NOT EXISTS (
                   SELECT 1
                   FROM solicitudes viaje
                   WHERE viaje.idConductor = $1
                     AND viaje.estado IN ('aceptada', 'en_curso')
               )
             ORDER BY s.createAt ASC`,
            [idUsuario]
        )

        return result.rows.map((row) => ({
            id: row.idsolicitud,
            originZone: {
                latitude: Number(row.origen_latitud_aproximada),
                longitude: Number(row.origen_longitud_aproximada)
            },
            destinationZone: {
                latitude: Number(row.destino_latitud_aproximada),
                longitude: Number(row.destino_longitud_aproximada)
            },
            distanceMeters: row.distanciacotizadametros,
            amount: Number(row.tarifaacordada),
            currency: row.moneda,
            status: row.estado,
            createdAt: row.createat,
            expiresAt: row.expiresat
        }))
    }

    async findCurrentTrip(idConductor){
        const result = await this.db.query(
            `SELECT *
             FROM solicitudes
             WHERE idConductor = $1
               AND estado IN ('aceptada', 'en_curso')
             ORDER BY createAt DESC
             LIMIT 1`,
            [idConductor]
        )
        const row = result.rows[0]
        if (!row) return null
        return {
            id: row.idsolicitud,
            origin: row.origen,
            destination: row.destino,
            reference: row.referencia,
            distanceMeters: row.distanciacotizadametros,
            amount: Number(row.tarifaacordada),
            currency: row.moneda,
            status: row.estado,
            createdAt: row.createat,
            expiresAt: row.expiresat
        }
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
