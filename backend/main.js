import express from 'express'
import { pool } from './infrastructure/db/db.js'
import { modules } from './infrastructure/registry.js'




function setup(){
    const app = express()

    for (let i = 0; i < modules.length; i++){
        new modules[i].controller(app, new modules[i].service(new modules[i].repository(pool)))

    }

    app.listen("3000", () =>{
        console.log("the server is alive")
    })
}


setup()