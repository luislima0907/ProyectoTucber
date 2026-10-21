import 'dotenv/config'
import { pool } from './infrastructure/db/db.js'
import { runMigrations } from './infrastructure/db/migrations/setup.js'
import { createApplication } from './app.js'

await runMigrations(pool)
const { server, searchEngine } = createApplication(pool)
server.listen(process.env.PORT || 3001, () => console.log('TUCBER está listo.'))

function shutdown() {
    searchEngine.close()
    server.close(() => pool.end())
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
