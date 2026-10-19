import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool } from './infrastructure/db/db.js'
import { modules } from './infrastructure/registry.js'
import { runMigrations } from './infrastructure/db/migrations/setup.js'
import { authenticateToken } from './middlewares/jwt_midleware.js'



async function setup(){
    await runMigrations(pool)
    const app = express()
    const publicRouter = express.Router()
    app.use(express.json())
    app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
    app.use("/auth", publicRouter)

    app.use(authenticateToken)
    

    for (let i = 0; i < modules.length; i++){
        const module = modules[i]
        const serviceDependency = module.repository
            ? new module.repository(pool)
            : process.env.GOOGLE_MAPS_API_KEY
        new module.controller(
            module.public ? publicRouter : app,
            new module.service(serviceDependency)
        )

    }
    app.listen("3001", () =>{
        console.log("the server is alive")
      
    })
}



 await setup()
