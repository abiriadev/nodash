// Common interface for database bindings
export interface DbBinding {
	// Retrieve multiple rows
	all<T>(sql: string, ...params: unknown[]): Promise<T[]>

	// Retrieve a single row
	get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>

	// Execute a statement and return the number of changes
	run(sql: string, ...params: unknown[]): Promise<{ changes: number }>

	// Execute a statement without returning a result
	exec(sql: string): Promise<void>

	// Execute a transaction
	transaction<T>(fn: () => T | Promise<T>): Promise<T>

	// Free resources (close connection, free memory, etc.)
	close(): Promise<void>
}
