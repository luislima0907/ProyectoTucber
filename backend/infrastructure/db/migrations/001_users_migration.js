export async function runUsers(db){
    await db.query(`
    CREATE TABLE IF NOT EXISTS usuarios(
        idUsuario SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        correo TEXT UNIQUE NOT NULL,
        contrasenaHash TEXT NOT NULL,
        telefono TEXT,
        rol TEXT NOT NULL CHECK (rol IN ('cliente', 'conductor')),
       createAt TIMESTAMPTZ NOT NULL DEFAULT now()
     );
        
        `)
}


export async function dropUsers(db){

    await db.query("DROP TABLE usuarios")
}