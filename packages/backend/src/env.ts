import type { Env } from 'hono'
import type { Db } from './db/db'

export interface InjectedEnv extends Env {
	Variables: {
		db: Db
	}
}
