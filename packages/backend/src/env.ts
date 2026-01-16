import type { Env } from 'hono'
import type { Db } from './db/db'
import type { Config } from './config'

export interface InjectedEnv extends Env {
	Variables: {
		db: Db
		config: Config
	}
}
