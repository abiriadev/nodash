import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from './app.js'
import { Db } from './db/db.js'
import { BetterSqlite3Binding } from './db/better-sqlite3.js'
import { configSchema } from './config.js'
import type { NotesListResponse } from './types/note.schema.js'

describe('Notes API E2E', () => {
	let db: Db
	let app: ReturnType<typeof createApp>

	beforeEach(async () => {
		const config = configSchema.parse({
			PORT: 8080,
			VERSION: 'dev',
		})

		// Use in-memory database for tests
		const binding = new BetterSqlite3Binding(':memory:')
		db = new Db(binding)
		await db.initSchema()
		app = createApp(config, db)
	})

	afterEach(() => {
		db.close()
	})

	it('should return 200 OK on /', async () => {
		const res = await app.request('/')

		expect(res.status).toBe(200)

		expect(await res.json()).toMatchObject({
			version: 'dev',
			status: 'operational',
		})
	})

	it('should create a new note', async () => {
		const res = await app.request('/api/notes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				title: 'Test Note',
				content: 'This is a test note content',
			}),
		})

		expect(res.status).toBe(201)

		const data = await res.json()

		expect(data).toMatchObject({
			title: 'Test Note',
			content: 'This is a test note content',
			archived: false,
		})
		expect(data).toHaveProperty('id')
		expect(data).toHaveProperty('createdAt')
		expect(data).toHaveProperty('updatedAt')
	})

	it('should list notes', async () => {
		// Create a note first
		await db.createNote({ title: 'Note 1', content: 'Content 1' })
		await db.createNote({ title: 'Note 2', content: 'Content 2' })

		const res = await app.request('/api/notes')

		expect(res.status).toBe(200)

		const body: NotesListResponse = await res.json()

		expect(body.data).toHaveLength(2)
		expect(body.total).toBe(2)
	})

	it('should get a single note', async () => {
		const note = await db.createNote({
			title: 'Note 1',
			content: 'Content 1',
		})

		const res = await app.request(`/api/notes/${note.id}`)

		expect(res.status).toBe(200)

		const data = await res.json()

		expect(data).toMatchObject({
			id: note.id,
			title: 'Note 1',
		})
	})

	it('should return 404 for non-existent note', async () => {
		const res = await app.request(
			'/api/notes/00000000-0000-0000-0000-000000000000',
		)

		expect(res.status).toBe(404)
	})

	it('should update a note', async () => {
		const note = await db.createNote({
			title: 'Old Title',
			content: 'Old Content',
		})

		const res = await app.request(`/api/notes/${note.id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				title: 'New Title',
			}),
		})

		expect(res.status).toBe(200)

		const data = await res.json()

		expect(data).toMatchObject({
			title: 'New Title',
			content: 'Old Content',
		})
	})

	it('should delete a note', async () => {
		const note = await db.createNote({
			title: 'Note to delete',
			content: '...',
		})

		const res = await app.request(`/api/notes/${note.id}`, {
			method: 'DELETE',
		})

		expect(res.status).toBe(204)

		const getRes = await app.request(`/api/notes/${note.id}`)

		expect(getRes.status).toBe(404)
	})

	it('should search notes', async () => {
		await db.createNote({ title: 'Apple', content: 'Red fruit' })
		await db.createNote({ title: 'Banana', content: 'Yellow fruit' })

		const res = await app.request('/api/notes/search?q=Apple')

		expect(res.status).toBe(200)

		const body: NotesListResponse = await res.json()

		expect(body.data).toHaveLength(1)
		expect(body.data[0]).toMatchObject({ title: 'Apple' })
	})

	it('should archive a note and filter it', async () => {
		const note = await db.createNote({
			title: 'To be archived',
			content: '...',
		})

		// Archive it
		const archiveRes = await app.request(`/api/notes/${note.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ archived: true }),
		})

		expect(archiveRes.status).toBe(200)

		// List active notes (should be empty)
		const activeRes = await app.request('/api/notes?archived=false')

		expect(activeRes.status).toBe(200)

		const activeBody: NotesListResponse = await activeRes.json()

		expect(activeBody.data).toHaveLength(0)
		expect(activeBody.total).toBe(0)

		// List archived notes (should have 1)
		const archivedRes = await app.request('/api/notes?archived=true')

		expect(archivedRes.status).toBe(200)

		const archivedBody: NotesListResponse = await archivedRes.json()

		expect(archivedBody.data).toHaveLength(1)
		expect(archivedBody.data[0]).toMatchObject({ id: note.id })
	})

	it('should exclude archived notes from search', async () => {
		const note = await db.createNote({ title: 'Secret', content: 'Hidden' })
		await db.updateNote(note.id, { archived: true })

		const res = await app.request('/api/notes/search?q=Secret')

		expect(res.status).toBe(200)

		const body: NotesListResponse = await res.json()

		expect(body.data).toHaveLength(0)
	})
})
