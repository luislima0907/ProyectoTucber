import express from 'express'
import { pool } from './infrastructure/db/db.js'
import { modules } from './infrastructure/registry.js'
import { runMigrations } from './infrastructure/db/migrations/setup.js'
import { authenticateToken } from './middlewares/jwt_midleware.js'



async function setup(){
    await runMigrations(pool)
    const app = express()
    const publicRouter = express.Router()
    app.use(express.json())
    app.use("/public", publicRouter)

    app.use(authenticateToken)
    

    for (let i = 0; i < modules.length; i++){
        new modules[i].controller(modules[i].public ? publicRouter : app, new modules[i].service(new modules[i].repository(pool)))

    }
    app.listen("3001", () =>{
        console.log("the server is alive")
      
    })
}



 await setup()
