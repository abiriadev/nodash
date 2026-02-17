import { createApp } from './app.js'
import { configSchema } from './config.js'
import { Db } from './db/db.js'
import { D1Binding } from './db/d1.js'

export default {
	async fetch(request, env, ctx) {
		// injection setup
		const config = configSchema.parse(env)
		const db = new Db(new D1Binding(env.DB))
		await db.initSchema()

		// create app and handle request
		const app = createApp(config, db)
		return app.fetch(request, env, ctx)
	},
} satisfies ExportedHandler<Env>
