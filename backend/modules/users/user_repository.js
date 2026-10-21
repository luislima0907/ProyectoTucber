export default class UserRepository {
    constructor(db) {
        this.db = db
    }

    async findByEmail(email) {
        const { rows } = await this.db.query('SELECT * FROM usuarios WHERE correo = $1', [email])
        return rows[0]
    }

    async findById(id) {
        const { rows } = await this.db.query('SELECT idUsuario AS id, nombre, correo, rol FROM usuarios WHERE idUsuario = $1', [id])
        return rows[0]
    }

    async create(user, passwordHash) {
        const { rows } = await this.db.query(`
            INSERT INTO usuarios(nombre, correo, contrasenaHash, telefono, rol)
            VALUES ($1, $2, $3, $4, $5) RETURNING idUsuario AS id, nombre, correo, rol
        `, [user.nombre, user.correo, passwordHash, user.telefono || null, user.rol])
        return rows[0]
    }
}
