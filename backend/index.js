import express from 'express'
import cors from 'cors'

const app = express()
const port = 3000

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}))
app.use(express.json())

app.get("/health", (req, res) => {
    return res.send("status:alive")
})

app.get("/api/auth/me", (req, res) => {
    return res.status(200).json({ user: null })
})

app.post("/api/auth/register", (req, res) => {
    const { nombre, correo, contrasena, rol } = req.body
    return res.status(201).json({
        message: "Usuario registrado con éxito",
        user: { id: "usr_123", nombre, correo, rol, isVerified: false }
    })
})

app.post("/api/auth/login", (req, res) => {
    const { correo } = req.body
    return res.status(200).json({
        message: "Inicio de sesión exitoso",
        user: { id: "usr_123", nombre: "Usuario Tucber", correo, rol: "cliente", isVerified: false }
    })
})

app.post("/api/auth/logout", (req, res) => {
    return res.status(200).json({ message: "Sesión cerrada correctamente" })
})

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`)
})