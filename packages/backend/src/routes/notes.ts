import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import type { NoteDatabase } from '../db/db.js'
import {
	createNoteSchema,
	updateNoteSchema,
	noteIdSchema,
	searchQuerySchema,
	listNotesQuerySchema,
	noteResponseSchema,
	notesListResponseSchema,
} from '../types/note.schema.js'

const notes = new Hono<{ Variables: { db: NoteDatabase } }>()

// List all notes
notes.get(
	'/',
	describeRoute({
		description: 'List all notes with pagination and sorting',
		responses: {
			200: {
				description: 'List of notes',
				content: {
					'application/json': {
						schema: resolver(notesListResponseSchema),
					},
				},
			},
		},
	}),
	validator('query', listNotesQuerySchema),
	c => {
		const query = c.req.valid('query')
		const result = c.get('db').getNotes({
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
	},
)

// Search notes
notes.get(
	'/search',
	describeRoute({
		description: 'Search notes using full-text search',
		responses: {
			200: {
				description: 'Search results',
				content: {
					'application/json': {
						schema: resolver(notesListResponseSchema),
					},
				},
			},
		},
	}),
	validator('query', searchQuerySchema),
	c => {
		const query = c.req.valid('query')
		const result = c
			.get('db')
			.searchNotes(query.q, query.limit, query.offset)

		return c.json({
			...result,
			limit: query.limit,
			offset: query.offset,
			query: query.q,
		})
	},
)

// Get single note
notes.get(
	'/:id',
	describeRoute({
		description: 'Get a single note by ID',
		responses: {
			200: {
				description: 'The requested note',
				content: {
					'application/json': {
						schema: resolver(noteResponseSchema),
					},
				},
			},
			404: {
				description: 'Note not found',
			},
		},
	}),
	validator('param', noteIdSchema),
	c => {
		const { id } = c.req.valid('param')
		const note = c.get('db').getNoteById(id)

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

// Create note
notes.post(
	'/',
	describeRoute({
		description: 'Create a new note',
		responses: {
			201: {
				description: 'Created note',
				content: {
					'application/json': {
						schema: resolver(noteResponseSchema),
					},
				},
			},
		},
	}),
	validator('json', createNoteSchema),
	c => {
		const data = c.req.valid('json')
		const note = c.get('db').createNote(data)
		return c.json(note, 201)
	},
)

// Update note
notes.put(
	'/:id',
	describeRoute({
		description: 'Update an existing note',
		responses: {
			200: {
				description: 'Updated note',
				content: {
					'application/json': {
						schema: resolver(noteResponseSchema),
					},
				},
			},
			404: {
				description: 'Note not found',
			},
		},
	}),
	validator('param', noteIdSchema),
	validator('json', updateNoteSchema),
	c => {
		const { id } = c.req.valid('param')
		const data = c.req.valid('json')
		const note = c.get('db').updateNote(id, data)

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
notes.delete(
	'/:id',
	describeRoute({
		description: 'Delete a note by ID',
		responses: {
			204: {
				description: 'Note deleted successfully',
			},
			404: {
				description: 'Note not found',
			},
		},
	}),
	validator('param', noteIdSchema),
	c => {
		const { id } = c.req.valid('param')
		const success = c.get('db').deleteNote(id)

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
	},
)

export default notes
