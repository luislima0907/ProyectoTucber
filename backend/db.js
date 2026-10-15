import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function checkDb() {
  try {
    await pool.query('SELECT 1');
  } catch {
    throw new Error(
      'No se pudo conectar a PostgreSQL (db TucberDB). Revisa que el contenedor esté arriba y el .env sea correcto.'
    );
  }
}
