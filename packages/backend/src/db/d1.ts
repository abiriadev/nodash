import type { DbBinding } from './interface.js'

/**
 * Minimal interface for D1 database object to avoid hard dependency
 * on @cloudflare/workers-types in the backend package if not installed.
 */
interface D1Database {
	prepare(sql: string): D1PreparedStatement
	exec(sql: string): Promise<any>
}

interface D1PreparedStatement {
	bind(...params: any[]): D1PreparedStatement
	all<T>(): Promise<{ results: T[] }>
	first<T>(): Promise<T | null>
	run(): Promise<{ meta: { changes?: number } }>
}

export class D1Binding implements DbBinding {
	constructor(private db: D1Database) {}

	async all<T>(sql: string, ...params: any[]): Promise<T[]> {
		const { results } = await this.db
			.prepare(sql)
			.bind(...params)
			.all<T>()
		return results ?? []
	}

	async get<T>(sql: string, ...params: any[]): Promise<T | undefined> {
		const result = await this.db
			.prepare(sql)
			.bind(...params)
			.first<T>()
		return result ?? undefined
	}

	async run(sql: string, ...params: any[]): Promise<{ changes: number }> {
		const result = await this.db
			.prepare(sql)
			.bind(...params)
			.run()
		return { changes: result.meta.changes ?? 0 }
	}

	async exec(sql: string): Promise<void> {
		await this.db.exec(sql)
	}

	async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
		// D1 batching is the only way to do transactions in D1.
		// Interactive transactions are not supported by the D1 HTTP/JS API.
		// For now, we just execute the function as-is.
		// If real transactions are needed, we may need to extend the interface
		// to support Batching which both BetterSqlite3 and D1 support.
		return await fn()
	}

	async close() {
		// D1 doesn't have a close method
		// do nothing.
	}
}
