import { serve } from '@hono/node-server'
import { Db } from './db/db.js'
import { BetterSqlite3Binding } from './db/better-sqlite3.js'
import { createApp } from './app.js'
import { configSchema } from './config.js'
import { env } from 'node:process'

const config = configSchema.parse(env)

// Initialize database
// Uses BetterSqlite3Binding for local development
const db = new Db(new BetterSqlite3Binding('notes.db'))

// Initialize schema (in a real production app, this might be a migration)
// For local development, we can do it on startup
await db.initSchema()

const app = createApp(config, db)

console.log(`Server is running on port ${config.PORT}`)

serve({
	fetch: app.fetch,
	port: config.PORT,
})

export default app
