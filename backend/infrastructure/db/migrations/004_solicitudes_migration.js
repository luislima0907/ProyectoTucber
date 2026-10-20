export async function runSolicitudes(db){
    await db.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'solicitudes'
                AND column_name = 'idcliente'
            ) THEN
                DROP TABLE IF EXISTS ofertas CASCADE;
                DROP TABLE IF EXISTS solicitudes CASCADE;
            END IF;
        END $$;
    `)

    await db.query(`
        CREATE TABLE IF NOT EXISTS solicitudes (
            idSolicitud SERIAL PRIMARY KEY,
            idUsuario INTEGER NOT NULL REFERENCES usuarios(idUsuario) ON DELETE CASCADE,
            idIntento TEXT NOT NULL,
            origen JSONB NOT NULL,
            destino JSONB NOT NULL,
            referencia TEXT,
            distanciaCotizadaMetros INTEGER NOT NULL CHECK (distanciaCotizadaMetros > 0),
            tarifaAcordada NUMERIC(10, 2) NOT NULL CHECK (tarifaAcordada >= 0),
            moneda TEXT NOT NULL DEFAULT 'GTQ',
            estado TEXT NOT NULL DEFAULT 'buscando'
                CHECK (estado IN ('buscando', 'aceptada', 'en_curso', 'completada', 'cancelada', 'vencida')),
            createAt TIMESTAMPTZ NOT NULL DEFAULT now(),
            expiresAt TIMESTAMPTZ NOT NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS solicitudes_usuario_intento_idx
            ON solicitudes(idUsuario, idIntento);

        CREATE INDEX IF NOT EXISTS solicitudes_usuario_estado_idx
            ON solicitudes(idUsuario, estado);
    `)

    await db.query(`
        CREATE TABLE IF NOT EXISTS ofertas (
            idOferta SERIAL PRIMARY KEY,
            idSolicitud INTEGER NOT NULL REFERENCES solicitudes(idSolicitud) ON DELETE CASCADE,
            idConductor INTEGER NOT NULL REFERENCES usuarios(idUsuario) ON DELETE CASCADE,
            tarifa NUMERIC(10, 2) NOT NULL CHECK (tarifa >= 0),
            estado TEXT NOT NULL DEFAULT 'vigente'
                CHECK (estado IN ('vigente', 'aceptada', 'rechazada', 'expirada', 'retirada')),
            createAt TIMESTAMPTZ NOT NULL DEFAULT now(),
            expiresAt TIMESTAMPTZ NOT NULL
        );

        CREATE INDEX IF NOT EXISTS ofertas_solicitud_vigentes_idx
            ON ofertas(idSolicitud, estado, expiresAt);
    `)
}
