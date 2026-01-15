import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { swaggerUI } from '@hono/swagger-ui'
import { serve } from '@hono/node-server'
import { initDb } from './db/db.js'
import notes from './routes/notes.js'

const app = new Hono()

// Initialize database
initDb()

// Middleware
app.use('*', logger())
app.use('*', cors())

// Routes
app.route('/api/notes', notes)

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// OpenAPI Spec (Minimal for now, can be extended with @hono/zod-openapi)
app.get('/openapi.json', (c: any) => {
	return c.json({
		openapi: '3.0.0',
		info: {
			title: 'nodash API',
			version: '1.0.0',
		},
		paths: {}, // Routes are defined in notes.ts
	})
})

app.get('/', (c: any) => c.text('nodash API is running'))

const port = 8080
console.log(`Server is running on port ${port}`)

serve({
	fetch: app.fetch,
	port,
})

export default app
