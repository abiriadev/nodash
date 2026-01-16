import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { swaggerUI } from '@hono/swagger-ui'
import { openAPIRouteHandler } from 'hono-openapi'
import notes from './routes/notes.js'
import type { InjectedEnv } from './env.js'
import type { Db } from './db/db.js'
import type { Config } from './config.js'

export function createApp(config: Config, db: Db) {
	const app = new Hono<InjectedEnv>()

	// Middleware
	app.use('*', logger())
	app.use('*', cors())
	app.use('*', async (c, next) => {
		c.set('db', db)
		c.set('config', config)
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
					version: config.VERSION,
					description: 'API for managing notes with FTS5 search',
				},
				servers: [
					{
						url: `http://localhost:${config.PORT}`,
						description: 'Development Server',
					},
				],
			},
		}),
	)

	app.get('/', c =>
		c.json({
			version: config.VERSION,
			status: 'operational',
		}),
	)

	return app
}
