import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Pool } from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, 'schema.sql');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Migración aplicada: db TucberDB lista.');
} catch {
  console.error(
    'No se pudo aplicar el esquema. Revisa que el contenedor esté arriba y el .env sea correcto.'
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
