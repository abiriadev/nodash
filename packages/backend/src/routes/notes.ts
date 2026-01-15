import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as db from '../db/db.js'
import {
	createNoteSchema,
	updateNoteSchema,
	noteIdSchema,
	searchQuerySchema,
	listNotesQuerySchema,
} from '../types/note.schema.js'

const notes = new Hono()

// List all notes
notes.get('/', zValidator('query', listNotesQuerySchema), (c: any) => {
	const query = c.req.valid('query')
	const result = db.getNotes({
		archived: query.archived,
		limit: query.limit,
		offset: query.offset,
		sortBy: query.sortBy,
		sortOrder: query.sortOrder,
	})

	return c.json({
		...result,
		limit: query.limit,
		offset: query.offset,
	})
})

// Search notes
notes.get('/search', zValidator('query', searchQuerySchema), (c: any) => {
	const query = c.req.valid('query')
	const result = db.searchNotes(query.q, query.limit, query.offset)

	return c.json({
		...result,
		limit: query.limit,
		offset: query.offset,
		query: query.q,
	})
})

// Get single note
notes.get('/:id', zValidator('param', noteIdSchema), (c: any) => {
	const { id } = c.req.valid('param')
	const note = db.getNoteById(id)

	if (!note) {
		return c.json(
			{
				error: 'NotFound',
				message: `Note with id '${id}' not found`,
				statusCode: 404,
			},
			404,
		)
	}

	return c.json(note)
})

// Create note
notes.post('/', zValidator('json', createNoteSchema), (c: any) => {
	const data = c.req.valid('json')
	const note = db.createNote(data)
	return c.json(note, 201)
})

// Update note
notes.put(
	'/:id',
	zValidator('param', noteIdSchema),
	zValidator('json', updateNoteSchema),
	(c: any) => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		const note = db.updateNote(id, data)

		if (!note) {
			return c.json(
				{
					error: 'NotFound',
					message: `Note with id '${id}' not found`,
					statusCode: 404,
				},
				404,
			)
		}

		return c.json(note)
	},
)

// Delete note
notes.delete('/:id', zValidator('param', noteIdSchema), (c: any) => {
	const { id } = c.req.valid('param')
	const success = db.deleteNote(id)

	if (!success) {
		return c.json(
			{
				error: 'NotFound',
				message: `Note with id '${id}' not found`,
				statusCode: 404,
			},
			404,
		)
	}

	return c.body(null, 204)
})

export default notes
