import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { modules } from './infrastructure/registry.js'
import { authenticateToken } from './middlewares/jwt_midleware.js'
import { handleError } from './common/http_error.js'
import SearchEngine from './modules/search/search_engine.js'
import SearchRepository from './modules/search/search_repository.js'

export function createApplication(pool) {
    const app = express()
    const server = createServer(app)
    const origins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')
    const publicRouter = express.Router()
    app.use(cors({ origin: origins, credentials: true }))
    app.use(express.json({ limit: '32kb' }))
    app.get('/health', (req, res) => res.json({ status: 'ok' }))
    app.use('/auth', publicRouter)
    app.use(authenticateToken)
    const services = new Map()
    for (const module of modules) {
        const dependency = module.repository
            ? new module.repository(pool)
            : process.env.GOOGLE_MAPS_API_KEY
        const service = new module.service(dependency)
        services.set(module.service.name, service)
        new module.controller(module.public ? publicRouter : app, service)
    }
    const searchEngine = new SearchEngine(
        server,
        new SearchRepository(pool),
        services.get('SolicitudService'),
        origins,
    )
    app.locals.searchEngine = searchEngine
    app.use(handleError)
    server.on('close', () => searchEngine.close())
    return { app, server, searchEngine }
}
