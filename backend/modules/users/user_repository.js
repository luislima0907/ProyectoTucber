import bcrypt from 'bcrypt'

export default class UserRepository{

    constructor(db){
        this.db = db
    }


    async findAll(){
        const {rows:users} = await db.query("SELECT * FROM USERS")
    }

    async findByCorreo(correo){
        
        return (await this.db.query("SELECT * FROM usuarios where correo = $1", [correo])).rows

    }


    async create(user){
        console.log("entre al repository de user")
        const query = `INSERT INTO usuarios (nombre, correo, contrasenaHash, telefono, rol) VALUES ($1, $2, $3, $4, $5)
        `
        const passwordHash = await bcrypt.hash(user.contrasena, 10)
        const values = [user.nombre, user.correo, passwordHash, user.telefono, user.rol]
      

        
        const result = await this.db.query(query, values)
        console.log(result.rowCount === 1)
        if (result.rowCount === 1){ 
            return true
        }

        return false
    }   
}