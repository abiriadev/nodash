import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { swaggerUI } from '@hono/swagger-ui'
import { openAPIRouteHandler } from 'hono-openapi'
import notes from './routes/notes.js'
import type { InjectedEnv } from './env.js'
import type { Db } from './db/db.js'

export function createApp(db: Db) {
	const app = new Hono<InjectedEnv>()

	// Middleware
	app.use('*', logger())
	app.use('*', cors())
	app.use('*', async (c, next) => {
		c.set('db', db)
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

	return app
}
