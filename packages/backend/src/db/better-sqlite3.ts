import Database from 'better-sqlite3'
import type { DbBinding } from './interface.js'

export class BetterSqlite3Binding implements DbBinding {
	private db: Database.Database

	constructor(dbPath: string) {
		this.db = new Database(dbPath)
		this.db.pragma('journal_mode = WAL')
	}

	async all<T>(sql: string, ...params: any[]): Promise<T[]> {
		return this.db.prepare(sql).all(...params) as T[]
	}

	async get<T>(sql: string, ...params: any[]): Promise<T | undefined> {
		return this.db.prepare(sql).get(...params) as T | undefined
	}

	async run(sql: string, ...params: any[]): Promise<{ changes: number }> {
		const result = this.db.prepare(sql).run(...params)
		return { changes: result.changes }
	}

	async exec(sql: string): Promise<void> {
		this.db.exec(sql)
	}

	async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
		// better-sqlite3 transactions are synchronous
		// if fn is async, this won't work as expected with better-sqlite3's .transaction()
		// but we can just use the sync one if fn is sync
		const txn = this.db.transaction(fn as any)
		return txn() as T
	}

	async close() {
		this.db.close()
	}
}
