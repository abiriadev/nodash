import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { swaggerUI } from '@hono/swagger-ui'
import { serve } from '@hono/node-server'
import { openAPIRouteHandler } from 'hono-openapi'
import { NoteDatabase } from './db/db.js'
import notes from './routes/notes.js'

type Variables = {
	db: NoteDatabase
}

const app = new Hono<{ Variables: Variables }>()

// Initialize database
const dbInstance = new NoteDatabase()

// Middleware
app.use('*', logger())
app.use('*', cors())
app.use('*', async (c, next) => {
	c.set('db', dbInstance)
	await next()
})

// Routes
app.route('/api/notes', notes)

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// OpenAPI Spec
app.get(
	'/openapi.json',
	openAPIRouteHandler(app, {
		documentation: {
			info: {
				title: 'nodash API',
				version: '1.0.0',
				description: 'API for managing notes with FTS5 search',
			},
			servers: [
				{
					url: 'http://localhost:8080',
					description: 'Development Server',
				},
			],
		},
	}),
)

app.get('/', c => c.text('nodash API is running'))

const port = 8080
console.log(`Server is running on port ${port}`)

serve({
	fetch: app.fetch,
	port,
})

export default app
