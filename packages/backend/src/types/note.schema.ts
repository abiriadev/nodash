import { z } from 'zod'

// Domain types (application layer)
export interface Note {
	id: string
	title: string
	content: string
	createdAt: Date
	updatedAt: Date
	archived: boolean
}

// Database types (raw SQLite)
export interface NoteRow {
	id: string
	title: string
	content: string
	created_at: number
	updated_at: number
	archived: number // SQLite stores boolean as 0/1
}

// Request validation schemas
export const createNoteSchema = z.object({
	title: z.string().min(1).max(255),
	content: z.string(),
})

export type CreateNoteRequest = z.infer<typeof createNoteSchema>

export const updateNoteSchema = z
	.object({
		title: z.string().min(1).max(255).optional(),
		content: z.string().optional(),
		archived: z.boolean().optional(),
	})
	.refine(
		(data: any) =>
			data.title !== undefined ||
			data.content !== undefined ||
			data.archived !== undefined,
		{
			message:
				'At least one field (title, content, or archived) must be provided',
		},
	)

export type UpdateNoteRequest = z.infer<typeof updateNoteSchema>

export const noteIdSchema = z.object({
	id: z.uuid(),
})

export const searchQuerySchema = z.object({
	q: z.string().min(1),
	limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
	offset: z.coerce.number().int().min(0).default(0).optional(),
})

// Common query schemas
export const paginationQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(1000).default(100).optional(),
	offset: z.coerce.number().int().min(0).default(0).optional(),
})

export const sortQuerySchema = z.object({
	sortBy: z
		.enum(['createdAt', 'updatedAt', 'title'])
		.default('updatedAt')
		.optional(),
	sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
})

export const listNotesQuerySchema = paginationQuerySchema
	.extend(sortQuerySchema)
	.extend({
		archived: z.coerce
			.string()
			.transform((v: string) => v === 'true')
			.default(false)
			.optional(),
	})

// Response validation schemas
export const noteResponseSchema = z.object({
	id: z.uuid(),
	title: z.string(),
	content: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
	archived: z.boolean(),
})

export type NoteResponse = z.infer<typeof noteResponseSchema>

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(
	itemSchema: T,
) =>
	z.object({
		data: z.array(itemSchema),
		total: z.number(),
		limit: z.number(),
		offset: z.number(),
	})

export const notesListResponseSchema =
	paginatedResponseSchema(noteResponseSchema)

export interface ErrorResponse {
	error: string
	message: string
	statusCode: number
}
