DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS usuarios (
  idUsuario SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT UNIQUE NOT NULL,
  contrasenaHash TEXT NOT NULL,
  telefono TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('cliente', 'conductor')),
  correoVerificado BOOLEAN NOT NULL DEFAULT FALSE,
  verifiedAt TIMESTAMPTZ,
  createAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updateAt TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conductores (
  idUsuario INTEGER PRIMARY KEY REFERENCES usuarios(idUsuario) ON DELETE CASCADE,
  placaVehiculo TEXT,
  colorVehiculo TEXT,
  capacidadVehiculo SMALLINT,
  estadoRevision TEXT NOT NULL DEFAULT 'pendiente' CHECK (estadoRevision IN ('pendiente', 'en_revision', 'aprobado', 'rechazado')),
  createAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updateAt TIMESTAMPTZ NOT NULL DEFAULT now()
);

